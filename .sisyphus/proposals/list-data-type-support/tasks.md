# Tasks: List Data Type Support

## Phase 1 — Read-Only Display (De-risks data extraction)
> **Goal**: Lists display in the ViewModel panel with all nested properties visible. No editing yet.

- [ ] **T1.1** Add `listItemType?: string` field to `ViewModelProperty` interface in `types.ts`
- [ ] **T1.2** Add `"list"` and `"listItem"` color entries to `TypeBadge.tsx` (`list: "#7c3aed"`, `listItem: "#a78bfa"`)
- [ ] **T1.3** Add `"list"` case to `readInstance()` in `useRivePlayground.ts`:
  - Call `inst.list(p.name)` to get `ViewModelInstanceList`
  - Cache it at `vmPropsCache.set(path, listProp)`
  - Read `length` (guard for function vs property: `typeof len === "function" ? len() : len`)
  - For each index `i`, call `instanceAt(i)` — guard for null
  - Cache instance at `vmPropsCache.set(`${path}[${i}]`, itemInst)`
  - Recurse `readInstance(itemInst, `${path}[${i}]`)` for item properties
  - Set `entry.children` to array of `"listItem"` synthetic nodes
  - Discover `listItemType` from `instanceAt(0)?.viewModelName` if list is non-empty
- [ ] **T1.4** Create `controls/ListControl.tsx`:
  - Props: `prop: ViewModelProperty`, `onSetProp`, `onListAction`
  - Collapsed accordion with `<TypeBadge type="list" />` + name + `(N items)` count badge
  - Expand/collapse toggle
  - When expanded: render each `listItem` child via `ViewModelNode`
  - Empty state: "No items" text
- [ ] **T1.5** Add `case "list"` and `case "listItem"` to `ViewModelNode` switch in `ViewModelPanel.tsx`:
  - `"list"` → delegates to `ListControl`
  - `"listItem"` → accordion header (TypeBadge + "Item N" label) + renders children props
- [ ] **T1.6** Thread `onListAction` prop through `ViewModelPanel` → `ViewModelNode` → `ListControl` **AND** update `Sidebar.tsx` interface to pass `onListAction` through (chain: `App.tsx → Sidebar.tsx → ViewModelPanel`)
- [ ] **T1.7** Verify: load a `.riv` file with a list property — items render correctly with all nested scalar properties

**Acceptance**: Lists with ≥1 item display as expandable accordions. Nested string/number/boolean/color properties are visible inside each item.

---

## Phase 2 — Inline Editing of Existing List Items
> **Goal**: Can edit scalar properties inside list items. Values reflect immediately in the Rive canvas.

- [ ] **T2.1** Verify `setViewModelProp()` works for bracket-indexed paths (e.g., `"todos[0].title"`):
  - `vmPropsCache.current.get("todos[0].title")` must return the cached scalar prop
  - If yes — no changes needed (existing path matching already handles it)
  - If no — check that cache keys are being set correctly in T1.3
- [ ] **T2.2** Verify `updateNested()` walks `listItem` children (it already recurses `p.children` — should work automatically)
- [ ] **T2.3** Wire `onSetProp` callbacks for scalar props within `"listItem"` nodes in `ViewModelNode`
- [ ] **T2.4** Manual test: edit `string`, `number`, `boolean`, `color` properties within a list item — canvas updates immediately

**Acceptance**: Changing a property value inside a list item is reflected in the Rive canvas with no errors.

---

## Phase 3 — Structural Mutations (Add / Remove)
> **Goal**: Can add new items to a list and remove existing items.

- [ ] **T3.1** Define `ListAction` type in `types.ts`:
  ```ts
  export type ListAction =
    | { action: "add"; listPath: string }
    | { action: "remove"; listPath: string; index: number }
    | { action: "swap"; listPath: string; indexA: number; indexB: number };
  ```
- [ ] **T3.2** Implement `performListAction(action: ListAction)` callback in `useRivePlayground.ts`:
  - Lookup `ViewModelInstanceList` from `vmPropsCache`
  - For `"remove"`: call `listProp.removeInstanceAt(index)`
  - For `"add"`: discover `typeName` from list node's `listItemType`; call `rive.viewModelByName(typeName).defaultInstance()` then `listProp.addInstance(newInst)`
  - After any mutation: clear all cache keys starting with `${listPath}[` then call `setTimeout(extractLiveData, 50)`
  - Wrap entire body in try/catch — never throw to UI
