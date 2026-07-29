# YeMind v0.9.9 test coverage matrix

| Area | Permanent automated coverage |
|---|---|
| Shared geometry variables | Row start, depth step, drag gutter, branch width and half-step constants are declared together |
| Root presentation | Root `::before` content is disabled and no guide is drawn to its left |
| First-level guide | Chromium compares the rendered guide coordinate with the exact midpoint of Root and level-1 marker centers |
| Deeper guides | Level-2 and level-3 guides are compared with adjacent marker-column midpoints |
| Guide count | Depth 1/2/3 pseudo-elements resolve to widths `1px`, `23px`, `45px` respectively |
| Color cycle | Existing four guide colors resolve in the rendered gradient and repeat every four levels |
| Drag hit area | The deepest guide remains inside the 22px complete indent-cell drag gutter |
| State stability | Hover and active state do not change marker, guide-left or guide-width values |
| Drop feedback | Drop-indicator indentation consumes the same row-start, depth-step and drag-width variables |
| Historical outline | Unified editor, staged select-all, paste, Enter, empty deletion, drag and default-font presentation |
| Historical canvas | Themes, root fill, image tools, nearest-node dragging, continuous green parent guide and solid-edge continuity |
