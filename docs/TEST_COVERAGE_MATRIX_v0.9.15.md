# YeMind v0.9.15 test coverage matrix

| Defect or contract | Permanent checks |
|---|---|
| Corrected SVG clipart stretched into a square | Explicit SVG dimensions, `viewBox` fallback, landscape/portrait/square fitting, picker source contract |
| Old maps retain the v0.9.14 square geometry | Legacy-candidate detection, geometry version marker and editor repair source contract |
| Corrected asset inventory drifts from runtime metadata | 13 categories, 764 entries, category counts, unique IDs/paths and exact `assets_tree.txt` path comparison |
| Generated runtime bundle omits the fix | Offline bundle rebuild, generated-entry syntax and source markers in `index.js` |
| Version/package contract | Manifest, package, lockfile, runtime constant, release information, documentation and archive naming checks |
| Resource-excluded update safety | Fixed assets, user data, node_modules, build directories and nested archives excluded |
