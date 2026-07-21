# YeMind Zen v0.5.23 Official Interaction Adaptation Boundary

Date: 2026-07-20

## Adapted mechanism

The release preserves the upstream `simple-mind-map` rich-text editor and Quill selection transaction. YeMind only repairs the host gesture boundary around that editor:

- upstream SVG double-click still starts node editing;
- upstream Quill still owns text, selection and formatting;
- the shared YeMind toolbar observes the upstream selection event;
- formatting is committed through the existing rich-text command path;
- map structure, history, persistence and checkpoints remain unchanged.

## Not introduced

v0.5.23 does not introduce a second node editor, second selection model, second history stack or private document kernel. It does not synthesize selection by replacing the node label with a custom contenteditable element.

## Regression principle

Future releases must run the real renderer/Quill integration test and the permanent user-reported interaction matrix before packaging. A fix to canvas gestures, folding, node quick controls or deletion shortcuts is not complete if it breaks node text selection or the formatting toolbar.
