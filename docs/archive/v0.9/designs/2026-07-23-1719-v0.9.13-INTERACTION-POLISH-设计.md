# YeMind v0.9.13 interaction polish

## Root causes

1. Marker SVGs embedded the complete sprite image directly in the visible SVG group. `simple-mind-map` included that oversized image in the content bounding box, so the group was translated outside the node shape.
2. The v0.9.11 image pin state replaced the earlier hover interaction and made preview dependent on double-click.
3. Theme-selected relation lines inherited the root text color and a width of 6px, producing an opaque black curve in dark-root themes.
4. Transparent `!important` toolbar styling overrode hover feedback. The Structure gallery also lacked a document-level outside-click listener, while both style panels shared one oversized fixed geometry.
5. About remained embedded in Settings even though diagnostics and release information are top-level plugin surfaces.
6. The default tree reused the file title as the center topic and used two different example child labels.
7. `simple-mind-map` clears `activeNodeList` before emitting `node_contextmenu`, so restoring selection inside the existing event handler was already too late.
8. Rich-text measurement elements were appended under the canvas. SiYuan can keep inactive tabs mounted but hidden; a render in that state measured text as zero and produced empty pill-shaped nodes.

## Design

- Marker SVGs define the sprite image inside `<defs><pattern>` and paint a viewport-sized `<rect>`. Only the 28×28 rect contributes visible geometry.
- Image controls are hover-owned again. Delete, preview and resize remain isolated from structural dragging.
- Active relation lines use `#2563eb` and 3px width.
- Right-click selection is snapshotted in a capture-phase canvas listener, then restored after the upstream handler and before YeMind opens its menu.
- Rich-text and custom-content measurement elements are reparented to `document.body`, followed by one re-render. They are removed during `beforeDestroy`.
- Project and node style panels use independent compact dimensions; node controls use a two-column grid.
- About is a standalone dialog opened from the top-bar menu.
