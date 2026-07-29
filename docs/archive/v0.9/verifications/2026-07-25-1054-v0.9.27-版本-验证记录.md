# YeMind v0.9.27 verification record

## Release identity

- Product: YeMind
- Package/plugin ID: `siyuan-yemind`
- Version: `0.9.27`
- Host baseline: SiYuan `3.7.3`
- Release type: resource-excluded update package for an existing installation

## Implemented contracts

1. Outline markers use the same marker sprite contract as the canvas and are directly clickable/editable.
2. Outline image and clipart preserve single-click editing and double-click shared-lightbox preview.
3. Note, comments, todo, tags, links and outer-frame state expose delegated hover previews.
4. Marker and clipart dialogs use compact custom title bars, explicit close controls and anchor-aware non-covering placement.
5. Note actions are right aligned; Save, custom close and backdrop close persist, while Cancel discards.
6. Canvas clipart single click opens the clipart picker directly without the ordinary replace/delete image overlay; double click remains previewable through click arbitration.
7. Canvas todo prefix uses centered 18px geometry and outline todo no longer has a second outer status frame.
8. Accessory-only refresh keeps marker, image and semantic status synchronized while preserving dirty outline text and selection.

## Test-first evidence

The new v0.9.27 outline-asset unit/offline contracts were introduced before implementation and failed against the v0.9.26 behavior because actionable sprite markers, six-type hover projection, custom anchored dialog contracts, note close autosave and direct clipart editing were absent. During Chromium implementation, a new non-overlap assertion also caught that a canvas clipart dialog was anchored to the pointer point rather than the complete image rectangle. The event now carries the clicked image object, and marker/clipart dialogs use the actual asset bounding rectangle.

## Available automated checks

### Structure and source

```text
node scripts/check-test-structure.mjs
Test structure OK: 15 domains, 208 scenario modules.

node scripts/check-typescript-syntax.mjs
TypeScript syntax OK: 368 files.
```

### Dependency-free runtime suite

```text
node scripts/run-offline-smokes.mjs
14/14 offline entries passed.
```

The v0.9.27 entry confirmed actionable marker sprite markup, no duplicated SVG pattern, compact outline todo geometry and semantic hover rendering.

### Offline release bundle

```text
node scripts/build-offline-bundle.mjs
Built index.js with 269 modules.

node --check index.js
passed
```

### v0.9.27 Chromium integration

```text
marker dialog: 600 × 620 px
clipart dialog: 660 × 620 px
hover preview types: 6
icons after editing dirty outline text: 2
canvas todo vertical center delta: 0.1015625 px
canvas clipart direct picker: passed
note backdrop autosave: passed
page errors: 0
```

The same browser test verified that marker and clipart dialogs do not overlap the clicked outline or canvas asset when the viewport has sufficient room, and that the old selected-image toolbar is not shown for canvas clipart.

### Browser regression

Twenty-seven Chromium smoke scripts completed with clean exits. They covered bundle loading, themes, structured outline, local assets, node actions, image tools, clipart geometry, live width, icon isolation, dark mode, text import, recursive disclosure, drag behavior and the new v0.9.27 asset/dialog flow.

The long-running `smoke-v0918-layout-drag-parity.py` did not complete within the available container execution window. v0.9.27 does not modify its drag-intent or layout engines; the adjacent logical, cross-root, nearest-target, guide, line-editing and image-isolation drag regressions all passed.

## Commands attempted but unavailable or incomplete

### Offline dependency installation

```text
npm ci --offline
ENOTCACHED: whatwg-url-14.2.0.tgz is not present in the npm cache
```

### Vitest

```text
npm test
```

The test-structure precheck passed, then the command stopped because `vitest` is not installed in this container.

### Project TypeScript command

```text
npm run check
```

The project command stopped because the local `@types/node` package is unavailable. A global TypeScript run with the available Node type root continued and found only the existing unrelated issue:

```text
src/core/officialDragIntent.ts(298,42)
OfficialDragRect | null is not assignable to OfficialDragRect
```

No v0.9.27 file appeared in that error.

### Vite build

```text
npm run build
```

The command stopped because local `vite` is unavailable. The repository's dependency-free bundle builder completed successfully instead.

### Fixed resource verification

```text
npm run verify:assets
```

This intentionally failed for the resource-excluded update tree because `assets/clipart/`, `assets/icons/marker-sprite.png`, `assets/layout-thumbnails/` and packaged icon PNGs are not present. Those resources must remain in the user's existing plugin folder during overlay installation.

## Final archive verification

The release ZIP is root-flat and contains `plugin.json` directly at its root. It was created twice from a sorted file list with fixed timestamps and identical bytes. ZIP CRC validation passed. The archive excludes:

- `.git`, `node_modules`, `dist` and caches
- nested ZIP files
- `maps.json`, `settings.json`, `checkpoints.json`
- exported diagnostics and user-created storage
- `assets/clipart/`, `assets/icons/marker-sprite.png`, `assets/layout-thumbnails/`

After extraction into a clean directory, the package again passed:

- 15 domains / 208 scenario modules
- TypeScript syntax scan of 368 files
- all 14 dependency-free offline entries
- 269-module offline bundle generation
- `node --check index.js`
- v0.9.27 Chromium asset/dialog integration
- v0.9.26 import-geometry and disclosure Chromium regression

The rebuilt `index.js` and copied `index.css` were byte-identical to the work-tree release files.

## Manual verification recommended in SiYuan

1. In map, split and outline modes, click existing markers and change/clear them; confirm every view updates immediately.
2. Single-click and double-click ordinary images and clipart in the outline and canvas.
3. Test note autosave by editing and clicking the backdrop, then test Cancel as discard.
4. Hover note, comments, todo, tags, link and outer-frame indicators in light and dark themes.
5. Check marker and clipart dialog placement near all four viewport edges at Windows 100%, 125% and 150% scaling.
6. Confirm existing local clipart, marker sprites and layout thumbnails remain available after overlay installation.
