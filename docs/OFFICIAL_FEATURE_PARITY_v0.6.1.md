# YeMind Zen v0.6.1 Official Interaction Adaptation Boundary

Date: 2026-07-20

## Outline selection and dragging

The release keeps the official-style persistent outline editor and the existing upstream structure commands, but clarifies their gesture boundary:

- the active Quill/contenteditable surface owns pointer movement for caret placement and native text selection;
- the active outline editor host is never eligible to arm a structure-drag session;
- non-editing row chrome remains draggable;
- non-editing labels retain the deliberate long-press and movement threshold;
- final hierarchy changes still use the existing `simple-mind-map` move/insert command path and history.

No second selection model, drag structure, history stack or document kernel was added.

## Tool-surface consolidation

The release reorganizes YeMind-owned controls only. It does not replace the upstream layout, theme, line, node-style, checkpoint, undo, redo, fit or search transactions. Each visible button continues to call the previously verified command/service:

- top: Search, Structure, Theme, Line Style and Node Style;
- left: History/Checkpoints, Layout Reset, selection mode, Undo and Redo;
- bottom: Fit, read-only, Zen, zoom, fullscreen and help.

## Dialog and branding boundary

Note and Comment data, save transactions and hover previews are unchanged. Only the close-control placement is moved into the dialog content. Branding changes are CSS-only and do not alter map data or plugin identity.

## Permanent regression principle

Future releases must keep v0.6.1 outline selection, toolbar uniqueness, local dialog-close and branding tests alongside the existing Root/branch folding, count/triangle expansion, Delete/Backspace isolation, right-button panning, canvas rich-text selection, quick actions, notes, comments, images, styles and summary tests.
