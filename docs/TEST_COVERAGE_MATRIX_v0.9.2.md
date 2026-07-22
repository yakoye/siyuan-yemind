# YeMind v0.9.2 test coverage matrix

| Domain | v0.9.2 coverage |
|---|---|
| Theme source | 19 names/order, schema v2, color syntax, center and three node-level borders |
| Base themes | Three presets, light/dark definitions and preserved default borders |
| Theme registry | 22 public themes and 25 concrete appearance definitions |
| Runtime colors | Center, level 1, level 2 and normal text/fill/border/line resolution |
| Branch cycling | 1/3/4/6 cycles, including branches 7 and 8 |
| Local styles | Text, fill, border and line local values remain higher priority |
| Appearance transaction | Theme and rainbow config applied before exactly one complete redraw |
| Immediate refresh | Theme and rainbow changes use `reRender`, not cached partial render |
| Stability | Zoom/pan untouched, active-node selection restored, latest coalesced transaction wins |
| Overlay redraw | Associative lines, outer frames, quick actions and selection presentation refresh after nodes |
| Persistence | Theme and project rainbow selections continue through repository and checkpoints |
| Full regression | 15 feature domains and 162 registered scenario modules |
