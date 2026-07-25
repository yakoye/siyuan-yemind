# YeMind v0.9.26 product boundaries

## Included

- Repair of v0.9.25 imported automatic-width records that duplicated `width` and `customTextWidth`.
- Deferred measured layout when text import occurs while the map canvas is hidden or zero-sized.
- Preservation of viewport transform and active selection during import stabilization.
- Recursive branch collapse followed by one-level expansion.
- Whole-map collapse followed by root-only one-level expansion.
- Outline image/clipart single-click editing and double-click lightbox preview.
- Outline access to todo, outer frame, note, comments, tags, icon, node link, clipart, image, code block, formula and inline link.
- Compact outline status projection for semantic node content.

## Data-safety rules

- Legacy width repair runs only on nodes explicitly marked as imported automatic-width nodes and only removes an equal duplicate `width`.
- User-defined widths and unmarked historical nodes are not changed.
- Import replacement remains atomic and parser failure leaves the tree unchanged.
- Stabilization redraw is a view/layout operation, not another content history entry.
- Collapse and expand change only branch `expand` state.
- Outline and map operate on the same canonical node data.
- Release packages exclude maps, settings, checkpoints, diagnostics and other user-created storage.

## Interaction rules

- Image single click edits; double click previews.
- In read-only mode, preview remains available but mutation commands remain blocked.
- Branch menu collapse affects every descendant branch; branch expansion reveals one level only.
- Global expansion after a full collapse reveals root children only.
- Code block, formula and inline link act on the current outline rich-text selection.

## Deliberately excluded

- Reproducing actual node background, border, shape, outer-frame region, connection styling or canvas geometry in outline rows.
- Full drag-resize/crop/reposition controls inside the outline; those remain map-canvas operations.
- Expanding all descendant levels when using the new one-level expand command.
- Broad normalization of old width data that is not explicitly marked as v0.9.25 imported automatic width.
- AI interpretation of arbitrary prose beyond the supported structured-text parsers.
