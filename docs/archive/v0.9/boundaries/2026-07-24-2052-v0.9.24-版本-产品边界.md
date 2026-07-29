# YeMind v0.9.24 product boundaries

## Included

- Outline line/structure commands in the agreed menu order.
- Structured text import with preview and explicit insertion policy.
- Center-only blank-map creation.
- Repeated empty-row Enter promotion.
- Official formula icon in the rich-text toolbar.
- Stable light/dark appearance refresh and dark Theme/Line controls.

## Data-safety rules

- Import constructs the full result on a cloned tree before replacement.
- A successful import is one Undo/Redo transaction.
- Parser errors do not leave a partial tree.
- Pasted source is treated as text and escaped; it is never executed as HTML.
- Line-only cut does not remove the node, descendants or metadata.
- Update packages exclude map/settings/checkpoint/diagnostic user data.

## Deferred

- Compact outline thumbnails/markers for standalone node accessories.
- Full canvas-style image editing inside the outline.
- Semantic AI inference for unstructured paragraphs.
- Import sizes beyond the protected 5,000-node limit.
