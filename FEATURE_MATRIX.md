# YeMind feature matrix

| Area | Current capability |
|---|---|
| Views | Canvas, split outline and full outline backed by the same map tree |
| Structure | Add, delete, move, reorder, fold, summary, outer frame, relation line and indentation-based bulk tree import |
| Content | Rich text, links, formulas, code, images, notes, comments, tags, icons and todo |
| Appearance | 22 themes, 25 light/dark appearances, density, background and named rainbow lines |
| Theme colors | Per-level text, fill, border and parent-child line colors with 1/3/4/6 branch cycles |
| Appearance refresh | One atomic full redraw; immediate theme/rainbow updates; viewport and selection preserved; transparent root resolves to canvas background |
| Local style priority | Node-local text, fill, border and line values override whole-map themes |
| Outline model | One structured contenteditable document; no user-facing text/node mode split |
| Outline selection | Native cross-row ranges; first Ctrl/Cmd+A selects the current node, second selects the complete outline |
| Clipboard | Selection replacement, rich/plain paste, indented tree import, hidden-descendant whole copy and safe external text/html output |
| Outline structure editing | Enter splits/creates siblings, Shift+Enter inserts soft breaks, empty nodes use two-stage Backspace deletion, plus Tab/Shift+Tab and atomic multiline replacement |
| Outline drag | Full indentation-cell move area, 5px threshold, whole-row BEFORE/AFTER locking and YeMind-green parent/same/child depth snapping |
| Outline presentation | Black 7px triangles, black 5px leaf squares, indent-rainbow guides, flat `#ececec` hover and `#deeae6` active state |
| Right logical canvas drag | Pointer-driven sibling rows and explicit child-tail target, live node displacement, green candidate-parent dashed link and no canvas insertion line |
| Drag safety | Self/descendant/root/no-op rejection, Escape cancellation, one-step undo and stable UID/metadata preservation |
| Image actions | Equal outer action boxes, visually balanced preview/delete artwork and event isolation from structural dragging |
| Persistence | Local maps, settings, checkpoints, autosave and restore protection |
| Integration | SiYuan tabs, Dock, protocol links and global-search node navigation |
| Reliability | Structured diagnostics and 15-domain manifest-controlled regression architecture |
