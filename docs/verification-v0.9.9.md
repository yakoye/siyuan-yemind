# YeMind v0.9.9 verification

## Release scope

This release corrects structured-outline indent-rainbow guide geometry. Root renders no guide; each descendant guide is centered between adjacent parent/child marker columns. Outline indentation, drag gutter, marker column and drop-indicator geometry now share one variable contract.

## Source and contract checks

- Theme generator: 19 source themes produced 25 appearance definitions.
- Public theme presets: 22.
- Test structure: 15 domains / 174 scenario modules.
- Registered suite declarations: 518.
- TypeScript syntax: 305 source and test files.
- Strict TypeScript: passed using the installed TypeScript compiler and the available Node type definitions.
- Offline behavior contracts: 5 passed.
- Reachable modules in the deterministic offline bundle: 247.
- Two consecutive bundle builds were byte-identical.
- Two consecutive bundle manifests were byte-identical.
- `node --check index.js`: passed.

## Focused v0.9.9 regression

Permanent CSS and Chromium coverage verifies that:

- the Root pseudo-element is disabled;
- the first guide equals the midpoint of Root and first-level marker centers;
- level-2 and level-3 guides equal the midpoint of adjacent marker centers;
- depth 1/2/3 guide spans resolve to `1px`, `23px`, `45px`;
- the deepest guide remains within the complete 22px indent-cell drag gutter;
- guide colors retain the existing four-color cycle;
- hover and active state do not change marker or guide coordinates;
- the drop indicator consumes the same indentation variables.

The focused Chromium run measured guide/midpoint coordinates of `103/103`, `125/125` and `147/147` pixels for the first three levels. Page errors were zero.

## Browser regression

The generated bundle passed:

- plugin loading, repository bootstrap and editor/SVG mount;
- 22 themes and theme/rainbow/dark refresh;
- Root fill and hover `+ / -` actions;
- unified structured outline, staged select-all, rich/plain paste, 34-node import and 601-node bulk paste;
- Enter split/create, soft breaks, two-stage empty-node deletion and default-font presentation;
- outline structural drag and green insertion feedback;
- image preview/delete/resize and drag isolation;
- nearest-node right-logical dragging, continuous green parent guide, room preview, sibling/child moves, undo and Escape;
- preservation of unaffected solid edges during drag previews;
- flat canvas rich-text editing without extra focus frames;
- v0.9.9 outline-guide midpoint geometry.

All focused browser runs reported zero page errors and zero console errors.

## Bundle fingerprints

- `index.js` SHA-256: `96b097c43b3a8aa1c0116b3a35e30dfbb147aa026985869b54fd53339d510deb`
- `index.css` SHA-256: `62e807e63ae650e1e2ba64296f2dfb53ca09e44859b7f31ae905fa0ac461cc23`
- `docs/offline-bundle-manifest-v0.9.9.json` SHA-256: `36de753843b354afb3beac779c0d9cf38e997c7d23699fdbb2308bd3372af21c`

## Formal dependency limitation

A clean `npm ci --ignore-scripts` was attempted. The internal npm gateway returned HTTP 503 for many archives, including Vitest, Vite, TypeScript, `@types/node`, `jsdom`, `jszip` and runtime dependencies. The interrupted install left an incomplete dependency tree, so formal Vitest and Vite commands were not claimed. Strict TypeScript, syntax checks, offline contracts, deterministic bundling and real Chromium interaction gates were executed instead.

## Release archive gate

The release archive must remain flat at the plugin root, exclude `node_modules`, Git data, temporary files, nested ZIPs and user map/settings/checkpoint data, pass ZIP CRC, and pass a fresh-extraction rerun of source, bundle and focused browser gates.
