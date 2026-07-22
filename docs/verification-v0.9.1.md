# YeMind v0.9.1 verification

Date: 2026-07-22  
Host acceptance baseline: SiYuan 3.7.3

## Scope

- complete layered color definitions for the supplied 19 named themes;
- three base themes with independent light and dark appearances;
- 22 public theme entries backed by 25 runtime appearance definitions;
- separate center, first-level, second-level and ordinary-node colors;
- separate connection colors for the three parent-child depth ranges;
- 1, 3, 4 and 6-color branch cycles;
- local node style precedence and non-persistent generated fallbacks;
- JSON-to-TypeScript generation before development, checks, tests and builds.

## Immutable source data

The two supplied source files were copied byte-for-byte into `docs/theme-colors/`.

```text
yemind_theme_colors.json  SHA-256 894ab5b300c7053449f9dcc51f7a19761e75336c4ac23a236615440beb2a3934
yemind_theme_colors.md    SHA-256 13bee1a56619d50557476ec5e5ed5ff7dd61df97810550953cdac9c518140f24
```

The generator reports 19 source themes and emits 25 appearance definitions. Re-running it produces the same `src/core/themeColorData.ts` hash.

## Completed automated verification

```text
Theme source records: 19 passed
Generated appearances: 25 passed
Public theme presets: 22 passed
Theme groups: 3 base + 10 vivid + 9 classic passed
Branch cycle lengths: 1, 3, 4 and 6 passed
Test structure: 15 domains, 161 scenario modules passed
TypeScript strict check: passed
TypeScript source/test syntax transpilation: 281 files passed
Built index.js syntax: passed
Offline release bundle: 243 modules
```

The dedicated theme runtime regression additionally verified:

- source name order and all required color fields;
- all center, first-level, second-level and ordinary-node text/background colors;
- all three connection depth colors;
- branch-cycle repetition;
- generated fallback properties remain non-enumerable;
- explicit node text, background and line colors remain higher priority;
- an explicit project rainbow setting owns line colors without removing node colors.

## Browser runtime verification

The built plugin bundle was evaluated in a real headless Chromium process with a minimal SiYuan host mock.

```text
Plugin export: YeMindPlugin passed
Plugin bootstrap and repository initialization: passed
Map creation: passed
Editor mount: passed
Canvas SVG mount: passed
Theme options: 22 passed
Theme groups: 基础 3 / 缤纷 10 / 经典 9 passed
Theme switch: YeMind 默认 -> 晨曦 passed
Theme persistence: scheme-dawn passed
Page errors: 0
Console errors: 0
```

## Build path used for this release

The package registry returned HTTP 503 for packages including `whatwg-url`, Vitest, Vite, TypeScript types and runtime dependencies. A clean `npm ci` therefore could not finish in this environment, so this report does not claim a formal Vitest run or a formal Vite production build for v0.9.1.

The release bundle was instead generated from:

1. the current v0.9.1 TypeScript sources;
2. the exact dependency source contents embedded in the formally verified v0.9.0 production Source Map;
3. the new deterministic offline bundle script in `scripts/build-offline-bundle.mjs`.

The v0.9.0 build-input Source Map is stored under `docs/build-input/`; no mismatched `index.js.map` is published beside the v0.9.1 runtime bundle. The resulting bundle passed syntax, plugin-load, bootstrap, editor-mount and theme-persistence checks in Chromium.

## Release contract

```text
plugin.json.name: siyuan-yemind
plugin.json.version: 0.9.1
plugin.json.minAppVersion: 3.7.3
package.json.name: siyuan-yemind
package.json.version: 0.9.1
package-lock.json version: 0.9.1
runtime version: 0.9.1
```

The release archive is flat and excludes `node_modules`, `.git`, temporary build directories, user `maps.json`, `settings.json`, `checkpoints.json` and nested ZIP files.

## Extracted archive second pass

The flat release ZIP was extracted into a new directory and verified independently.

```text
Archive entries: 458
Forbidden entries: 0
Root plugin.json/index.js/index.css: passed
Theme generation: passed
Test structure: 15 domains, 161 scenario modules passed
TypeScript strict check: passed
Deterministic bundle rebuild: byte-identical passed
Theme runtime regression: passed
Chromium plugin load and bootstrap: passed
Chromium editor and SVG mount: passed
Chromium 晨曦 theme switch and persistence: passed
```

## Remaining host-specific acceptance

This environment cannot launch the user's actual SiYuan desktop workspace. Installation, real workspace storage migration and mouse-level visual comparison in SiYuan remain host-specific checks; they are not represented as completed here.
