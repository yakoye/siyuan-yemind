# YeMind feature matrix

| Area | Current capability |
|---|---|
| Views | Canvas, split outline and full outline backed by the same map tree |
| Structure | Add, delete, move, reorder, fold, summary, outer frame, relation line and indentation-based bulk tree import |
| Content | Rich text, node links, selection-scoped inline links, formulas, code, images, notes, comments, tags, icons and todo |
| Appearance | 22 themes, 25 light/dark appearances, density, background and named rainbow lines |
| Theme colors | Per-level text, fill, border and parent-child line colors with 1/3/4/6 branch cycles |
| Appearance refresh | One atomic full redraw; immediate theme/rainbow updates; viewport and selection preserved; transparent root resolves to canvas background |
| Local style priority | Node-local text, fill, border and line values override whole-map themes |
| Selection toolbar | Canvas and outline share delayed-after-selection visibility; saved ranges survive font/size dropdown focus |
| Context menus | Separate single-node, multi-node and blank-canvas menus with state-aware outer-frame and clipboard commands |
| Style panels | Project and node styles use one anchored medium-size panel surface |
| Relation editing | Editable persisted Bézier endpoints/control points, tangent-driven arrows and lifecycle guards |
| Outline model | One structured contenteditable document; no user-facing text/node mode split |
| Outline selection | Native cross-row ranges; first Ctrl/Cmd+A selects the current node, second selects the complete outline |
| Clipboard | Selection replacement, rich/plain paste, indented tree import, hidden-descendant whole copy and safe external text/html output |
| Outline structure editing | Enter, Shift+Enter, Tab/Shift+Tab, atomic multiline replacement and stable UID/metadata preservation |
| Outline drag | Full indent-cell move gutter, 5px threshold and stable YeMind-green depth-aligned BEFORE/AFTER/CHILD guides |
| Outline presentation | Black 7px triangles, black 5px leaf squares, midpoint-aligned indent-rainbow guides with no Root-side guide, flat `#ececec` hover and `#deeae6` active state |
| Canvas drag | Right-logical nearest-node local zones, continuous real-time candidate-parent green dashed link, live room preview and atomic subtree moves |
| Drag safety | Self/descendant/root/no-op rejection, Escape cancellation, one-step undo and stable UID/metadata preservation |
| Image actions | Single-click pinned controls, double-click lightbox, equal action boxes and event isolation from structural dragging |
| Persistence | Local maps, settings, checkpoints, autosave and restore protection |
| Integration | SiYuan tabs, Dock, protocol links and global-search node navigation |
| Reliability | Structured diagnostics and 15-domain manifest-controlled regression architecture |
