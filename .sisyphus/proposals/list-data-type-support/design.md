# Design: List Data Type Support

## Architecture Overview

List support fits cleanly into the existing `readInstance() -> vmPropsCache -> setViewModelProp() -> updateNested()` pipeline. The key insight: Rive Lists are structurally identical to nested `viewModel` properties — they are containers of `ViewModelInstance` children. We represent them with the same `children` field in `ViewModelProperty`, using two new synthetic node types: `"list"` and `"listItem"`.

> **Metis Flag — Critical distinctions vs `viewModel`:**  
> - `viewModel` has **static** children (shape never changes at runtime)  
> - `list` has **dynamic** children (add/remove changes count and indices)  
> - This means `updateNested()` **cannot handle structural mutations** — a separate `performListAction()` function is mandatory  
> - `setViewModelProp()` handles **leaf value edits only** within existing list items  

## Conflict Resolution Log

| Topic | Oracle said | Metis said | Resolution |
|---|---|---|---|
| Empty list "Add" capability | Disable button with tooltip | Potential blocker — investigate runtime API | **Metis wins** — investigate first; if runtime exposes type, enable; else disable |
| Preset serialization | Skip silently on path mismatch | Defer entirely — complexity mismatch | **Metis wins** — explicitly out of scope v1 |
| Reorder in v1 | Defer to v1.1 | Defer to v2 | **Metis wins** — swap buttons are v1.1, drag-and-drop v2 |
| Path format (`todos[0]` vs `todos.0`) | Bracket notation `todos[0]` | Bracket notation `todos[0]` | **Agreed** |
| List state in `children` vs `listItems` | Reuse `children` | Reuse `children` with synthetic nodes | **Agreed** |

---

## Data Model

### `ViewModelProperty` changes

```ts
export interface ViewModelProperty {
  name: string;
  type: string;            // new values: "list", "listItem"
  path: string;
  value?: string | number | boolean;
  enumValues?: string[];
  imageUrl?: string;
  children?: ViewModelProperty[];   // list nodes: listItem children; listItem nodes: scalar prop children
  listItemType?: string;            // NEW: ViewModel type name for creating new items (e.g. "TodoItem")
}
```

### State tree shape for a list property

```
ViewModelProperty (type="list", path="todos", listItemType="TodoItem")
  children:
    ViewModelProperty (type="listItem", path="todos[0]", name="Item 0")
      children:
        ViewModelProperty (type="string", path="todos[0].title", value="Buy milk")
        ViewModelProperty (type="boolean", path="todos[0].done", value=false)
    ViewModelProperty (type="listItem", path="todos[1]", name="Item 1")
      children:
        ViewModelProperty (type="string", path="todos[1].title", value="Write code")
        ViewModelProperty (type="boolean", path="todos[1].done", value=true)
```

---

## Path Convention

**Bracket notation**: `todos[0].title`

- Unambiguous (never collides with a property literally named "0")
- Human-readable and conventional
- Construction in `readInstance()`:
  ```ts
  const itemPath = `${listPath}[${i}]`;
  const propPath = `${itemPath}.${childPropName}`;
  ```

---

## Cache Strategy

All cached in the **same `vmPropsCache` map** (`useRef<Map<string, Record<string, unknown>>>`):

| Cache key | Value | Used for |
|---|---|---|
| `"todos"` | `ViewModelInstanceList` | `.addInstance()`, `.removeInstanceAt()`, `.swap()`, `.length` |
| `"todos[0]"` | `ViewModelInstance` from `instanceAt(0)` | Reading item's scalar props during extraction |
| `"todos[0].title"` | Scalar prop object | Direct `.value` mutation via `setViewModelProp()` |

**Important**: `instanceAt(i)` creates a new WASM wrapper on every call. Only call it inside `extractLiveData()`. Never call it during rendering.

---

## `readInstance()` Changes

