# YeMind v0.9.23 verification

Date: 2026-07-24

## Scope

v0.9.23 standardizes toolbar and menu icon geometry and fixes dark-theme visibility and interaction states:

- fixed 22 × 22 icon slot;
- proportional artwork constrained to 15 × 15;
- fixed 4px icon-to-label gap;
- exact supplied light Base64 SVG sources retained;
- isolated dark SVG variants for all 14 supplied icons;
- dark outline hover/active/marker states;
- dark top-toolbar hover/active contrast;
- theme-aware detached context menus and floating panels.

## Test-driven development evidence

The new regressions were first run against the v0.9.22 implementation and failed as intended:

1. `tests/offline/iconLayoutDarkV0923SmokeEntry.ts` failed to compile because the old icon module did not export the icon-name contract (`TS2724: no exported member suppliedIconNames`).
2. `scripts/smoke-v0923-icon-grid-dark.py` timed out waiting for `.ymz-icon-slot`, because v0.9.22 did not provide the fixed icon-slot structure.

The implementation was added only after these failures were observed. The same tests now pass.

## Passed automated verification

### Source and dependency-free checks

- `node scripts/check-test-structure.mjs`
  - PASS: 15 domains, 196 scenario modules.
- `node scripts/check-typescript-syntax.mjs`
  - PASS: 347 TypeScript files.
- `node scripts/run-offline-smokes.mjs`
  - PASS: 10 dependency-free smoke entries.
  - The 14 supplied light SVG data URIs retain their exact SHA-256 source contract.
  - All 14 icons expose isolated dark variants.
  - The layout contract reports a 22px slot and 15px artwork.
- `node scripts/build-offline-bundle.mjs`
  - PASS: generated `index.js` from 264 modules.
- `node --check index.js`
  - PASS.

### Chromium integration checks

All 24 `scripts/smoke-*.py` browser regressions passed across the final implementation. Key v0.9.23 results:

- every measured custom icon slot: 22 × 22px;
- every measured supplied icon image: 15 × 15px;
- menu label left-edge spread: 0px;
- native SiYuan menu icons: 22 × 22px with 3.5px internal padding, giving a 15px drawing area;
- hostile host CSS cannot enter the embedded SVG image documents;
- supplied icon elements remain `IMG` nodes with no exposed child SVG paths;
- all 14 dark icons load successfully and contain visible pixels;
- measured average dark-icon luminance: approximately 199.99–235.83;
- no light icon remains visible in dark mode;
- outline normal, hover and active backgrounds are distinct in dark mode;
- active outline text and active top-toolbar controls meet the test contrast threshold;
- light-theme outline hover/active states remain visible;
- double-click text selection and the rich-text toolbar remain functional;
- no Chromium page or console errors were reported by the relevant regressions.

Important browser scripts include:

- `scripts/smoke-v0921-source-icons-rich-toolbar.py`
- `scripts/smoke-v0922-hostile-icon-css.py`
- `scripts/smoke-v0923-icon-grid-dark.py`
- `scripts/smoke-v094-structured-outline.py`
- all established editor, outline, drag, image, history and layout smoke scripts.

## Commands unavailable in this environment

These commands were attempted and were not marked as passing:

- `npm ci --offline`
  - FAIL: npm cache does not contain `whatwg-url-14.2.0.tgz` (`ENOTCACHED`).
- `npm test`
  - structure precheck passes, then FAIL: `vitest: not found`.
- `npm run check`
  - FAIL: TypeScript cannot find the `node` type-definition package.
- `npm run build`
  - FAIL: `vite: not found`.

The dependency-free build, syntax checks, offline entries and real Chromium regressions were therefore used for executable verification.

## Resource-package verification

`node scripts/verify-yemind-assets.mjs` reports the fixed visual resources as missing. This is expected for this resource-excluded update package. The ZIP intentionally does not duplicate:

- `assets/clipart/`;
- `assets/icons/marker-sprite.png`;
- `assets/layout-thumbnails/`;
- the large YeMind icon resources.

Install the ZIP by overwriting an existing complete `siyuan-yemind` plugin directory while preserving its `assets/` directory. The package also excludes `maps.json`, `settings.json`, `checkpoints.json`, diagnostics and other user-created data.

## Manual verification still required in SiYuan

Automated Chromium tests emulate SiYuan variables and menu structures, but the following should be checked in the real application:

1. Default SiYuan dark theme and any installed third-party dark theme.
2. Search, style, structure, theme and line-style controls in normal, hover and active states.
3. Outline rows in normal, hover, selected, focused and drag-target states.
4. First-level and nested context menus, including disabled rows, accelerators and submenu arrows.
5. Node style, marker, clipart, outer-frame, relation and rich-text floating panels.
6. Switching light/dark appearance while an editor or context menu is already open.
7. Windows display scaling settings other than 100%, especially 125% and 150%.

## Version consistency

The following runtime and manifest fields are `0.9.23`:

- `package.json`;
- `package-lock.json`;
- `plugin.json`;
- `src/plugin/constants.ts`;
- `src/releaseInfo.ts`.

`index.css` is synchronized from `src/styles/index.css` and `index.js` is the generated offline bundle.
