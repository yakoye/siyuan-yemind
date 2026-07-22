# YeMind v0.9.8 verification

## Release scope

This release preserves unaffected solid tree edges while right-logical room-making previews are active and removes the stacked focus frames from canvas node text editing.

## Source and contract checks

- Theme generator: 19 source themes produced 25 appearance definitions.
- Public theme presets: 22.
- Test structure: 15 domains / 173 scenario modules.
- Registered suite declarations: 514.
- TypeScript syntax: 304 source and test files.
- Strict TypeScript: passed.
- Offline behavior contracts: 5 passed.
- Reachable modules in the deterministic offline bundle: 247.
- Two consecutive bundle builds were byte-identical.
- Two consecutive bundle manifests were byte-identical.
- `node --check index.js`: passed.

## Focused v0.9.8 regression

The permanent unit/offline/Chromium coverage verifies that:

- room-making hides only the original incoming edge of each shifted root;
- every unrelated solid parent-child edge remains visible;
- temporary incoming-edge overlays keep the parent endpoint fixed and move the child endpoint with the preview layout;
- the dragged subtree root still uses the continuous green candidate-parent dashed guide;
- changing candidates or pressing Escape removes temporary overlays and restores original edge visibility;
- canvas node editing adds no editor border, outline or box shadow;
- the caret, native text selection and the node's existing theme/selection shell remain available.

The focused Chromium run observed four baseline solid Root edges, three unaffected solid edges while one sibling was dragged, three unaffected edges after switching to a CHILD candidate, and four restored solid edges after Escape. The parent guide switched paths without disappearing. Page errors and console errors were both zero.

## Browser regression

The following browser gates passed against the generated bundle:

- plugin bundle loading and repository bootstrap;
- editor/SVG mount, 22 themes, theme/rainbow/dark appearance refresh;
- Root fill and hover `+ / -` interaction bridge;
- unified structured outline, staged select-all, clipboard, 34-node import and 601-node bulk paste;
- outline drag, Enter splitting, two-stage empty-node deletion and default-font presentation;
- image preview/delete/resize sizing and structural-drag isolation;
- continuous nearest-node right-logical candidate guide, room-making, sibling/child moves, metadata preservation, undo and Escape;
- v0.9.8 solid-edge continuity and flat canvas editing.

Historical v0.9.5 and v0.9.6 drag smoke entry points now delegate to the current v0.9.7 superset because their former neutral-gap/no-guide expectations were intentionally replaced by the continuous candidate-parent guide contract.

## Bundle fingerprints

- `index.js` SHA-256: `78d80d0eb7c9e7f520d8f05cfb4c1b8270d1fecc4ae5488d6c66c52cb3f2dba4`
- `index.css` SHA-256: `a1316fba370336b50ec7e7c8194c05e42c811098a5cd28c6ac0638a1dac06c71`
- `docs/offline-bundle-manifest-v0.9.8.json` SHA-256: `36de753843b354afb3beac779c0d9cf38e997c7d23699fdbb2308bd3372af21c`

## Formal dependency limitation

A clean `npm ci --ignore-scripts` was attempted with retries disabled. The internal npm gateway returned HTTP 503 for `whatwg-url-14.2.0.tgz` and multiple Vitest/Vite dependency archives. Therefore this environment could not execute the repository's formal Vitest or Vite commands, and this report does not claim that they ran. Strict TypeScript, offline contracts, deterministic bundling and real Chromium interaction gates were executed instead.

## Release archive gate

The final archive must be flat at the plugin root, exclude `node_modules`, Git data, temporary build directories, nested ZIP files and user map/settings/checkpoint data, and pass a fresh-extraction rerun of the source, deterministic bundle and browser gates. Final archive size, entry count and SHA-256 are recorded after that clean-extraction gate.
