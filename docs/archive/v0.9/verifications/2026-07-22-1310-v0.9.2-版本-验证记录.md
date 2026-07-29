# YeMind v0.9.2 verification

Date: 2026-07-22

## Release scope

v0.9.2 extends the complete theme model with center, first-level, second-level and normal-node border colors. It also replaces the independent theme and rainbow refresh paths with one atomic whole-map appearance transaction.

The release does not change map structure, node UIDs, command history, settings, checkpoints or storage schemas.

## Authoritative theme data

The checked-in sources are:

- `docs/theme-colors/yemind_theme_colors_with_borders.json`
- `docs/theme-colors/yemind_theme_colors_with_borders.md`

The JSON source uses schema version 2 and contains the 19 named themes in the required order. Every record contains map background, center text/fill/border, branch cycle length and six branch records. Every branch record contains text, fill, border and parent-child line colors for first-level, second-level and normal nodes.

The current 19 supplied border records are explicit `transparent` values. YeMind Default continues to use its own visible light/dark borders; Ink Branch and Material 3 Basic use their complete base-theme definitions.

## Refresh architecture

The former flow updated theme and rainbow configuration separately and then requested a cached partial render. Two engine behaviors made that unreliable:

1. `setThemeConfig(..., true)` and `updateConfig()` update configuration without drawing.
2. `updateConfig()` deep-merges arrays, so a new rainbow palette could be appended to the old palette instead of replacing it.

v0.9.2 applies appearance through one transaction:

1. configure per-level theme text, fill, border and optional line fallbacks;
2. replace theme configuration without an intermediate draw;
3. replace the rainbow palette with exact array semantics;
4. perform one complete `reRender(..., "changeTheme")`;
5. restore active nodes and redraw relation lines, outer frames, quick actions and selection presentation.

The transaction never calls the rainbow plugin command that writes colors into node data. Theme switching therefore does not erase node-local line colors, add command-history entries or serialize generated theme colors as local styles.

## Executed source gates

- Theme generator: passed.
- Generator determinism: three consecutive generated-file SHA-256 values were identical.
- Theme source: schema version 2, 19 names/order and all required border fields passed.
- Runtime appearances: 22 public themes and 25 concrete light/dark/fixed definitions passed.
- Branch cycles: 1, 3, 4 and 6 colors, including branch 7/8 wraparound, passed.
- Node-local text, fill, border and line priority passed.
- Test structure: 15 feature domains and 162 registered scenario modules passed.
- Registered regression declarations: 467 `it`/`it.each` cases across the test tree.
- TypeScript strict check (`tsc --noEmit`): passed.
- Independent TypeScript syntax transpilation: 284 non-declaration source/test files passed.
- JavaScript/MJS syntax checks: passed.

## Focused runtime gates

Two standalone offline contract bundles passed:

- complete theme data, border coverage, branch cycling, serialization protection and local-style priority;
- exact rainbow replacement, one complete redraw, selection restoration, call order and latest-transaction ownership.

The production offline bundle was regenerated from current v0.9.2 source plus the formally verified v0.9.0 dependency Source Map:

- bundled modules: 244;
- `node --check index.js`: passed;
- Chromium plugin export/load: passed;
- repository initialization and editor mount: passed;
- SVG canvas mount: passed;
- theme menu: 22 options in 3/10/9 groups;
- page errors: 0;
- console errors: 0.

The Chromium editor interaction test verified:

- YeMind Default light border: `#CBD5E1`, width 2;
- switching to 晨曦 immediately changed the first branch fill and line to `#FF6B6B`;
- the supplied transparent borders immediately rendered with width 0;
- switching rainbow scheme to 代码 immediately replaced the first two line colors with `#FFF0B8` and `#CBFFB8`;
- rainbow switching did not overwrite the 晨曦 node fill;
- switching the host to dark appearance immediately changed YeMind Default fill to `#0B1220` and border to `#64748B`;
- the SVG view transform remained identical across all appearance changes;
- selected theme and rainbow settings persisted through the repository path.

## Dependency service limitation

A clean `npm ci` was retried with a bounded installation attempt. The configured package service returned HTTP 503 while fetching `whatwg-url-14.2.0.tgz`. Because the clean installation could not complete, this environment did not have the `vitest` or `vite` executables and this report does not claim a formal Vitest execution or a formal Vite build.

The permanent Vitest suite remains registered and structurally checked. The changed source was instead covered by strict TypeScript, independent transpilation, dedicated offline contract executions, deterministic production bundling and real Chromium interaction tests.

## Package policy

The release archive is flat and intended for direct extraction into `data/plugins/siyuan-yemind/`. It excludes:

- `node_modules/`;
- `.git/` and temporary build directories;
- nested ZIP files;
- `maps.json`, `settings.json` and `checkpoints.json`.

The final archive is completely extracted to a clean directory and the generation, structural, TypeScript, offline build, syntax and Chromium interaction gates are repeated there before delivery.
