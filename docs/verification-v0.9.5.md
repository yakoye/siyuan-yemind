# YeMind v0.9.5 verification

## Release scope

v0.9.5 rebuilds structural dragging for the unified outline and canvas around shared `NONE`, `BEFORE`, `AFTER` and `CHILD` semantics. It also reduces the outline leaf square to 5 × 5px and visually balances the image delete artwork without changing action-button hit areas.

The release does not change persisted map, settings or checkpoint schemas. Accepted moves retain the existing node objects, UIDs, descendants and metadata.

## Source and catalog gates

- Theme generator: 19 source themes -> 25 appearance definitions.
- Public theme catalog: 22 schemes in Basic, Colorful and Classic groups.
- Test structure: 15 domains / 170 scenario modules.
- Test declarations registered in TypeScript suites: 505.
- TypeScript source/test syntax: 300 files passed.
- Strict TypeScript `--noEmit`: passed.
- Offline behavior contracts: theme, atomic appearance refresh, outline text import, structured outline and tree-drag intent passed.
- Offline bundle: 246 reachable modules.
- `node --check index.js`: passed.
- Consecutive offline bundle builds produced byte-identical `index.js` and v0.9.5 manifest files.

## Real Chromium interaction gates

The checked-in production bundle was loaded in system Chromium and exercised through real pointer, selection and keyboard interactions.

### Historical regression coverage

- Plugin bootstrap and repository initialization.
- Editor, SVG canvas and 22-theme menu mounting.
- Immediate theme, rainbow-line and dark/light appearance redraw.
- Root background fill and node hover `+`/collapse controls.
- Unified structured outline, staged select-all and selection-aware paste.
- Rich and plain clipboard output.
- 34-node indented PCIe outline import.
- 601-node bulk paste (approximately 0.50 seconds in this environment).

### Outline drag coverage

- Invisible 14px gutter and four-direction `move` cursor.
- Structural drag starts only after the 5px threshold.
- Node text remains available for native selection.
- Black 7px triangles and black 5px leaf squares.
- Neutral row center produces no candidate and no move.
- YeMind-green 2px BEFORE guide and square origin marker.
- Deliberate CHILD dwell and exact depth-aligned guide.
- Parent-aligned insertion when moving left.
- Escape cancellation.
- No stale drop styling or console/page errors.

### Canvas drag coverage

- Hit testing follows the pointer and excludes the dragged subtree.
- Neutral gap keeps the original-parent gray dashed preview and performs no move.
- BEFORE uses the candidate-parent green dashed link and green insertion guide.
- CHILD uses the target-parent dashed link and inserts at the calculated child index.
- Accepted moves preserve metadata and undo in one step.
- Escape cancellation performs no structural mutation.
- Browser page errors: 0; browser console errors: 0.

### Image action coverage

- Preview, delete and resize action boxes remain 25 × 25px.
- Delete SVG is 18 × 18px inside the unchanged box and has approximately the same visible artwork footprint as the magnifier.
- Resize artwork remains approximately 12 × 12px.
- Preview/delete/resize pointer sequences do not start structural dragging.
- Image data remains unchanged during drag-isolation checks.
- Browser page errors: 0; browser console errors: 0.

## Dependency-gated commands

A clean `npm ci --ignore-scripts` was attempted in an isolated directory. The internal package gateway repeatedly returned HTTP 503 for packages including `whatwg-url-14.2.0.tgz`, Vitest, Vite, TypeScript and runtime dependencies. The command did not complete and was terminated after the verification timeout.

Therefore this report does **not** claim a fresh formal Vitest run or Vite production build. The repository retains those commands as release gates for an environment where the registry is available. Strict TypeScript, deterministic offline bundling, offline contracts and real Chromium interaction tests were executed instead and are recorded above.

## Bundle hashes before packaging

- `index.js`: `38a37eb6dae8902c7f1de8d7d52bd2029b911648e0d4b2800aa1af07a9deb2d0`
- `docs/offline-bundle-manifest-v0.9.5.json`: `1bbb5e1c96e42acee2a0004cdd95339ebbe4444222b5d783302c0229d6798a8d`

Package CRC, extraction, repeat-build comparison, extracted-browser gates, archive entry count, archive size and final SHA-256 are recorded after the final release archive is produced.

## Extracted release-package gates

A 442-entry flat archive candidate was CRC-tested, extracted into a clean directory and verified without using files outside the archive except the system TypeScript/Node type runtime and Chromium executable.

The clean extraction repeated and passed:

- theme generation;
- 15-domain / 170-module structure validation;
- 300-file TypeScript syntax validation;
- strict TypeScript checking;
- all five offline contracts;
- deterministic 246-module bundle rebuild;
- byte-identical rebuilt `index.js` and v0.9.5 bundle manifest;
- bundle syntax and plugin bootstrap;
- editor/theme/root/hover historical regression;
- 601-node structured-outline interaction regression;
- outline and canvas drag interaction regression;
- image action sizing and structural-drag isolation regression.

The final archive SHA-256 and byte size are intentionally reported alongside the downloadable artifact rather than embedded into the archive itself.
