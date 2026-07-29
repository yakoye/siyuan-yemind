# YeMind v0.9.18 verification

## Automated source-tree verification

- Test entry domains: 15 passed.
- Scenario modules: 193 passed by the structural manifest gate.
- Test declarations: 587, with 0 skipped/todo declarations.
- TypeScript syntax: 339 files passed.
- TypeScript strict check (`tsc --noEmit`): passed.
- Offline behavior entries: 7 passed.
- Offline production bundle: passed, 263 modules.
- Built entry syntax (`node --check index.js`): passed.
- Rebuilding `index.js` from the source tree produced the release entry successfully.

## Chromium regression verification

All 19 browser regression entry scripts passed with 0 page errors and 0 console errors:

- editor bundle and bundle loading;
- v0.9.3 through v0.9.17 regression scenarios;
- v0.9.18 split-view reveal and layout drag parity.

The v0.9.18 browser scenario verified:

- opening split view reveals the currently selected outline row immediately;
- left logical drag behavior mirrors the established right logical behavior;
- organization, mind-map, catalog, timeline and vertical-timeline child drops use the immediate candidate model;
- same-axis catalog sibling reordering remains distinct from the outward child tail;
- Timeline 2 top branches preserve visual/native reverse ordering;
- left and right fishbone drag behavior is supported;
- right fishbone is rendered as a geometric mirror with its fish tail retained.

Tree-table and “other” gallery presets are covered through their adapted engine layouts. For example, the top-title tree table uses `catalogOrganization`, while the left bracket uses `logicalStructureLeft`.

## Network-dependent gates not completed

The configured npm gateway returned HTTP 503 while downloading dependencies, including `whatwg-url-14.2.0.tgz`. Therefore:

- `npm ci` could not complete;
- formal Vitest execution could not start because `vitest` was unavailable;
- formal Vite production build could not start because `vite` was unavailable;
- formal Vite module count is unavailable.

These gates are reported as unverified rather than marked as passed. TypeScript strict checking, offline behavior tests, the 263-module offline bundle and Chromium interaction regressions were used as available independent checks.

## Manual focus

- Open split view after selecting a node outside the currently visible outline area.
- Compare left-logical target zones and live room-making with right logical.
- Exercise both sides of mind maps and all timeline/tree/organization directions on a large real map.
- Confirm right fishbone is the horizontal mirror of left fishbone while labels remain readable.
- Exercise tree-table and the “other” gallery presets after changing their structures.

## Release archive verification

- ZIP CRC: passed.
- Complete extraction: passed.
- `assets/`, `node_modules/`, nested ZIP files and user map/settings/checkpoint data: absent.
- Extracted test structure: 15 domains and 193 scenario modules passed.
- Extracted TypeScript syntax: 339 files passed.
- Extracted TypeScript strict check: passed using the available system Node type declarations.
- Extracted offline behavior tests: 7 entries passed.
- Extracted offline production bundle: 263 modules passed.
- Extracted built entry syntax: passed.
- Extracted rebuild of `index.js`: byte-identical.
- Extracted Chromium checks for v0.9.16 image editing, v0.9.17 interaction regressions and v0.9.18 layout drag parity: passed with 0 page and console errors.
- Extracted `npm ci`: failed with the same npm gateway HTTP 503 response and was not marked as passed.
