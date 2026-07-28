# YeMind feature matrix

| Area | Current capability |
|---|---|
| Views | Canvas, split outline and full outline backed by the same map tree |
| Structure | Add, delete, move, reorder, fold, one combined multi-selection summary, outer frame, relation line and six-mode structured text-to-map import with processed preview |
| Content | Rich text, node links, selection-scoped inline links, formulas, code, images, notes, comments, tags, icons and todo |
| Appearance | 25 themes with light/dark definitions, density, background and named rainbow lines |
| Theme colors | Per-level text, fill, border and parent-child line colors; all nine Classic themes use the six exact v1.5 branch colors |
| Appearance refresh | One atomic full redraw; immediate theme/rainbow updates; viewport and selection preserved; transparent root resolves to canvas background |
| Local style priority | Node-local text, fill, border and line values override whole-map themes |
| Selection toolbar | Canvas and outline share selection formatting; double-click full selection opens the toolbar immediately and saved ranges survive control focus |
| Context menus | Separate single-node, multi-node and blank-canvas menus with text-to-map import, full subtree/global disclosure, exact supplied SVG image-isolated actions and state-aware content commands |
| Supplied icon isolation | 14 exact Base64 SVG documents, fixed 18px outer boxes, no inline path exposure to host CSS, SHA-256 source-byte regression |
| Style panels | Structure, Theme, Line and Style use dark-aware anchored panels; Theme uses grouped two-column cards with six real colors per preset, while Line remains a list |
| Relation editing | Editable persisted Bézier endpoints/control points, tangent-driven arrows, lifecycle guards and a clear blue selected state |
| Outline model | One structured contenteditable document; no user-facing text/node mode split |
| Outline selection | Native cross-row ranges; first Ctrl/Cmd+A selects the current node, second selects the complete outline |
| Clipboard | Selection replacement, rich/plain paste, six-mode structured tree import, hidden-descendant whole copy and safe external text/html output |
| Imported label width | Long imported labels use a 280px automatic wrap width without source newlines; later manual widths persist and disable the automatic marker |
| Outline structure editing | Enter, Shift+Enter, Tab/Shift+Tab, atomic multiline replacement and stable UID/metadata preservation |
| Outline drag | Full indent-cell move gutter, 5px threshold and stable YeMind-green depth-aligned BEFORE/AFTER/CHILD guides |
| Outline presentation | Stable branch-colored triangles/squares, segmented one-pixel-left indent guides, readable active/selection states and compact content-only icon/image/clipart accessory slots |
| Canvas drag | Right-logical nearest-node local zones, continuous candidate-parent preview and atomic subtree moves; drag-first right-button panning is isolated from selection |
| Drag safety | Self/descendant/root/no-op rejection, Escape cancellation, one-step undo and stable UID/metadata preservation |
| Resource actions | Images retain resize/lightbox editing; canvas and outline marker/clipart clicks use one viewport-aware Replace/Delete popover before the shared asset pickers |
| Persistence | Local maps, settings, checkpoints, autosave and restore protection |
| Cards and review | UID-linked study cards, search/filter/favorite/edit/flip, three-grade review scheduling and persisted progress |
| Transfer | `.yemind.svg` and `.yemind.zip`, SVG/KMindz/XMind/Markdown/OPML/PNG/Text/HTML/PDF plus legacy import compatibility |
| Integration | SiYuan tabs, Dock, protocol links and global-search node navigation |
| Floating UI | Top, bottom and left toolbars default pinned, share one persisted pin state, reveal from three edge hot zones in auto-hide mode and expose explicit pin/lock icons |
| Search and replace | Version47/VS Code two-row panel with case, whole-word, regex, selected-node scope and preserve-case controls; every occurrence navigates independently and rich-text replacement preserves inline markup |
| Render lifecycle | Revisioned animation-frame transactions update newly typed labels immediately and discard stale frames after deletion or structural mutation |
| SiYuan tab lifecycle | Restored and concurrently opened tabs deduplicate by map ID before repository startup |
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
