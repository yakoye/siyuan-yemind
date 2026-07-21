# YeMind Zen v0.5.23 Verification Report

Date: 2026-07-20

## Release scope

v0.5.23 restores reliable canvas-node rich-text editing and establishes a permanent regression matrix for the user-reported interaction paths that have repeatedly affected one another:

- Double-clicking a real rendered SVG node opens the upstream Quill editor.
- Drag-selecting only part of a node label displays the shared rich-text toolbar.
- Bold and Underline apply only to the current selection rather than the whole node.
- Right-button canvas panning cannot leave the editor in a stale no-selection state.
- Canvas and outline rich-text surfaces keep Delete and Backspace inside the active text-editing transaction.
- Root/branch expansion, collapsed count controls and selection-aware `+ / −` controls remain covered by a long-lived regression matrix.

## Root cause

The canvas right-drag controller originally ended only on map-local `mouseup`. If the user released the right button outside the map surface, the editor could retain `is-canvas-right-dragging`. The associated editor-wide `user-select: none` rule then prevented the later Quill node editor from creating a native text selection, so the selection toolbar never received a valid range.

A second boundary issue treated only `.ql-editor` as editable. During editor activation, events can target the outer `.smm-richtext-node-edit-wrap`; Delete/Backspace and pointer events from that wrapper could therefore escape to canvas node/gesture handling.

## Implementation

- Right-drag cleanup now listens for window-level `mouseup` and window `blur` and exposes an explicit cancel path.
- Entering upstream text editing cancels any stale right-drag session before Quill opens.
- The editor root no longer receives a blanket no-selection rule during right drag; the canvas surfaces carry the drag restriction instead.
- `.smm-richtext-node-edit-wrap`, its Quill container and `.ql-editor` explicitly retain `user-select: text` and a text cursor.
- Pointer, mouse, double-click and context-menu events inside the canvas rich-text host stop at the editing boundary without preventing native selection.
- The whole canvas rich-text wrapper is classified as editable for Delete/Backspace shortcut isolation.

## Automated verification

```text
Test files: 122 passed
Tests: 327 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 890
Built index.js syntax: passed
ZIP CRC/integrity: passed
Complete extraction: passed
Extracted npm ci: passed
Extracted tests: 122 files / 327 tests passed
Extracted TypeScript: passed
Extracted production build: passed
Extracted index.js syntax: passed
```

### Real canvas rich-text integration coverage

The v0.5.23 integration test uses the actual `simple-mind-map` renderer, SVG node and Quill implementation. It:

1. creates a real rendered map;
2. dispatches a real SVG `dblclick` on the node;
3. confirms the upstream editor is active;
4. selects only the first four characters;
5. confirms the shared toolbar is visible;
6. clicks Bold and verifies only that range is bold;
7. clicks Underline and verifies only that range is underlined.

### Permanent user-reported regression matrix

The release suite retains explicit coverage for:

- unselected expanded nodes hiding `+ / −`;
- selected leaves showing `+`;
- selected expanded branches and Root showing `− / +`;
- collapsed Root/branches showing only the hidden-count expand control;
- expansion from persisted `nodeData.children` when rendered children are empty;
- Root and ordinary branch expansion through the same native command;
- canvas and outline rich-text editing surfaces isolating Delete/Backspace;
- right-button drag cleanup after a window-level mouse release;
- existing outline IME, empty-row deletion, folding, whole-row drag, context-menu suppression, notes, comments, colors, node images, styles and summaries.

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in the existing dependency chain. No bottom-layer package was force-upgraded for this interaction repair.

## Manual Windows SiYuan acceptance

The automated environment cannot launch the user's Windows SiYuan 3.7.2 desktop UI. Install the package and verify:

1. Right-drag the canvas, including releasing outside the map, then double-click a node and drag-select part of its label.
2. Confirm the toolbar appears and Bold, Underline, Italic, Strike, colors, links, formula and blur operate on the selected range.
3. Continue selecting text after stationary right-clicks, right-dragging and switching between pan/select modes.
4. Press Delete and Backspace while editing canvas and outline text and confirm the node is not structurally deleted.
5. Recheck Root/branch count expansion, disclosure triangles, `+ / −` controls, outline folding and right-drag menu suppression.
