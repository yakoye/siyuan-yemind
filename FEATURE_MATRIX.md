# YeMind feature matrix

| Area | Current capability |
|---|---|
| Views | Canvas, split outline and full outline backed by the same map tree |
| Structure | Add, delete, move, reorder, fold, one combined multi-selection summary, outer frame, relation line and indentation-based bulk tree import |
| Content | Rich text, node links, selection-scoped inline links, formulas, code, images, notes, comments, tags, icons and todo |
| Appearance | 22 themes, 25 light/dark appearances, density, background and named rainbow lines |
| Theme colors | Per-level text, fill, border and parent-child line colors with 1/3/4/6 branch cycles |
| Appearance refresh | One atomic full redraw; immediate theme/rainbow updates; viewport and selection preserved; transparent root resolves to canvas background |
| Local style priority | Node-local text, fill, border and line values override whole-map themes |
| Selection toolbar | Canvas and outline share selection formatting; double-click full selection opens the toolbar immediately and saved ranges survive control focus |
| Context menus | Separate single-node, multi-node and blank-canvas menus with exact supplied SVG image-isolated actions, state-aware outer-frame and clipboard commands |
| Supplied icon isolation | 14 exact Base64 SVG documents, fixed 18px outer boxes, no inline path exposure to host CSS, SHA-256 source-byte regression |
| Style panels | Project and node styles use separate compact anchored panels; node controls use a denser two-column layout |
| Relation editing | Editable persisted Bézier endpoints/control points, tangent-driven arrows, lifecycle guards and a clear blue selected state |
| Outline model | One structured contenteditable document; no user-facing text/node mode split |
| Outline selection | Native cross-row ranges; first Ctrl/Cmd+A selects the current node, second selects the complete outline |
| Clipboard | Selection replacement, rich/plain paste, indented tree import, hidden-descendant whole copy and safe external text/html output |
| Outline structure editing | Enter, Shift+Enter, Tab/Shift+Tab, atomic multiline replacement and stable UID/metadata preservation |
| Outline drag | Full indent-cell move gutter, 5px threshold and stable YeMind-green depth-aligned BEFORE/AFTER/CHILD guides |
| Outline presentation | Black 7px triangles, black 5px leaf squares, midpoint-aligned indent-rainbow guides with no Root-side guide, flat `#ececec` hover and `#deeae6` active state |
| Canvas drag | Right-logical nearest-node local zones, continuous candidate-parent preview and atomic subtree moves; drag-first right-button panning is isolated from selection |
| Drag safety | Self/descendant/root/no-op rejection, Escape cancellation, one-step undo and stable UID/metadata preservation |
| Image actions | Hover border, direct image selection, eight resize handles, replace/delete toolbar, double-click lightbox and structural-drag isolation |
| Persistence | Local maps, settings, checkpoints, autosave and restore protection |
| Integration | SiYuan tabs, Dock, protocol links and global-search node navigation |
| Reliability | Structured diagnostics, same-generation hidden-tab text/frame measurement and 15-domain manifest-controlled regression architecture |

## Fixed local assets (v0.9.12)

| Capability | Status |
|---|---|
| 126 marker icons / 8 groups | Complete |
| Click existing marker to open same category | Complete |
| 764 clipart SVGs / 13 categories | Complete |
| Clipart label search and paged grid | Complete |
| Clipart above node text | Complete |
| 28 layout thumbnails / 7 groups | Complete |
| Persist visual layout preset identity | Complete |
| Runtime catalog loading without directory scanning | Complete |
| Resource-excluded update packaging without duplicate fixed assets | Complete |
