# YeMind v0.9.16 verification

## Source and structural checks

- Test domain entries: 15 passed.
- Scenario modules: 190 passed.
- Test declarations discovered by the TypeScript AST scan: 571, with 0 skipped/todo declarations.
- TypeScript syntax scan: 332 files passed.
- TypeScript strict check (`tsc --noEmit`): passed.
- Bundle entry syntax (`node --check index.js`): passed.

## Offline behavior and build

- Offline behavior entries: 6 passed.
- Offline production bundle: passed.
- Offline bundle modules: 260.
- Local asset contract: 8 marker groups, 126 markers, 13 clipart categories, 764 clipart items and 28 layouts.
- New clipart geometry: 48px longest edge with proportional fitting.
- Legacy clipart geometry: old 72 × 72 defaults remain repairable.

## Chromium regression

All 17 browser smoke entries passed individually with zero page errors and zero console errors in their final run:

1. Bundle load.
2. Editor and theme rendering.
3. v0.9.3 interactions.
4. v0.9.4 structured outline.
5. v0.9.5 drag compatibility.
6. Historical image-tool compatibility on the new direct image UI.
7. v0.9.6 outline logical drag.
8. v0.9.7 nearest logical drag.
9. v0.9.8 drag-line continuity and editing.
10. v0.9.9 outline guides.
11. v0.9.10 guide synchronization.
12. v0.9.11 node actions, image interaction and relation controls.
13. v0.9.12 local assets.
14. v0.9.13 interaction polish.
15. v0.9.14 summary, geometry and right-drag behavior.
16. v0.9.15/v0.9.16 clipart geometry and migration.
17. v0.9.16 direct image editing.

The v0.9.16 image regression verifies:

- Hover displays only the blue image frame.
- Image click shows eight handles, the top-right image delete button and Replace/Delete toolbar while keeping the node active.
- Clicking text in the same node closes image selection and retains node selection.
- Edge handles resize one axis freely; Shift locks the ratio.
- Corner handles preserve the ratio without Shift.
- Directional cursors match every resize handle.
- Replace opens the existing image dialog.
- Delete key and toolbar Delete remove only the image.
- Image double-click opens the lightbox and does not enter text edit.
- Text double-click enters Quill edit mode and selects the complete text.
- Old hover Delete, resize and magnifier controls are absent.
- Image controls do not start structural node dragging.

## Dependency-server limitation

`npm ci` could not complete because the configured internal npm gateway repeatedly returned HTTP 503 for many package tarballs, including Vitest, Vite, TypeScript, jsdom and runtime dependencies. Consequently, the formal Vitest and Vite commands could not be executed in this environment. This limitation is recorded rather than represented as a pass.

The release instead uses TypeScript strict checking, syntax checks, six offline behavior entries, the 260-module offline production bundle and 17 Chromium regressions as executable verification.

## Final archive and clean extraction

- ZIP CRC: passed.
- Complete extraction: passed.
- Archive contains 548 files in 65 directories.
- `assets/`, `node_modules/`, user map/settings/checkpoint data and nested ZIP files: absent.
- Generated production source maps: absent. The single `docs/build-input/v0.9.0-index.js.map` file is intentionally retained because it is the checked-in offline bundle build input.
- Clean-extraction test domains: 15 passed.
- Clean-extraction scenario modules: 190 passed.
- Clean-extraction TypeScript syntax: 332 files passed.
- Clean-extraction TypeScript strict check: passed.
- Clean-extraction offline behavior entries: 6 passed.
- Clean-extraction offline production bundle: 260 modules passed.
- Clean-extraction bundle entry syntax: passed.
- Clean-extraction source/style synchronization: passed.
- Clean-extraction offline rebuild: byte-identical to the packaged `index.js`.
- Clean-extraction Chromium regressions: all 17 entries passed individually in their final successful run, with zero page errors and zero console errors.

The v0.9.16 direct-image smoke includes an explicit render-settle wait after deleting an image from another node, preventing stale test coordinates while preserving real pointer-driven behavior.
