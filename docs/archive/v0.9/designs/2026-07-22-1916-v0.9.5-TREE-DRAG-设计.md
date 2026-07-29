# YeMind v0.9.5 unified tree drag design

## Goal

Outline and canvas dragging share one structural vocabulary: `NONE`, `BEFORE`, `AFTER` and `CHILD`. The UI adapters provide geometry and previews; the existing command path remains the sole data mutation and undo/redo owner.

## Shared rules

- The dragged subtree and all descendants are excluded from target hit testing.
- Neutral space resolves to `NONE` immediately and can never reuse a stale candidate.
- Sibling slots stabilize quickly; becoming a child requires a deliberate short dwell.
- Self, descendant, root-invalid and unchanged destinations are rejected before mutation.
- An accepted move is atomic, preserves UID and node metadata, and contributes one history item.
- Escape cancels the active session without saving or changing history.

## Outline adapter

- A transparent 14px gutter sits left of the triangle/square marker and uses `cursor: move`.
- No six-dot handle is rendered. A movement of at least 5px starts structural dragging.
- The node editor never starts structural dragging and remains available for native text selection.
- Branch markers remain 7×7px black triangles. Leaf markers are 5×5px black squares.
- A 2px YeMind-green insertion line with a square start marker is aligned to the final depth.
- The centre of a row is neutral unless the pointer deliberately enters the child depth direction.
- Moving left aligns the insertion guide to the nearest visible ancestor.

## Canvas adapter

- Hit testing uses the pointer, never the dragged clone rectangle.
- Sibling slots exist only within a narrow edge band; the larger gap between nodes is neutral.
- The outward layout tail is an explicit child gesture. Existing children use pointer position to choose the exact insertion index.
- The neutral dashed guide connects the original parent to the ghost. A valid candidate switches the dashed guide to the candidate parent.
- A green insertion guide shows the exact sibling or child slot.
- Layout adapters provide growth direction and sibling axis for right/left logical structures, mind maps, organizations and timelines. Unsupported specialized layouts retain the upstream fallback.

## Image controls

Preview, delete and resize controls stop structural drag initiation. The trash SVG is 18×18px inside the unchanged 25×25px action box, producing approximately the same visible artwork size as the padded magnifier.
