# YeMind v0.9.12 verification

## Asset source contract

- Marker catalog: 126 items in 8 groups.
- Clipart catalog: 806 SVG items in 13 categories.
- Layout catalog: 28 thumbnails in 7 groups.
- The uploaded 1,660-line project tree was compared with every clipart and layout filename: 0 missing catalog entries; `marker-sprite.png` is present in the tree.
- Runtime code reads catalogs only and does not scan asset directories.
- Runtime URLs are derived from the actual SiYuan plugin base URL.

## Static and type gates

- Test structure: 15 domains, 180 scenario modules.
- Test declarations: 537.
- TypeScript source/test files: 322.
- TypeScript syntax gate: passed.
- Strict TypeScript check: passed.
- Offline behavior contracts: 6 passed, including the local asset contract.
- Offline bundle: 256 modules.
- `node --check index.js`: passed.

## Browser interaction gates

Chromium verified:

- 28 layout cards render in seven catalog groups.
- Layout thumbnail URLs resolve below `/plugins/siyuan-yemind/assets/layout-thumbnails/`.
- The selected visual layout ID persists independently as `layoutPresetId`.
- A node marker renders from the fixed local sprite.
- Clicking the marker opens its own marker group; the priority group contains 30 choices.
- The marker picker contains all eight groups and can add/remove multiple markers.
- The node context menu contains `剪贴图` before the ordinary image command.
- The clipart picker contains 14 tabs including `全部`, pages large result sets, and searches Chinese labels.
- Searching `河马` returns the catalog item `animal-001` and applies the local SVG URL.
- The selected clipart is stored as a node image above text together with `yemindClipartId`.
- Page errors: 0. Console errors: 0.

Historical Chromium regression scripts also passed for themes, outline editing, structured paste, drag interactions, image tools, persistent green drag preview, ordinary edge preservation, editable relations, rich text formatting, outline guides and canvas/outline reveal synchronization.

## Build reproducibility

- Theme data generation passed.
- The offline bundle was rebuilt from the current source.
- A clean extraction of the overlay ZIP reruns the critical syntax, type, offline, bundle and Chromium gates.
- Rebuilt `index.js` and the package copy must be byte-identical before release.

## Formal npm limitation

A clean `npm ci --ignore-scripts` attempt did not complete within the 120-second network gate and installed no packages. Therefore this report does not claim that the formal Vitest or Vite commands ran. The strict TypeScript, offline contracts, deterministic offline bundle and real Chromium interaction suites above were executed directly.

## Packaging boundary

The release artifact is an overlay patch. It intentionally excludes:

- `assets/clipart/**`
- `assets/icons/marker-sprite.png`
- `assets/layout-thumbnails/**`
- other unchanged fixed visual resources

It must be extracted over an existing YeMind plugin directory containing those resources. A standalone clean installation requires the fixed resources separately.
