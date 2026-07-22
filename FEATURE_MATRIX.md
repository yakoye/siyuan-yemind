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
| Outline structure editing | Enter, Shift+Enter, Tab/Shift+Tab, atomic multiline replacement and stable UID/metadata preservation |
| Outline drag | Dedicated gutter plus depth-aligned before/inside/after insertion indicators |
| Outline presentation | Equal black triangle/square markers, indent-rainbow guides, flat `#ececec` hover and `#deeae6` active state |
| Persistence | Local maps, settings, checkpoints, autosave and restore protection |
| Integration | SiYuan tabs, Dock, protocol links and global-search node navigation |
| Reliability | Structured diagnostics and 15-domain manifest-controlled regression architecture |