- [ ] **T3.3** Investigate empty list type discovery:
  - Check if `ViewModelInstanceList` exposes a `viewModelType` or `itemType` property on the Rive runtime
  - If available: set `listItemType` from it during T1.3 (not just from `instanceAt(0)`)
  - If not available and list is empty: disable Add button with tooltip "Add unavailable — empty list with unknown item type"
- [ ] **T3.4** Add "Add Item" button to `ListControl.tsx`:
  - Disabled when `prop.listItemType` is empty
  - Calls `onListAction({ action: "add", listPath: prop.path })`
- [ ] **T3.5** Add "Remove" (×) button to `"listItem"` nodes in `ViewModelNode`:
  - Parses `prop.path` to extract `listPath` and `index` (regex: `/^(.+)\[(\d+)\]$/`)
  - Calls `onListAction({ action: "remove", listPath, index })`
- [ ] **T3.6** Export `performListAction` from `useRivePlayground` hook return value
- [ ] **T3.6b** Implement `findListNode(props: ViewModelProperty[], path: string): ViewModelProperty | undefined` — simple recursive helper that walks `children` to find a node by exact `path` match (needed inside `performListAction` to read `listItemType` for the "add" action)
- [ ] **T3.7** Wire `onListAction={performListAction}` in `App.tsx` → `Sidebar.tsx` → `ViewModelPanel`
- [ ] **T3.8** Test add to non-empty list → new item appears, canvas updates
- [ ] **T3.9** Test remove middle item → remaining items renumber, cache rebuilds correctly

**Acceptance**: Add/remove list items works. Canvas reflects changes. No stale cache bugs (verified by editing properties after add/remove).

---

## Phase 4 — Reorder (Swap) [v1.1]
> **Goal**: Can reorder list items with ↑/↓ buttons.

- [ ] **T4.1** Add ↑/↓ buttons to `"listItem"` nodes in `ViewModelNode`:
  - ↑ disabled when `index === 0`
  - ↓ disabled when `index === listLength - 1`
  - ↑ calls `onListAction({ action: "swap", listPath, indexA: index - 1, indexB: index })`
  - ↓ calls `onListAction({ action: "swap", listPath, indexA: index, indexB: index + 1 })`
- [ ] **T4.2** Implement `"swap"` in `performListAction`: call `listProp.swap(indexA, indexB)` then clear cache + re-extract
- [ ] **T4.3** Test swap: item moves position, all properties remain correctly associated

**Acceptance**: Items can be reordered. After swap, editing item properties affects the correct canvas element.

---

## Out of Scope (Defer to v2)

- [ ] Preset save/load for list contents
- [ ] Nested lists (list-within-list via viewModel) — may work automatically; needs dedicated test
- [ ] Drag-and-drop reorder
- [ ] Performance optimization for large lists (>50 items)
- [ ] `listIndex` data type display (related but separate)

---

## Phase 5 — Automated Test Suite (Minimum Viable, before Phase 3 ship)
> **Goal**: Cover the 5 highest-risk scenarios with automated tests. No existing test infra — these tasks include setup.

- [ ] **T5.1** Set up test infra: `npm install --save-dev vitest @testing-library/react jsdom`; add `vitest.config.ts` to `/playground`
- [ ] **T5.2** Extract pure helper functions to testable modules:
  - `parseListPath(path: string): { listPath: string; index: number; childPath?: string } | null` — extracted from `"listItem"` path parsing logic
  - `findListNode(props: ViewModelProperty[], path: string): ViewModelProperty | undefined`
  - `clearListCache(cache: Map<string, unknown>, listPath: string): void` — encapsulates the prefix-clearing logic
- [ ] **T5.3** Unit test: `parseListPath()`
  - `"todos[2].title"` → `{listPath:"todos", index:2, childPath:"title"}`
  - `"todos[0]"` → `{listPath:"todos", index:0, childPath:undefined}`
  - `"user.todos[1].name"` → `{listPath:"user.todos", index:1, childPath:"name"}`
  - `"notAList"` → `null`
  - `"todos[-1].title"` → `null` (negative index)
- [ ] **T5.4** Unit test: `clearListCache()` — prefix safety
  - Cache: `{todos, "todos[0]", "todos[0].title", "todosExtra", "tags[0]"}` → clear `"todos"` → only `"todosExtra"` and `"tags[0]"` survive (confirms `todos[` prefix, not `todos` prefix)
