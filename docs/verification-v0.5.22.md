# YeMind v0.5.22 Verification Report

Date: 2026-07-20

## Release scope

v0.5.22 fixes three event-routing regressions:

- Collapsed-number buttons and outline disclosure triangles explicitly restore branches whose rendered `node.children` list is empty while persisted `nodeData.children` still contains the subtree, including Root.
- Delete and Backspace remain text-editing keys whenever the outline Quill host or one of its descendants owns the editing transaction; structural deletion remains available only for an already-empty non-Root row.
- Right-button canvas dragging shows a grabbing cursor, pans in both canvas modes through the appropriate upstream/manual path, and suppresses the release context menu after a real drag while preserving a stationary right-click menu.

## Root causes

1. `simple-mind-map` removes collapsed descendants from the live rendered `node.children` array. The old command adapter used that array as a capability check and rejected the expand command even though the persisted subtree still existed in `node.nodeData.children`.
2. Quill can activate its host before focus reaches the inner `.ql-editor`. A key event targeting the outer `[data-outline-editor]` was therefore misclassified as a canvas shortcut and reached structural deletion handlers.
3. Context-menu delivery order varies by browser and may happen before or after mouseup. A right-drag gesture needs persistent one-shot menu suppression rather than a mouseup-only flag.

## Automated verification

- Test files: 120 passed
- Tests: 322 passed
- TypeScript: passed
- Production build: passed
- Vite modules transformed: 890
- Built index.js syntax: passed
- ZIP CRC/integrity: passed
- Complete extraction: passed
- Extracted tests/check/build: 120 files / 322 tests, TypeScript and production build passed

Focused coverage includes:

- collapsed ordinary branch expansion from persisted children;
- collapsed Root expansion from persisted children;
- number-button routing to an explicit expand callback;
- repeatable Root and ordinary outline disclosure controls;
- outline editor host and descendant shortcut isolation;
- empty-row-only structural deletion semantics;
- right-drag movement threshold and incremental deltas;
- pan-mode manual translation and select-mode upstream translation;
- grabbing cursor state;
- context-menu suppression after drag and preservation after stationary right click.

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in the existing Quill/simple-mind-map/uuid dependency chain. No dependency was force-upgraded for this interaction repair.

## Manual Windows SiYuan acceptance

1. Collapse and re-expand Root repeatedly from the canvas number, outline number/disclosure triangle, split view and pure outline.
2. Repeat the same sequence for ordinary branches after saving, reopening and undo/redo.
3. Immediately press Delete or Backspace after entering outline edit mode, then continue deleting Chinese and English text without losing the node.
4. Clear a non-Root row completely and press Delete/Backspace again to confirm the explicit empty-row structural deletion path.
5. Stationary right-click on canvas and confirm the blank-canvas menu opens.
6. Hold the right button, move the canvas, confirm the grabbing cursor, release, and confirm no menu appears in both pan and select modes.
