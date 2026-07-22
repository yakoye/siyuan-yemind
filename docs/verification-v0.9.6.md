# YeMind v0.9.6 verification

## Release scope

v0.9.6 stabilizes unified-outline keyboard editing and dragging, fixes empty-node deletion and the blank font field, and rebuilds right-growing logical-structure canvas dragging around live destination displacement and one candidate-parent dashed link. Canvas insertion lines and no-target Root fallback are removed for this layout.

The release does not change persisted map, settings or checkpoint schemas. Accepted edits and moves retain existing UIDs, descendants and node metadata.

## Source and catalog gates

- Theme generator: 19 source themes -> 25 appearance definitions.
- Public theme catalog: 22 schemes in Basic, Colorful and Classic groups.
- Test structure: 15 domains / 171 scenario modules.
- Test declarations registered in TypeScript suites: 509.
- TypeScript source/test syntax: 301 files passed.
- Strict TypeScript `--noEmit`: passed.
- Offline behavior contracts: theme catalog, atomic appearance refresh, outline-text import, structured outline and drag intent passed.
- Offline bundle: 246 reachable modules.
- `node --check index.js`: passed.
- Consecutive offline bundle builds produced byte-identical `index.js` and v0.9.6 manifest files.

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
- 601-node bulk paste (approximately 0.34 seconds in this environment).
- Existing image preview/delete/resize behavior and structural-drag isolation.

### v0.9.6 outline coverage

- Complete 22px indentation-cell drag source and four-direction `move` cursor.
- Black 7px branch triangles and black 5px leaf squares.
- Enter creates/splits a sibling and leaves the new row focused and editable.
- Shift+Enter retains an inline soft break.
- Deleting the final character leaves one empty row; a second Backspace removes the row.
- The preceding row remains unchanged and receives no browser-generated empty paragraph or `<br>`.
- Inherited selection typography displays `默认字体`.
- Whole-row upper/lower drop resolution remains stable through row gaps.
- YeMind-green BEFORE, child-depth and parent-aligned guides.
- Text-body pointer drag remains text selection, not structural drag.
- Escape cancellation performs no structural mutation.

### v0.9.6 right-logical canvas coverage

- Neutral space shows no guide and performs no move.
- BEFORE and AFTER resolve through target row halves and preserve the common parent.
- CHILD resolves only through the explicit right-tail target and uses the target node as parent.
- The only valid preview is one green `6 6` dashed candidate-parent link.
- No canvas insertion line, origin line or no-target Root fallback is displayed.
- Destination siblings or children move during preview to expose the pending slot.
- Accepted moves preserve metadata and undo in one step.
- Escape cancellation restores preview transforms and performs no mutation.
- Browser page errors: 0; browser console errors: 0.

## Image action regression

- Preview, delete and resize action boxes remain 25 × 25px.
- Delete SVG remains visually balanced against the magnifier inside the unchanged action box.
- Preview/delete/resize pointer sequences do not start structural dragging.
- Browser page errors: 0; browser console errors: 0.

## Dependency-gated commands

A clean npm dependency installation was attempted in an isolated directory. The configured internal package gateway returned HTTP 503 for `whatwg-url-14.2.0.tgz`; a direct request to that exact package archive also returned HTTP 503. The clean installation could not complete.

Therefore this report does **not** claim a fresh formal Vitest run or Vite production build. The repository retains those commands as release gates for an environment where the registry is available. Strict TypeScript, deterministic offline bundling, offline contracts and real Chromium interaction tests were executed instead and are recorded above.

## Bundle hashes before packaging

- `index.js`: `5e7234b9804ac9298869ac5c8ea927334e85f6adcd3308f75e30e7321329a2eb`
- `docs/offline-bundle-manifest-v0.9.6.json`: `1bbb5e1c96e42acee2a0004cdd95339ebbe4444222b5d783302c0229d6798a8d`

Package CRC, extraction, repeat-build comparison, extracted-browser gates, archive entry count, archive size and final SHA-256 are recorded after the final release archive is produced and reported with the downloadable artifact.
