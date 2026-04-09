# Proposal: List Data Type Support in Rive Playground

**Feature:** `list-data-type-support`  
**Status:** Draft  
**Author:** Sisyphus / NhoNH  
**Date:** 2026-04-09  

---

## Problem

The Rive Playground's ViewModel panel currently silently ignores properties with `type === "list"`. When a Rive file uses Rive's Data Binding List feature (https://rive.app/docs/editor/data-binding/lists), the Playground renders a grayed-out unsupported badge and provides no way for users to inspect or modify list contents.

This is a significant gap because Lists are a first-class Rive data binding feature used to drive dynamic, repeating UI (e.g., todo lists, leaderboards, product carousels). Without List support, the Playground is not useful for any `.riv` file that leverages this pattern.

---

## Goal

Add full List data type support to the Rive Playground's ViewModel panel, including:
- Displaying list items as collapsible accordion sections
- Editing scalar properties on existing list items
- Adding new items to a list
- Removing items from a list
- Reordering items via swap (↑/↓)

---

## Scope

### In Scope

- `types.ts` — Add `listItemType?` field to `ViewModelProperty`
- `useRivePlayground.ts` — `readInstance()` handles `"list"` type: extracts all items as nested `"listItem"` children
- `useRivePlayground.ts` — New `performListAction()` callback for structural mutations (add/remove/swap)
- `controls/ListControl.tsx` — New component: list header with item count badge, add button, delegates items to `ViewModelNode`
- `ViewModelPanel.tsx` — Add `case "list"` and `case "listItem"` to `ViewModelNode` switch
- `TypeBadge.tsx` — Add colors for `"list"` and `"listItem"` types

### Out of Scope (v2)

- Nested lists within lists (list-of-lists)
- Preset serialization of list contents (list item counts may differ)
- Drag-to-reorder (swap buttons suffice for v1)
- Lists with 100+ items (no virtualization needed for typical Rive designs)

---

## Why Now

Rive's Data Binding feature (launched 2024) is increasingly used in production Rive files. The Playground advertises full ViewModel support but silently fails on one of the most important ViewModel property types. This causes confusion and limits the Playground's value for teams using data binding.

---

## Success Criteria

1. Loading a `.riv` file with a list property displays all list items as accordion sections in the ViewModel panel
2. Editing a scalar property (string, number, boolean, color) on a list item is immediately reflected in the Rive canvas
3. Clicking "Add Item" appends a new default instance to the list and updates the canvas
4. Clicking "Remove" on an item removes it from the list and updates the canvas
5. Clicking ↑/↓ on an item swaps it with its neighbor and updates the canvas
6. Empty lists show "No items" with an "Add Item" button (if type is discoverable)
7. The TypeScript build produces no new errors
