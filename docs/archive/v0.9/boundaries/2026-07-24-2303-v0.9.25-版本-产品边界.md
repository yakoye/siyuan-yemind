# YeMind v0.9.25 product boundaries

## Included

- Viewport-bounded text-to-map dialog with independently scrolling source and processed preview.
- Parsed hierarchy preview without source tree glyphs.
- Automatic wrapping width for newly imported long labels without source-text mutation.
- Persistence of later user-defined node width.
- Custom dark-aware Theme and Line panels.
- Unified dark foreground, hover, focus and selected states for Structure, Theme, Line, Style and Saved.
- Compact outline display of node icons, images and clipart.
- Outline Add actions that reuse canvas marker, clipart and image workflows.

## Data-safety rules

- Import still builds on a cloned tree and commits as one tree transaction.
- Parser/validation failure leaves the map unchanged.
- Automatic width metadata is added only to new long imported nodes.
- Existing node width wins when replacing the current node.
- Manual width editing clears the automatic-width ownership marker.
- Outline accessories are derived from existing node data; no duplicate attachment store is created.
- Release packages exclude maps, settings, checkpoints, diagnostics and other user-created storage.

## Deliberately excluded

- Inserting hard line breaks solely to shorten imported labels.
- Mirroring node background, border, shape, branch lines or free canvas position into outline rows.
- Full image resize/crop/reposition controls inside the outline; those remain canvas operations.
- AI semantic inference for arbitrary prose.
- Adding notes, links, tags and formula indicators to the compact accessory strip in this release.
