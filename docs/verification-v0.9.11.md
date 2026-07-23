# YeMind v0.9.11 verification

## Source and generated-data gates

- Theme generator: 19 source themes -> 25 appearance definitions.
- Public theme presets: 22, grouped as Basic 3 / Vivid 10 / Classic 9.
- Test manifest structure: 15 domains and 179 scenario modules.
- Registered test declarations: 532 `it()` / `test()` calls.
- TypeScript syntax transpilation: 311 source/test files passed.
- Strict TypeScript: `tsc --noEmit` passed.
- Offline behavior contracts: 5/5 passed (theme, atomic appearance, outline text, structured outline and drag intent).
- Production bundle: 248 reachable modules.
- `node --check index.js`: passed.
- Consecutive offline bundle builds: `index.js` and manifest byte-identical.

## Focused v0.9.11 regression

Chromium verified the following against the generated bundle:

- Canvas and outline formatting toolbars stay hidden during pointer selection and appear after selection completes.
- The saved `Alpha` range survived native font/size control focus; `serif` and `18px` were applied to the original selection.
- Default/inherited font and size fields remain visibly labelled rather than blank.
- Single image click selected the containing node and pinned image controls.
- Double image click opened the in-editor lightbox; outside click unpinned controls.
- Image preview, delete and resize controls did not start structural node dragging.
- Project Style opened directly below the toolbar trigger; Node Style opened beside the right-click point.
- Both style surfaces resolved to 400 x 440 px in the test viewport and remained viewport-clamped.
- The single-node context menu matched the requested item order and shortcuts.
- The Add submenu distinguished node `链接` from selection-scoped `行内链接`, with `行内链接` after `公式`.
- The multi-selection and blank-canvas menu source contracts were registered separately.
- The first node quick-action circle touched the rendered node border with a 0 px exterior gap.
- Association-line creation completed without delayed-probe exceptions.
- Selecting an association line exposed two native Bezier control circles and tangent-aligned `auto-start-reverse` marker orientation.
- Page errors: 0. Console errors: 0.

## Historical browser regression

The release reran the existing bundle/editor, v0.9.3 interaction, v0.9.4 outline, v0.9.5 drag/image, v0.9.6 outline/right-logical drag, v0.9.7 nearest-node drag, v0.9.8 edge/editing and v0.9.9/v0.9.10 guide/navigation Chromium scenarios.

Covered behavior includes themes, dark mode, rainbow lines, Root fill, hover actions, continuous outline selection, two-stage Ctrl/Cmd+A, rich/plain paste, 34-node import, 601-node bulk paste, Enter splitting, empty-node deletion, outline drag, right-logical drag, continuous candidate-parent preview, unaffected solid edges, flat canvas editing, one-pixel guide ownership, and canvas/outline bidirectional reveal.

## Formal npm/Vitest/Vite gate

A clean `npm ci --ignore-scripts` was attempted in an isolated directory. The internal package gateway returned:

```text
503 Service Temporarily Unavailable
GET .../whatwg-url/-/whatwg-url-14.2.0.tgz
```

Therefore the formal installed-dependency Vitest and Vite commands could not be executed in this environment. This document does not claim those commands passed. Strict TypeScript, syntax transpilation, offline contracts, deterministic bundling and real Chromium interactions were executed instead.

## Release package

- File: `siyuan-yemind-v0.9.11.zip`
- Flat-root install contract: passed.
- ZIP CRC: passed.
- Excludes `node_modules`, Git data, temporary workspaces, nested ZIPs and user `maps.json`, `settings.json`, `checkpoints.json`.
- File count: 489.
- Size: reported in the final handoff after archive creation.
- SHA-256: reported in the final handoff after archive creation.
- Bundle SHA-256: `2d6d725ed427fdd566421e7c72061366fdad37aede03262420c03088515bf41e`.
- Bundle manifest SHA-256: `065083ff89d5adf4ff667b93fc21fa1585c2105baac16a90399ba0ba349341f3`.
- Root CSS SHA-256: `72758671155aca5ec739b3582f26b529b094398be42c99cd3360cc8986de56ea`.

A clean extraction reruns the critical generator, structure, syntax, strict-TypeScript, offline, deterministic-build, plugin-load, editor, v0.9.11 interaction and historical regression gates. The rebuilt bundle and manifest must be byte-identical to the package before release.
