# Spec: List Data Type Support

## Feature: ViewModel List Property Display and Editing

---

## S1 — List Detection & Display

**WHEN** a `.riv` file is loaded that contains a ViewModel with a `list` type property  
**THEN** the ViewModel panel displays a collapsible accordion row for that property  
**AND** the row shows a `list` type badge (purple #7c3aed) and the property name  
**AND** the row shows the current item count as `(N items)`  
**AND** the accordion is collapsed by default  

**WHEN** the user clicks the list accordion header  
**THEN** the accordion expands to show all list items as `listItem` sub-accordions  
**AND** each `listItem` shows a `listItem` type badge (light purple #a78bfa) and `Item N` label  
**AND** each `listItem` is collapsed by default  

**WHEN** a list is empty (0 items)  
**THEN** the accordion expands to show `No items` placeholder text  
**AND** an "Add Item" button is shown (disabled if item type is unknown)  

---

## S2 — List Item Property Editing

**WHEN** the user expands a `listItem` accordion  
**THEN** all scalar properties of that item (string, number, boolean, color, enum, image, trigger) are shown with their respective control components  

**WHEN** the user changes a scalar property value within a list item  
**THEN** the change is applied to the Rive runtime via the cached property object (`.value = newValue`)  
**AND** the Rive canvas reflects the change in real time  
**AND** the React state tree updates the value at the correct bracket-indexed path (`listName[i].propName`)  

**WHEN** a list item contains a nested `viewModel` property  
**THEN** the nested viewModel renders as a further-nested accordion (existing behavior)  

---

## S3 — Add Item

**WHEN** the user clicks "Add Item" on a list with a known `listItemType`  
**THEN** a new default instance of the item ViewModel is appended to the list  
**AND** the Rive canvas reflects the new item  
**AND** the ViewModel panel re-reads the list and shows the new item as `Item N` at the bottom  
**AND** the new item's properties are editable immediately  

**WHEN** `listItemType` is unknown (empty list, no runtime type info)  
**THEN** the "Add Item" button is rendered but disabled  
**AND** a tooltip reads "Add unavailable — item type unknown"  

**WHEN** `rive.viewModelByName(typeName)` returns null or throws  
**THEN** the add operation fails silently (no UI error, button returns to enabled state)  

---

## S4 — Remove Item

**WHEN** the user clicks the × button on a list item  
**THEN** that item is removed from the Rive runtime list  
**AND** the Rive canvas reflects the removal  
**AND** the ViewModel panel re-reads the list and renumbers remaining items  
**AND** items after the removed index update their paths correctly (`[2]` becomes `[1]` if `[1]` was removed)  

**WHEN** only one item remains and the user removes it  
**THEN** the list shows `(0 items)` and the "No items" placeholder  
**AND** the "Add Item" button is shown (disabled if `listItemType` unknown, enabled if known)  

---

## S5 — Reorder Items (v1.1)

**WHEN** the user clicks ↑ on a list item (not the first)  
**THEN** that item swaps position with the item above it in the Rive runtime  
**AND** the Rive canvas reflects the new order  
**AND** the ViewModel panel re-reads the list and shows the new order  

**WHEN** the user clicks ↓ on a list item (not the last)  
**THEN** that item swaps position with the item below it  

**WHEN** an item is the first in the list  
**THEN** the ↑ button is disabled  

**WHEN** an item is the last in the list  
**THEN** the ↓ button is disabled  

---

## S6 — Cache Integrity

**WHEN** any structural mutation occurs (add/remove/swap)  
**THEN** all `vmPropsCache` entries with keys starting with `${listPath}[` are cleared  
**AND** `extractLiveData()` is called to rebuild the cache and React state  
**AND** scalar edits performed after the structural mutation work correctly  

---

## S7 — Error Resilience

**WHEN** `instanceAt(i)` returns null for any index  
**THEN** that item is skipped silently (no crash, no visible error)  

**WHEN** `list.length` is a function rather than a property  
**THEN** it is called as a function (`len()`)  

**WHEN** a preset is applied that references bracket-indexed paths (`listName[2].prop`) but the list currently has fewer than 3 items  
**THEN** those preset values are silently skipped (no crash, no error toast)  

---

## Non-Functional Requirements

| Requirement | Constraint |
|---|---|
| TypeScript build | Zero new errors after all changes |
| No new dependencies | Do not add npm packages |
| No `as any` introductions | Existing ones in the file are pre-existing |
| `extractLiveData()` call budget | ≤1 call per user action (add/remove/swap each trigger exactly 1 re-extract) |
| `instanceAt()` call budget | Called only inside `extractLiveData()`, never during render |

---

## Out of Scope

- Undo/redo for list mutations
- Preset save/load that preserves list item count and values
- Drag-and-drop reorder
- Lists with more than ~50 items (no virtualization needed)
- The `listIndex` ViewModel property type (separate feature)

---

## S8 — Concurrent Mutation Safety (Debounce)

**WHEN** the user clicks "Add Item" or "Remove" multiple times within 50ms (rapid clicks)  
**THEN** `extractLiveData()` is called at most **once** after the burst settles  
**AND** no intermediate state with wrong item count is persisted  
**AND** the Rive canvas reflects the final state after all mutations  

> **Implementation note**: Replace `setTimeout(extractLiveData, 50)` with a debounced version using a `useRef`-tracked timer: clear the previous timeout before scheduling the next.

---

## S9 — Multiple Lists in Same ViewModel

**WHEN** a ViewModel has two list properties (e.g., `todos` and `tags`)  
**THEN** each list renders as a separate accordion in the ViewModel panel  
**AND** mutations to `todos` (add/remove) do not affect `tags` cache entries  
**AND** cache invalidation for `todos[` does not clear `tags[` entries  

> **Critical**: `"todosExtra"` must NOT be cleared when invalidating prefix `"todos["`. Use exact prefix `"todos["`, not `"todos"`.

---

## S10 — File Reload While List Expanded

**WHEN** the user expands a list accordion and then loads a new `.riv` file  
**THEN** all list state (accordion open/closed, item count, cache) is reset  
**AND** the new file's ViewModel properties render from scratch  
**AND** no stale `vmPropsCache` entries from the previous file persist  

---

## S11 — Add After Remove-to-Empty

**WHEN** the user removes the last item from a list (transitions to 0 items)  
**AND** then immediately clicks "Add Item" (if `listItemType` is known)  
**THEN** a new item is added successfully  
**AND** the list shows `(1 item)` with the new item's properties  
**AND** no state from the previous extraction (before the list became empty) causes conflicts  

---

## S12 — listItem with Image Property (Async Load)

**WHEN** a list item contains a property of type `image`  
**THEN** the image property renders with the existing `ImageControl` component  
**AND** async image loading (blob URL decode) functions identically to image properties outside lists  
**AND** after a structural mutation (add/remove), the image blob URL for surviving items is not corrupted  

---

## S13 — Add Item Optimistic (Updated from "Disable")

> **Tradeoff revision**: "Disable Add for empty lists" is replaced with "Optimistic Add".

**WHEN** the user clicks "Add Item"  
**AND** `listItemType` is unknown (empty list, no runtime type info)  
**THEN** the add operation is attempted optimistically  
**AND** if `rive.viewModelByName(typeName)` throws or returns null, a non-blocking error toast is shown: "Could not add item — item type unavailable"  
**AND** the button returns to its enabled state after the failure  
**AND** if the add succeeds (Rive inferred the type), the new item appears and `listItemType` is updated from the new item's `viewModelName`  

---

## S14 — Nested List Path Correctness

**WHEN** a list property is nested inside a viewModel (e.g., `user.todos[0].title`)  
**THEN** paths use mixed dot+bracket notation correctly: `user.todos[0].title`  
**AND** `vmPropsCache` keys are set to `"user.todos"`, `"user.todos[0]"`, `"user.todos[0].title"`  
**AND** cache invalidation for `user.todos` uses prefix `"user.todos["` (not `"todos["`)  
**AND** `setViewModelProp("user.todos[0].title", "string", val)` correctly looks up `vmPropsCache.get("user.todos[0].title")`

---

## Manual QA Test Matrix

| # | Scenario | Expected | Pass Criteria |
|---|---|---|---|
| Q1 | 1-item list → remove | Empty list with "No items" + conditional Add button | Item count shows `(0 items)`, panel shows empty state |
| Q2 | Empty list → add (known type) | New item appears at index [0] | Item count shows `(1 item)`, item is editable |
| Q3 | 5-item list → remove item [2] | Items [3] and [4] renumber to [2] and [3] | Count shows `(4 items)`, paths are `[0]–[3]` |
| Q4 | Edit item [0].title | Only item [0] canvas element updates | Item [1] property unchanged in canvas |
| Q5 | Swap [0] and [1] → edit new [0].title | Canvas element that was [1] updates | Verify by checking canvas, not just UI label |
| Q6 | `user.todos[0].title` nested path | Displays in panel, editable, canvas updates | No crash, bracket path works under dot prefix |
| Q7 | Rapid Add ×3 within 100ms | Final count is `(3 items)`, extractLiveData called once | No intermediate flash of wrong count |
| Q8 | Two lists: `todos` and `tags` | Each renders separately, mutations isolated | Adding to `todos` doesn't affect `tags` |
| Q9 | listItem with `image` property | ImageControl renders, async blob load works | No broken image after structural mutation |
| Q10 | Reload .riv while list expanded | New file loads cleanly, no stale cache | Old bracket paths not present in vmPropsCache |
