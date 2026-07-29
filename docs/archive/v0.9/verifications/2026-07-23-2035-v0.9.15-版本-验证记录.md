# YeMind v0.9.15 verification

## Automated verification result

- Test entry files: 15 passed structure validation.
- Scenario modules: 189 passed structure validation.
- Test declarations: 563 `it(...)` declarations, with no `.skip` or `.todo` declarations.
- TypeScript syntax: 331 files passed.
- TypeScript strict check: passed using the available global TypeScript and Node type definitions.
- Offline behavior entries: 6 passed.
- Corrected asset tree/catalog comparison: 764 paths matched exactly, with 0 missing, 0 extra and 0 duplicates.
- Offline production bundle: passed, 260 bundled modules.
- Generated `index.js` syntax: passed.
- Chromium smoke entries: 16 passed, including bundle load, editor/theme, structured outline, drag interactions, image tools, local assets, v0.9.13 interaction polish, v0.9.14 summary/geometry/right-drag and v0.9.15 clipart geometry.
- Chromium v0.9.15 clipart smoke: page errors 0, console errors 0.

The v0.9.15 browser regression verifies:

1. A legacy clipart node with the old custom `72 × 72` size is repaired to `72 × 36` for a 2:1 SVG and receives geometry version 2.
2. A portrait clipart selected from the real picker is stored and rendered as `36 × 72` for a 1:2 SVG.
3. Ordinary images without `yemindClipartId` are not migrated.
4. Manually resized clipart whose size is not the old default square is not migrated.
5. The corrected 13-category, 764-item catalog remains available through the normal picker.


## Packaged archive verification

- ZIP CRC: passed.
- Complete extraction: passed.
- Fixed `assets/**` exclusion: passed.
- Nested ZIP, `node_modules` and user-data exclusion: passed.
- Extracted test structure: 15 domains and 189 scenario modules passed.
- Extracted TypeScript syntax: 331 files passed.
- Extracted TypeScript strict check: passed.
- Extracted offline behavior entries: 6 passed.
- Extracted offline production bundle: passed with 260 modules.
- Extracted rebuild of `index.js`: byte-identical to the packaged entry.
- Extracted generated-entry syntax: passed.
- Extracted v0.9.14 summary/geometry/right-drag Chromium regression: passed.
- Extracted v0.9.15 proportional clipart Chromium regression: passed with 0 page errors and 0 console errors.

## Temporarily unavailable formal gates

The environment could not complete a fresh dependency installation. Online package access was unavailable, while `npm ci --offline` reported that `whatwg-url-14.2.0.tgz` was not present in the local cache. Therefore these formal gates cannot be claimed as passed here:

- fresh `npm ci`
- formal Vitest execution through `npm test`
- formal Vite production build through `npm run build`
- their extracted-tree repetitions

The release is instead verified with strict TypeScript, offline behavior execution, offline production bundling, generated-entry syntax, 16 Chromium smoke entries, catalog/tree comparison, ZIP CRC and extracted-tree rebuild checks.

## Manual SiYuan checks

- Insert a visibly wide clipart, a tall clipart and a square clipart from the corrected local asset set; none should be stretched.
- Reopen the map shown in the report. Existing v0.9.14 clipart nodes should repair to their original ratios after the first render.
- Manually resize a clipart, close and reopen the map; the manual size must remain unchanged.
- Confirm pasted, dropped and file-selected ordinary images remain unaffected.
- Confirm the repaired node frame still encloses the clipart and node text correctly.

## Resource-excluded update verification

```bash
unzip -t siyuan-yemind-v0.9.15.zip
unzip siyuan-yemind-v0.9.15.zip -d verify-v0.9.15
cd verify-v0.9.15
node scripts/check-test-structure.mjs
node scripts/check-typescript-syntax.mjs
tsc --noEmit --typeRoots /opt/nvm/versions/node/v22.16.0/lib/node_modules/ts-node/node_modules/@types
node scripts/run-offline-smokes.mjs
node scripts/build-offline-bundle.mjs
node --check index.js
python scripts/smoke-v0914-summary-geometry-right-drag.py
python scripts/smoke-v0915-clipart-geometry.py
```

The archive intentionally excludes `assets/**` and must be merged into the local project that contains the corrected clipart files.
