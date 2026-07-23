# YeMind v0.9.10 verification

## Release scope

This release replaces repeated per-row outline guide fragments with one structured-outline guide overlay. Each expanded parent paints exactly one vertical `1px` segment directly below its triangle tip and through its visible subtree. It also completes bidirectional visible-node synchronization: canvas selection reveals the matching outline row inside the outline scroll container, while outline activation continues to centre the matching canvas node.

## Source and contract checks

- Theme generator: 19 source themes produced 25 appearance definitions.
- Public theme presets: 22.
- Test structure: 15 domains / 175 scenario modules.
- Registered suite declarations: 521.
- TypeScript syntax: 306 source and test files.
- Strict TypeScript: passed using the installed compiler and available Node type definitions.
- Offline behavior contracts: 5 passed.
- Reachable modules in the deterministic offline bundle: 247.
- Two consecutive bundle builds were byte-identical.
- Two consecutive bundle manifests were byte-identical.
- `node --check index.js`: passed.

## Focused v0.9.10 regression

Permanent source-contract and Chromium coverage verifies that:

- the outline uses one non-interactive guide overlay;
- each expanded visible parent contributes one guide element identified by parent UID;
- all guide elements resolve to exactly `1px` width;
- guide X equals the expanded triangle tip/centre;
- guide Y starts immediately below the triangle tip;
- each guide ends at the centre of the last visible descendant marker;
- same-depth guide intervals do not overlap and therefore cannot double-paint;
- the existing blue/orange/green/purple depth cycle remains active;
- canvas node activation changes outline-local `scrollTop` and reveals the matching active row;
- outline activation keeps using `GO_TARGET_NODE` and presents the matching canvas node near the canvas centre;
- hidden canvas-only view does not attempt to scroll the hidden outline.

The focused Chromium run rendered four guides for four expanded parents. Every line measured `1px`; each line X exactly matched its triangle centre. Canvas-to-outline navigation changed outline `scrollTop` to `340` and left the row fully visible. Outline-to-canvas navigation placed the target at effectively zero horizontal and vertical centre offset. Page and console errors were zero.

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
- single-layer outline guide geometry and bidirectional visible-node navigation.

All focused browser runs reported zero page errors and zero console errors.

## Bundle fingerprints

- `index.js` SHA-256: `251864159637f59ba77b463fdb1225653e3aaa391003f51d2cbdde28d7733f76`
- `index.css` SHA-256: `eded18b84ad5454a2a057caf243496b638d2d1ba256c1b6afb009b965411cdab`
- `docs/offline-bundle-manifest-v0.9.10.json` SHA-256: `36de753843b354afb3beac779c0d9cf38e997c7d23699fdbb2308bd3372af21c`

## Formal dependency limitation

A clean `npm ci --ignore-scripts` was attempted in an isolated directory but did not complete within the available network window. A direct fetch of the locked `whatwg-url-14.2.0.tgz` archive failed with a temporary DNS-resolution error. The partial dependency tree was not used, so formal Vitest and Vite commands are not claimed. Strict TypeScript, syntax checks, offline contracts, deterministic bundling and real Chromium interaction gates were executed instead.

## Release archive gate

The release archive must remain flat at the plugin root, exclude `node_modules`, Git data, temporary files, nested ZIPs and user map/settings/checkpoint data, pass ZIP CRC, and pass a fresh-extraction rerun of source, bundle and focused browser gates.
