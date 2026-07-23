# YeMind v0.9.13 verification

## Verification summary

- Test structure: 15 domains and 187 registered scenario modules.
- Test declarations: 550, with no `.skip` or `.todo` declarations.
- Independent TypeScript syntax transpilation: 327 source/test files passed.
- Strict TypeScript (`tsc --noEmit`): passed with the system Node 22 type definitions temporarily linked for verification.
- Offline behavior contracts: 6 passed (theme, appearance transaction, outline text, structured outline, drag intent and fixed local assets).
- Deterministic offline production bundle: 258 reachable modules.
- Built entry syntax: `node --check index.js` passed.
- Chromium regression scripts passed for plugin/editor mounting, themes, structured outline, drag interactions, image tools, outline guides, editable relations, local assets and all v0.9.13 interaction fixes. Every reported page-error and console-error count was zero.

## v0.9.13 browser assertions

Chromium directly verified:

- New maps retain the file title `未命名导图`, use `中心主题` as the center node and create two `新节点` children.
- A local marker remains inside a 124 × 34 node; its visible icon is 20 × 20 and the underlying sprite image has no visible bounding box.
- Rich-text measurement elements are hosted under the document body instead of a hidden canvas.
- Structure and Style buttons visibly react to hover.
- The standalone About dialog is available from the top menu and reports v0.9.13.
- Right-clicking a selected node retains a two-node selection and opens the multi-selection menu.
- The active association-line overlay is blue (`#2563eb`) with width 3, while the saved relation remains width 2.
- Project Style renders at 340 × 420 maximum and Node Style at 380 × 410 maximum.
- Image hover controls render delete, preview and resize buttons; preview opens only from the magnifier control.

## Formal npm/Vitest/Vite limitation

A clean dependency request was retried against the configured internal npm gateway. The gateway repeatedly returned HTTP 503, including direct metadata and archive requests. A final `npm ci` attempt therefore cannot complete in this environment. The incomplete dependency tree was not used.

Consequently, this report does **not** claim a fresh formal Vitest run, a Vite production build, a Vite module count, or clean-extraction `npm ci`. The repository still contains those commands as mandatory gates for an environment where the registry is available:

```bash
npm ci
npm test
npm run check
npm run build
node --check index.js
```

## Package verification

The release overlay is verified by:

```bash
unzip -t siyuan-yemind-v0.9.13-overlay.zip
unzip siyuan-yemind-v0.9.13-overlay.zip -d verify-v0.9.13
cd verify-v0.9.13
node scripts/check-test-structure.mjs
node scripts/check-typescript-syntax.mjs
npm run check
node scripts/run-offline-smokes.mjs
node scripts/build-offline-bundle.mjs
node --check index.js
```

The overlay intentionally excludes `assets/**`; it must be extracted over a local v0.9.12 installation that retains the fixed marker, clipart and layout resources.

## Manual SiYuan checks

- Add multiple markers to text nodes and confirm both icon and text stay inside every node frame.
- Hover a node image and use delete, magnifier and resize; click the magnifier and inspect the lighter blurred preview backdrop.
- Select and adjust a relation line and confirm the selected curve remains legible.
- Open Structure and click outside; hover Structure/Style; inspect compact project and node style panels.
- Open the top-bar menu and confirm Settings → About YeMind → Diagnostics.
- Create a map and inspect the file title, center topic and two child topics.
- Multi-select nodes and right-click each selected node.
- Reopen the diagnostic SerDes map and switch between hidden/visible tabs to confirm text nodes do not collapse.