- [ ] **T5.5** Unit test: mock `readInstance()` list branch
  - 2-item list → tree has `type:"list"` with `children.length === 2`, each `type:"listItem"`, each with scalar `children`
  - 0-item list → `{type:"list", children:[], listItemType:""}` — no crash
  - `instanceAt(1)` returns null → only item 0 in children
- [ ] **T5.6** Unit test: `updateNested()` with bracket paths
  - Tree: `todos` list → `todos[0]` listItem → `todos[0].title` string
  - Call `updateNested(props, "todos[0].title", "new")` → only `todos[0].title` value changes
  - Call with `"todos[1].title"` (nonexistent) → tree unchanged
- [ ] **T5.7** Integration test (mock hook): after `performListAction({action:"remove", listPath:"todos", index:1})` on a 3-item list
  - `removeInstanceAt(1)` called on mock list
  - Cache entries `"todos[1]"`, `"todos[1].title"`, `"todos[2]"`, `"todos[2].title"` deleted
  - `"todos[0]"` and `"todos[0].title"` still present
  - `extractLiveData` called exactly once (debounced)
- [ ] **T5.8** Integration test: rapid add ×2 within 30ms → `extractLiveData` called **once** (debounce works)

---

## Tradeoff Resolutions (from Oracle+Metis review)

- [ ] **T-FIX-1** Replace `setTimeout(extractLiveData, 50)` with debounced version:
  ```ts
  const extractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // In performListAction:
  if (extractTimerRef.current) clearTimeout(extractTimerRef.current);
  extractTimerRef.current = setTimeout(extractLiveData, 50);
  ```
- [ ] **T-FIX-2** Change "Disable Add for empty lists" → "Optimistic Add with toast on failure":
  - Always show enabled Add button when list is accessible
  - Try add; if `viewModelByName` fails → show non-blocking error toast "Could not add item — item type unavailable"
  - On success → update `listItemType` from new item's `viewModelName`
- [ ] **T-FIX-3** Cache invalidation MUST use exact prefix `"${listPath}["`, not `"${listPath}"`:
  ```ts
  const prefix = `${listPath}[`;
  for (const key of vmPropsCache.current.keys()) {
    if (key === listPath || key.startsWith(prefix)) {
      vmPropsCache.current.delete(key);
    }
  }
  ```
  This prevents accidentally deleting `"todosExtra"` when clearing `"todos"`.
- [ ] **T-FIX-4** Investigate `list.size` vs `list.length` in actual Rive WASM TypeScript types (`@rive-app/canvas-advanced`). If the API uses `.size`, update all references. The guard becomes: `typeof list.size === "function" ? list.size() : (list.size ?? list.length ?? 0)`.

---

## Verification Checklist (Pre-Ship)

- [ ] `lsp_diagnostics` clean on all modified files (types.ts, useRivePlayground.ts, ViewModelPanel.tsx, TypeBadge.tsx, ListControl.tsx, App.tsx, Sidebar.tsx)
- [ ] TypeScript build passes: `npm run build` in `/playground`
- [ ] No `as any` suppressions introduced (existing ones in the file are pre-existing)
- [ ] All T5.x unit/integration tests pass: `npm run test` in `/playground`
- [ ] Manual QA matrix Q1–Q10 complete (see spec.md)
- [ ] `extractLiveData()` called ≤1 time per user action burst (debounce verified)
- [ ] `"todosExtra"` cache key NOT cleared when `"todos"` list mutations occur (T5.4 regression)
- [ ] Tested with: non-empty list, empty list, list inside nested viewModel, two lists in same VM

---

## Go/No-Go Criteria Per Phase

| Phase | Ship condition |
|---|---|
| **Phase 1** | (1) List with ≥1 item displays correctly. (2) List with 0 items shows empty state, no crash. (3) List inside nested viewModel (`user.todos[0].title`) renders. (4) TypeScript build clean. |
| **Phase 2** | All Phase 1 criteria PLUS: editing `todos[0].title` updates canvas AND does NOT affect `todos[1].title` in canvas (isolation test Q4). |
| **Phase 3** | All Phase 2 criteria PLUS: (1) T5.7 cache-after-remove integration test passes. (2) T5.8 debounce test passes. (3) Manual Q3 (remove middle item renumber) and Q7 (rapid Add) pass. |
| **Phase 4 (v1.1)** | All Phase 3 criteria PLUS: Q5 (swap then edit correct canvas element) passes. |
