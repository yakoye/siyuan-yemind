# YeMind v0.9.24 verification

Date: 2026-07-24

## Scope

v0.9.24 adds structured text import to the outline editor and fixes appearance switching regressions:

- exact outline-node context-menu order and line-only clipboard semantics;
- text-to-map dialog with live preview and mode-specific gray placeholders;
- Unicode tree, Windows Tree, spaces/Tabs, Markdown, numbered outline and plain-line parsing;
- atomic append-under-current or replace-current import;
- new maps start with only the center topic;
- repeated Enter on an empty outline row promotes it one level at a time;
- the direct-child boundary removes the empty row and returns focus to the center topic;
- the rich-text formula action uses SiYuan's `iconMath` SVG instead of the `π` character;
- light/dark appearance refresh preserves the exact viewport transform and active selection;
- hidden or zero-size editors defer full appearance rerendering;
- Theme and Line controls, text, icons, native selects and option lists are dark-aware.

## Test-driven development evidence

The v0.9.24 regressions were written before the implementation and failed against the v0.9.23 baseline:

1. `node scripts/check-test-structure.mjs` failed because the new permanent scenario modules had not yet been imported by their domain specs.
2. `node scripts/run-offline-smokes.mjs` failed to compile because `outlineTreeImport` and its parser contract did not yet exist.
3. `scripts/smoke-v0924-outline-import-dark.py` failed because the outline menu, import dialog and dark-control contracts were absent.

Implementation began only after those RED results were observed. The same tests now pass.

## Passed automated verification

### Source, syntax and dependency-free checks

- `node scripts/check-test-structure.mjs`
  - PASS: 15 domains, 201 permanent scenario modules.
- `node scripts/check-typescript-syntax.mjs`
  - PASS: 355 TypeScript files.
- `node scripts/run-offline-smokes.mjs`
  - PASS: 11 dependency-free smoke entries.
- `node scripts/build-offline-bundle.mjs`
  - PASS: generated `index.js` from 266 modules.
- `node --check index.js`
  - PASS.
- `git diff --check`
  - PASS.

The v0.9.24 offline entry verifies parser availability, center-only defaults, viewport restoration, the formula icon, the outline menu contract and dark Theme/Line controls.

### v0.9.24 Chromium integration

`scripts/smoke-v0924-outline-import-dark.py` passes with these observed contracts:

- exact 14-row context-menu order;
- exactly three separators;
- Unicode mode shows a gray tree placeholder without writing it into the source text;
- the PCIe sample previews the expected parent/child structure;
- repeated empty-row Enter depths are `[4, 4, 3, 2, 1]`;
- a first-level empty row is removed at the root boundary and focus returns to the root;
- “剪切（当前行）” clears only the current node text and preserves its subtree;
- light → dark appearance switch root-position delta: `0.0px`;
- Theme and Line native selects both report dark `color-scheme`.

The established icon regression also passes after the new changes:

- fixed 22 × 22px slots and 15 × 15px proportional artwork;
- all 14 supplied dark icons contain visible pixels;
- no light icon remains visible in dark mode;
- dark outline normal, hover and active states remain distinct;
- active toolbar controls remain visible.

### Established browser regressions

Twenty-four browser scripts complete cleanly against the final implementation, covering bundle loading, editor appearance, outline synchronization, node actions, local assets, rich text, image editing, context menus, dark icons, structured outline, drag intent and guide geometry.

`smoke-v0918-layout-drag-parity.py` is not counted as a clean process pass in this environment. Its assertion body was observed to complete successfully in an instrumented run—including all nine layout-parity checks, mirrored fishbone geometry and zero page/console errors—but Chromium/Playwright teardown did not exit before the container timeout. This is recorded as an environment/process-cleanup limitation rather than an assertion failure.

## TypeScript compiler status

A globally available TypeScript compiler was run with an available Node type root. It reaches the source tree and reports one pre-existing error:

```text
src/core/officialDragIntent.ts(298,42): error TS2345:
Argument of type 'OfficialDragRect | null' is not assignable to parameter of type 'OfficialDragRect'.
```

No new v0.9.24 file is named in that compiler error. The repository's dependency-free TypeScript syntax scan passes all 355 files.

## Commands unavailable in this environment

These commands were attempted and are not marked as passing:

- `npm ci --offline`
  - FAIL: npm cache lacks `whatwg-url-14.2.0.tgz` (`ENOTCACHED`).
- `npm test`
  - the 15-domain/201-scenario structure precheck passes, then FAIL: `vitest: not found`.
- `npm run check`
  - FAIL: TypeScript cannot find the `node` type-definition package in the project installation.
- `npm run build`
  - FAIL: `vite: not found`.

The dependency-free compiler, syntax scanner, offline entries and real Chromium regressions are therefore the executable verification path for this package.

## Resource-package verification

This remains a resource-excluded overwrite package. It intentionally does not duplicate:

- `assets/clipart/`;
- `assets/icons/marker-sprite.png`;
- `assets/layout-thumbnails/`;
- user files such as `maps.json`, `settings.json`, `checkpoints.json` and diagnostics.

Install by overwriting an existing complete `siyuan-yemind` plugin directory while preserving its existing `assets/` directory and user data.

## Manual verification still required in SiYuan

1. Paste the full PCIe RAS Unicode tree and a real Windows `tree` listing, then compare the preview and final hierarchy.
2. Check both insertion policies and Undo/Redo as one operation.
3. Exercise copy, line-only cut, rich paste and plain-text paste at different caret positions.
4. Verify repeated empty-row Enter, Tab, Shift+Tab, Shift+Enter and Chinese IME composition.
5. Switch light/dark appearance repeatedly in map, split and outline views after manual pan/zoom.
6. Open Theme or Line while switching appearance and confirm text, icons, selects and dropdown options update immediately.
7. Repeat the appearance checks with representative third-party themes and Windows scaling at 125%/150%.
8. Confirm hidden/background tabs refresh after they become visible and do not shift their map viewport.

## Deliberately deferred

Compact outline indicators for standalone node images, marker icons, clipart, notes and links are not included in v0.9.24. They remain a planned follow-up so the exact context-menu contract and stable one-line outline geometry are not expanded in this release.

## Version consistency

The following runtime and manifest fields are `0.9.24`:

- `package.json`;
- `package-lock.json`;
- `plugin.json`;
- `src/plugin/constants.ts`;
- `src/releaseInfo.ts`.

`index.css` is synchronized from `src/styles/index.css`, and `index.js` is the generated 266-module offline bundle.
