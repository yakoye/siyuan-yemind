# YeMind v0.5.4 Verification

## Scope

This release only exposes and documents native box selection, Ctrl/Cmd multi-selection, and native batch subtree dragging. It does not add custom selection geometry or drag state.

## Upstream contract reviewed

- `simple-mind-map/src/plugins/Select.js`: box selection and canvas-mode behavior.
- `simple-mind-map/src/core/render/node/MindMapNode.js`: Ctrl/Cmd-click toggles active nodes.
- `simple-mind-map/src/plugins/Drag.js`: top-ancestor filtering and batch `MOVE_NODE_TO` / `INSERT_BEFORE` / `INSERT_AFTER`.

## Red-green tests

- `tests/selectionPresentation.test.ts` was run before implementation and failed because `selectionPresentation.ts` did not exist; it passed after the pure helper was added.
- `tests/editorMultiSelectionIntegration.test.ts` failed before the mode toggle/count integration and passed after the thin UI integration.
- `tests/selectionHelpText.test.ts` failed before the operation guidance was added and passed after settings/help copy was updated.

## Fresh verification

- `npm test`: 38 test files, 85 tests passed.
- `npm run check`: TypeScript completed with exit code 0.
- `npm run build`: 840 modules transformed; production build completed with exit code 0.
- `node --check index.js`: completed with exit code 0.

## Manual checks still required in SiYuan

1. Pan-priority: left-drag pans; Ctrl/Cmd + left-drag box-selects.
2. Selection-priority: left-drag box-selects; right-drag pans.
3. Ctrl/Cmd-click adds and removes nodes from the active selection.
4. Dragging any active node moves the highest selected subtrees together.
5. Selecting both a parent and descendant does not move the descendant twice.
6. The bottom status count appears only when at least two nodes are selected.
