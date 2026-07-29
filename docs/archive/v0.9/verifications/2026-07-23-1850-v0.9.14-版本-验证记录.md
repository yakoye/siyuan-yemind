# YeMind v0.9.14 verification

## Automated verification result

- Test entry files: 15 passed.
- Scenario modules: 188 passed structure validation.
- Test declarations: 559, with no `.skip` or `.todo` declarations. The declaration count is the v0.9.13 verified baseline of 550 plus 9 new v0.9.14 regression tests.
- TypeScript syntax: 329 files passed.
- TypeScript strict check: passed.
- Offline behavior tests: 6 passed.
- Offline production bundle: passed, 259 bundled modules.
- Generated `index.js` syntax: passed.
- Chromium editor/bundle, theme, outline, dragging, image tools, local assets, v0.9.13 interaction polish and v0.9.14 scenario regressions: passed.
- Chromium v0.9.14 page errors: 0.
- Chromium v0.9.14 console errors: 0.

The v0.9.14 browser regression verifies all three reported defects:

1. Non-adjacent sibling nodes produce exactly one native generalization entry with a combined range.
2. Long rich-text nodes and image/custom-content nodes remain within the rendered node frame, including after hidden/visible resize cycles.
3. Right-button dragging in drag-first mode pans without a native selection rectangle or selection mutation, while a stationary right-click still opens the canvas menu.

## Temporarily unavailable formal gates

`npm ci` could not complete because the configured internal npm registry returned HTTP 503 and then remained unavailable during retries. Therefore the formal Vitest runner, formal Vite production build, and their extracted-tree repetitions cannot be claimed as passed in this environment.

The unavailable gates are:

- `npm ci`
- `npm test` / formal Vitest result
- `npm run build` / formal Vite module result
- extracted-tree `npm ci`, Vitest and Vite repetitions

The source and extracted overlay are still checked with TypeScript, offline behavior tests, offline bundling, generated-entry syntax, Chromium regressions, ZIP CRC and exclusion checks.

## Manual SiYuan checks

- Select sibling and cross-branch nodes and add a summary; exactly one editable combined summary must appear.
- Reopen the reported SerDes map, switch tabs, resize and zoom; long text, custom-width nodes and image nodes must stay inside their frames.
- In drag-first mode, right-drag blank canvas and across nodes; the map must pan without a blue selection rectangle or selection changes.
- Right-click without moving; the context menu must still open.

## Overlay verification commands

```bash
unzip -t siyuan-yemind-v0.9.14-overlay.zip
unzip siyuan-yemind-v0.9.14-overlay.zip -d verify-v0.9.14
cd verify-v0.9.14
node scripts/check-test-structure.mjs
node scripts/check-typescript-syntax.mjs
npm run check
node scripts/run-offline-smokes.mjs
node scripts/build-offline-bundle.mjs
node --check index.js
python3 scripts/smoke-v0914-summary-geometry-right-drag.py
```

The overlay intentionally excludes `assets/**`. Install it over a local v0.9.13 tree that retains marker, clipart and layout resources.
