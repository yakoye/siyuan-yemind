# YeMind v0.9.16 direct image manipulation design

## Interaction states

Node images use three explicit states:

1. **Idle** — no extra overlay.
2. **Hover** — a blue border follows the rendered image; no buttons or handles are shown.
3. **Selected** — the image border remains, eight resize handles and a top-right delete button appear, and a floating Replace/Delete toolbar is shown above the image. The containing node remains the active node.

Clicking the node outside the image closes image selection and leaves ordinary node selection in control. Clicking the canvas or another node also closes the image overlay.

## Resizing contract

- North, south, east and west handles resize one axis freely.
- Holding Shift while using an edge handle preserves the current image ratio and keeps the opposite edge centre anchored.
- Corner handles always preserve the current image ratio, regardless of Shift.
- Every handle uses the matching browser resize cursor.
- The resize overlay is rendered in viewport coordinates and converted back through the current canvas scale before `SET_NODE_IMAGE` persists the custom size.

## Keyboard and double-click ownership

- When an image is selected, Delete or Backspace removes only the image and consumes the event before structural node deletion can run.
- Editable controls and Quill content keep keyboard ownership, so image deletion does not intercept text editing.
- Image double-click stops propagation and opens the image lightbox.
- Text double-click follows the normal node editing path with `selectTextOnEnterEditText` enabled, selecting the complete text.

## Replacement and compatibility

Replacement reuses the existing image dialog and the currently active node. Old hover Delete, resize and magnifier controls are removed. Image controls remain excluded from tree dragging.

New clipart is fitted proportionally into a 48 × 48 box. Legacy 72 × 72 clipart remains a migration candidate, while manually resized and already-versioned images are preserved.