```ts
} else if (p.type === "list") {
  const listProp = inst.list(p.name);
  if (listProp) {
    vmPropsCache.current.set(path, listProp);

    // Discover item type from first item, or leave as ""
    const firstItem = (listProp.length > 0) ? listProp.instanceAt(0) : null;
    entry.listItemType = (firstItem as any)?.viewModelName ?? "";

    const len = typeof listProp.length === "function"
      ? (listProp.length as () => number)()
      : listProp.length;

    entry.children = [];
    for (let i = 0; i < len; i++) {
      const itemInst = listProp.instanceAt(i);
      if (!itemInst) continue;
      const itemPath = `${path}[${i}]`;
      vmPropsCache.current.set(itemPath, itemInst);
      const itemEntry: ViewModelProperty = {
        name: `Item ${i}`,
        type: "listItem",
        path: itemPath,
        children: readInstance(itemInst as VmInst, itemPath),
      };
      entry.children.push(itemEntry);
    }
  }
}
```

---

## New Callback: `performListAction()`

Structural mutations cannot use `setViewModelProp()` (which mutates leaf values). A separate callback handles add/remove/swap:

```ts
type ListAction =
  | { action: "add"; listPath: string }
  | { action: "remove"; listPath: string; index: number }
  | { action: "swap"; listPath: string; indexA: number; indexB: number };

const performListAction = useCallback((action: ListAction) => {
  const listProp = vmPropsCache.current.get(action.listPath) as ViewModelInstanceList;
  if (!listProp) return;

  try {
    if (action.action === "remove") {
      listProp.removeInstanceAt(action.index);
    } else if (action.action === "swap") {
      listProp.swap(action.indexA, action.indexB);
    } else if (action.action === "add") {
      const rive = riveRef.current as any;
      // Get the item ViewModel type from the list node's listItemType
      const listNode = findListNode(state.viewModelProps, action.listPath);
      const typeName = listNode?.listItemType;
      if (!typeName) return; // Cannot add without knowing the type
      const vmDef = rive.viewModelByName?.(typeName);
      if (!vmDef) return;
      const newInst = vmDef.defaultInstance?.();
      if (!newInst) return;
      listProp.addInstance(newInst);
    }
  } catch {}

  // After any structural mutation: clear stale cache + full re-extract
  for (const key of vmPropsCache.current.keys()) {
    if (key !== action.listPath && key.startsWith(`${action.listPath}[`)) {
      vmPropsCache.current.delete(key);
    }
  }
  // 50ms delay gives the Rive WASM runtime time to commit the structural change.
  // If extractLiveData reads stale length (e.g., list.length === pre-mutation value),
  // retry once at 150ms. This is a known fragility for async WASM state commits.
  setTimeout(() => {
    extractLiveData();
    // Optional retry guard: if list.length still doesn't match, re-extract after 150ms
    // const listPropCheck = vmPropsCache.current.get(action.listPath) as any;
    // if (listPropCheck && /* expected length doesn't match */) setTimeout(extractLiveData, 150);
  }, 50);
}, [state.viewModelProps, extractLiveData]);
```

---

## `updateNested()` — No Changes Needed

`updateNested()` already recurses through `children`. Since list items are represented as `children`, scalar edits on list item properties propagate automatically through the existing code path.

---

## Component Architecture

### `controls/ListControl.tsx` (new file)

Renders the list-level chrome:
- List header: `<TypeBadge type="list" />` + name + `(N items)` count badge
- Expand/collapse toggle (same as `viewModel` nodes)
- When expanded: renders each listItem child via `ViewModelNode`
- Add Item button at bottom (disabled if `listItemType` is empty)

```tsx
interface ListControlProps {
  prop: ViewModelProperty;
  onSetProp: (path: string, type: string, value: ...) => void;
  onListAction: (action: ListAction) => void;
}
```

### `ViewModelPanel.tsx` additions

```tsx
case "list":
  return (
    <ListControl
      prop={prop}
      onSetProp={onSetProp}
      onListAction={onListAction}
    />
  );

case "listItem":
  return (
    <div className="vm-nested vm-list-item" key={prop.path}>
      <button className="vm-toggle" onClick={() => setExpanded(v => !v)} type="button">
        <TypeBadge type="listItem" />
        <span>{prop.name}</span>
        <div className="vm-list-item-actions">
          <button onClick={() => onListAction({ action: "swap", listPath, indexA: index - 1, indexB: index })} disabled={index === 0}>↑</button>
          <button onClick={() => onListAction({ action: "swap", listPath, indexA: index, indexB: index + 1 })} disabled={isLast}>↓</button>
          <button onClick={() => onListAction({ action: "remove", listPath, index })} className="vm-remove-btn">✕</button>
        </div>
        <span className="vm-toggle-icon">{/* chevron */}</span>
      </button>
      {expanded && prop.children?.map(child => (
        <ViewModelNode key={child.path} prop={child} onSetProp={onSetProp} onListAction={onListAction} />
      ))}
    </div>
  );
```

> Note: `listPath` and `index` are derived from `prop.path` by parsing `todos[0]` → listPath=`todos`, index=`0`.

---

## TypeBadge Colors

```ts
const BADGE_COLORS: Record<string, string> = {
  // ... existing colors
  list: "#7c3aed",       // deep purple — distinct from viewModel
  listItem: "#a78bfa",   // light purple — consistent with list family
};
```

---

## Props Interface Changes (ViewModelPanel)

`ViewModelNode` needs to receive `onListAction`. The `ViewModelPanel` component needs to accept and thread through this callback:

```ts
interface Props {
  properties: ViewModelProperty[];
  onSetProp: (...) => void;
  onListAction: (action: ListAction) => void;  // NEW
}
```

`App.tsx` wires `performListAction` from `useRivePlayground` to `ViewModelPanel`.

---

## Mutation Strategy

| Mutation type | Mechanism | Re-render trigger |
|---|---|---|
| Scalar edit within list item | `setViewModelProp(path, type, value)` → `cached.value = val` → `updateNested()` | Local state update (fast, no flicker) |
| Add item | `listProp.addInstance(newInst)` → clear cache → `extractLiveData()` | Full re-extract (structural change) |
| Remove item | `listProp.removeInstanceAt(i)` → clear cache → `extractLiveData()` | Full re-extract (indices shift) |
| Swap items | `listProp.swap(a, b)` → clear cache → `extractLiveData()` | Full re-extract (index mapping changes) |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Empty list | Show "No items" text + "Add Item" button (if listItemType known) |
| Empty list, type unknown | Show "No items" text, Add button disabled with tooltip "Item type unknown" |
| `instanceAt(i)` returns null | `if (!itemInst) continue` — skip the item |
| `listProp.length` is a function | `typeof len === "function" ? len() : len` |
| Preset apply with fewer list items | `vmPropsCache.current.get(path)` returns undefined → skip silently |
| Nested lists (list-of-lists) | Recursion in `readInstance()` handles naturally — `"listItem"` children include any sub-lists |

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `viewModelByName()` not available on `riveRef.current` | Medium | Wrap in try/catch; disable Add if API call fails |
| `defaultInstance()` creates a blank item (all defaults) | Low | Expected behavior for a Playground; user can edit values |
| `length` access on null listProp | Low | Guard with `if (listProp)` before accessing |
| Stale `instanceAt()` wrappers in cache after structural mutation | Medium | Clear bracket-keyed cache entries before re-extract |
| `setTimeout(extractLiveData, 50)` may be too short | Low-Medium | WASM state commits are typically synchronous, but if stale data is read, increase to 150ms or add retry logic (see `performListAction` code) |
| `(firstItem as any)?.viewModelName` cast | Low | Consistent with established pattern in `useRivePlayground.ts` (`riveAny = rive as unknown as Record<string, unknown>`); necessary for WASM interop |
| `VmInst` type missing `list()` method | Low | Use existing `inst[typeKey]` dynamic dispatch pattern (same as all other types); no type surgery needed |
