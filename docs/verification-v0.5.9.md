# YeMind v0.5.9 Verification Report

Date: 2026-07-17

## Scope

v0.5.9 is a diagnostics-only release. It adds local runtime recording, a regression self-check runner, sanitized ZIP export, and global error capture. It does not add or replace map editing, dragging, selection, layout, history, or persistence behavior.

## Automated verification

Commands executed from the plugin source root:

```bash
npm test
npm run check
npm run build
node --check index.js
npm audit --audit-level=low
```

Results:

- Vitest: 75 test files passed.
- Vitest: 178 tests passed.
- TypeScript `tsc --noEmit`: passed.
- Vite production build: passed.
- Production modules transformed: 868.
- Built `index.js`: approximately 2.10 MB, gzip approximately 458.28 KB.
- Built `index.css`: approximately 52.15 KB, gzip approximately 8.88 KB.
- Built source map: approximately 3.99 MB.
- `node --check index.js`: passed.

## Diagnostics-specific coverage

Focused automated tests cover:

- bounded in-memory log retention;
- start and stop recording behavior;
- sensitive-field redaction;
- session-local hashing of map identifiers;
- no node text in default event records;
- global error and unhandled rejection normalization;
- storage probe write/read/remove lifecycle;
- temporary map create, update, checkpoint create, restore, and cleanup;
- map-tree structural integrity;
- checkpoint-to-map reference validation;
- settings and active-editor state reporting;
- sanitized archive contents;
- explicit full-content opt-in archive contents;
- plugin lifecycle registration;
- editor data, view, autosave, toolbar, context-menu, and rich-text traces;
- preservation of the existing native drag lifecycle without adding a `node_dragend` controller.

## Privacy boundary

The default exported archive is designed not to include:

- map titles;
- node text or rich-text HTML;
- comments;
- node links;
- image URLs or local paths;
- checkpoint names;
- raw map or checkpoint identifiers.

Full map content is included only when the user explicitly enables the corresponding checkbox. The UI displays a privacy warning before that export path is used.

The diagnostics service contains no network upload action. Export produces a local ZIP file only.

## Build identity

Verified version surfaces:

```text
package.json       0.5.9
package-lock.json  0.5.9
plugin.json        0.5.9
PLUGIN_VERSION     0.5.9
```

Verified plugin identity:

```text
Plugin ID: siyuan-yemind-zen
Display name: YeMind
```

The production bundle contains the following expected markers:

```text
YeMind 诊断与回归
打开 YeMind 诊断与回归
yemind-diagnostics-<timestamp>.zip
diagnostics-probe.json
```

## Dependency audit

`npm audit` reported three upstream dependency findings:

- one low-severity finding;
- two moderate-severity findings;
- no high-severity findings;
- no critical-severity findings.

The suggested automated fixes would force breaking downgrades or dependency changes in Quill and `simple-mind-map`; they were not applied in this diagnostics-only release.

## Manual SiYuan verification still required

The build environment cannot launch the user's local SiYuan v3.7.2 desktop workspace. The following must therefore be verified in the real application:

1. Open **YeMind → 诊断与回归** from the top menu.
2. Run the regression self-check and confirm that the temporary map and storage probe are removed afterward.
3. Start recording, perform node selection, context-menu actions, toolbar actions, zoom, pan, save, and tab close/reopen, then stop recording.
4. Export the default diagnostics ZIP and confirm that it contains no private map text.
5. Explicitly enable full-content export in a disposable test workspace and confirm the warning and additional file.
6. Trigger a harmless test failure or capture an existing runtime error and verify that the stack appears in the exported report.
7. Restart SiYuan and confirm that diagnostics did not alter maps, checkpoints, settings, or restored tabs.

The generated diagnostics ZIP should be uploaded back for analysis after this real-runtime pass.
