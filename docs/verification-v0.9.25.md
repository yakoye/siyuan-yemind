# YeMind v0.9.25 verification

Date: 2026-07-24

## Scope

v0.9.25 addresses four user-reported areas:

- keep the Text to Mind Map dialog inside the screen and make both panes internally scrollable;
- show processed parsed hierarchy on the right instead of repeating the source tree syntax;
- wrap newly imported long labels at a default 280px content width without inserting line breaks, while preserving later user width changes;
- unify dark Theme/Line/Structure/Style/Saved states and project-choice panels;
- display and add node icons, images and clipart from the structured outline without copying node background or border decoration.

## Test-driven development evidence

The v0.9.25 permanent contracts were created before the implementation:

- `tests/suites/ui-shell/v0925ImportDialogAndDarkPanels.suite.ts`;
- `tests/suites/outline-split/v0925ImportWidthPolicy.suite.ts`;
- `tests/suites/outline-split/v0925OutlineAccessories.suite.ts`;
- `tests/offline/importDialogOutlineContentV0925SmokeEntry.ts`;
- `scripts/smoke-v0925-import-dark-outline-content.py`.

Against the v0.9.24 baseline, the new dependency-free checks first failed on the missing fixed dialog/processed-preview contract and then on the missing custom project panels and outline accessory model. Implementation began after those RED results. The same checks now pass.

## Passed source and dependency-free checks

- `node scripts/check-test-structure.mjs`
  - PASS: 15 domains / 204 permanent scenario modules.
- `node scripts/check-typescript-syntax.mjs`
  - PASS: 361 TypeScript files.
- `node scripts/run-offline-smokes.mjs`
  - PASS: 12 dependency-free runtime entries.
- `node scripts/build-offline-bundle.mjs`
  - PASS: generated `index.js` from 268 modules.
- `node --check index.js`
  - PASS.

The v0.9.25 offline runtime entry verifies actual parser output, long-label width data, original-text preservation, custom panel source contracts, accessory extraction and structured-outline projection.

## v0.9.25 Chromium result

`scripts/smoke-v0925-import-dark-outline-content.py` passes with these observed values:

```text
dialog: 980 × 696 in a 1280 × 760 viewport
processed preview rows: 4
outline accessories: visible
outline Add submenu: 图标 / 剪贴图 / 图片
long imported node width: 280
customTextWidth: 280
source newline inserted: no
dark project panel background: rgb(34, 37, 43)
visible native Theme/Line select: none
```

The preview contains the original node labels but no `├─`, `└─` or `│` source glyphs.

## Previous-contract Chromium results

The final bundle was exercised by all 26 retained `scripts/smoke-*.py` regressions. Each script passes when run individually, covering:

- bundle loading and versioned About information;
- all layouts, left/right fishbone parity and cross-root dragging;
- structured outline editing, synchronization, guide geometry and logical drag;
- node context menus, rich text, summary geometry and selection ownership;
- local marker/clipart/layout assets;
- image preview, replacement, direct selection, resize and delete;
- exact supplied SVG isolation and all dark-icon pixel checks;
- v0.9.24 text import, line-only cut, repeated Enter promotion and `0.0px` dark-switch root drift;
- v0.9.25 dialog, width, dark project panel and outline accessory behavior.

One combined sequential shell run accumulated Chromium processes and reached its timeout at `smoke-v0918-layout-drag-parity.py`; the same script passes as a standalone run with all nine layout checks, mirrored fishbone geometry and zero page/console errors. Verification therefore records per-script standalone results rather than treating the resource-accumulating batch shell as a product failure.

## TypeScript compiler status

The project-local compiler cannot run because dependencies are unavailable. A globally available compiler was also run with an available Node type root and reaches the full source tree. It reports one pre-existing error:

```text
src/core/officialDragIntent.ts(298,42): error TS2345:
Argument of type 'OfficialDragRect | null' is not assignable to parameter of type 'OfficialDragRect'.
```

No new v0.9.25 file is named by that error. The dependency-free syntax scan passes all 361 TypeScript files.

## Commands attempted but unavailable

These commands were actually attempted and are not marked as passing:

- `npm ci --offline`
  - FAIL: npm cache lacks `whatwg-url-14.2.0.tgz` (`ENOTCACHED`).
- `npm test`
  - the 15-domain / 204-scenario structure precheck passes, then FAIL: `vitest: not found`.
- `npm run check`
  - FAIL: project installation lacks the `node` type-definition package.
- `npm run build`
  - FAIL: `vite: not found`.

The executable verification path in this environment is the source scanner, manifest checker, 12 dependency-free runtime entries, 268-module offline builder and real Chromium regressions.

## Final archive re-extraction

The deterministic archive was extracted into a clean directory. The extracted copy passed:

- 15-domain / 204-scenario structure validation;
- 361-file TypeScript syntax scan;
- all 12 dependency-free runtime entries;
- `node --check index.js`;
- v0.9.24 and v0.9.25 Chromium integration smokes;
- a fresh 268-module offline rebuild.

The rebuilt `index.js` and synchronized `index.css` have exactly the same SHA-256 values as the files originally stored in the archive. ZIP CRC validation and forbidden-file scanning also pass.

## Resource-package boundary

The release remains a resource-excluded overwrite package. It intentionally does not duplicate:

- `assets/clipart/`;
- `assets/icons/marker-sprite.png`;
- `assets/layout-thumbnails/`;
- `maps.json`, `settings.json`, `checkpoints.json`, diagnostics or other user-created storage.

Install by overwriting an existing complete `siyuan-yemind` plugin directory while preserving its existing `assets/` directory and user data.

## Manual verification still required in SiYuan

1. Paste the full PCIe RAS tree and confirm the fixed dialog remains within the screen while both panes scroll independently.
2. Compare the processed preview with the created hierarchy for Unicode Tree, Windows Tree, indentation, Markdown and numbered input.
3. Import mixed Chinese/English long labels, then manually resize one node and confirm the custom width survives save/reopen.
4. Check Structure, Theme, Line, Style and Saved in built-in and third-party dark themes, including panel hover, selected, focused and disabled states.
5. Keep Theme or Line open while switching light/dark appearance and confirm the panel updates without a white native option popup.
6. From the outline, add/replace/delete an image and add/remove marker icons and clipart; confirm the canvas and outline remain synchronized.
7. Confirm outline rows do not inherit canvas node background, border, shape or branch-line styling.
8. Repeat at Windows display scaling 125% and 150%.
