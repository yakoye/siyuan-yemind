# YeMind v0.9.29 Design

## Floating toolbars

The top and bottom toolbars are transient by default. A pointer entering the top or bottom hot zone reveals the corresponding toolbar. Hover/focus keeps it visible. One persisted pin in the status bar fixes both toolbars in place.

## Direct zoom and title editing

The status zoom value is an input accepting plain numbers or percentages. Values are clamped to configured zoom limits. The status title enters inline edit mode; Enter or blur saves, Escape cancels, and blank text becomes `未命名导图`.

## Relation selection

Association lines retain their existing visible stroke. A separate transparent SVG path uses a 12px non-scaling stroke with `pointer-events: stroke`. Selected lines return to the configured 3px active visual width. The hit path remains in the SVG overlay and is excluded from node geometry.

## Quick node actions

The count displays only direct children. Collapse recursively closes the branch. Expansion opens only the selected node and leaves descendants collapsed. Placement derives from rendered direct-child geometry; when children are hidden, the current layout or parent direction supplies the branch side.

## View cleanup

Image and clipart resize overlays are canvas-only transient state. Switching to outline or split clears the resource-level selection while preserving ordinary node selection. Outline double-click preview routes to the same ImageLightbox instance as canvas preview.
