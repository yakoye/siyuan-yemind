# YeMind v0.9.22 verification

## Scope

This release verifies exact `图标-svg.txt` source-byte preservation, `<img>` document isolation from SiYuan/custom SVG CSS, toolbar and context-menu sizing, the retained double-click rich-text toolbar behavior, package integrity and extracted-package reruns.

## Root cause confirmed

The v0.9.21 implementation decoded the source and inserted nested inline SVG geometry. Stroke-only paths could then be affected by host selectors targeting `svg`, `svg *` or `svg path`; inherited `fill="none"` was no longer a sufficient boundary. The standalone browser preview looked correct because the data-URI SVG was rendered as a separate image document.

v0.9.22 preserves the exact supplied data URI and renders it through an `<img>` boundary. SiYuan CSS can style the outer 18×18 image box but cannot enter the embedded SVG document.

## TDD red-green evidence

### RED

Command:

```text
node scripts/run-offline-smokes.mjs
```

Result before implementation: exit `1`.

```text
Error: insertParent must render as an isolated image element
```

This failure was produced while the v0.9.21 code still returned inline SVG.

### GREEN

After implementation, the same command exits `0`. The new entry reports:

```text
[offline] sourceIconIsolationV0922SmokeEntry: {"icons":14,"exactSourceHashes":true,"isolatedImageBoundary":true,"hostileHostCssProtected":true}
```

A separate source comparison confirmed all 14 complete data URIs match `图标-svg.txt` byte-for-byte.

## Dependency-free source and bundle verification

All of the following completed with exit `0` in the release worktree:

```text
node scripts/build-offline-bundle.mjs
# Built index.js with 264 modules.

node scripts/check-test-structure.mjs
# Test structure OK: 15 domains, 195 scenario modules.

node scripts/check-typescript-syntax.mjs
# TypeScript syntax OK: 344 files.

node scripts/run-offline-smokes.mjs
# 9 offline entries passed.

node --check index.js
```

`index.css` is synchronized from `src/styles/index.css`; package, plugin and runtime version fields are `0.9.22`.

## Browser verification

The two release-critical Chromium regressions completed with exit `0`:

```text
python scripts/smoke-v0921-source-icons-rich-toolbar.py
```

Verified four toolbar icons, seven context-menu icons, exact image-document boundaries, full-node text selection and the visible rich-text toolbar, with zero page or console errors.

```text
python scripts/smoke-v0922-hostile-icon-css.py
```

Injected aggressive `!important` black fill/stroke rules against host SVG descendants and reported:

```text
{"toolbar":4,"menu":8,"all":12,"loaded":true,"dataUris":true,"inlineChildren":0,"inlineSuppliedSvg":0,"tags":["IMG"]}
```

The established browser smoke set was also exercised across editor loading, local assets, node actions, dialogs, image editing, drag behavior, outline behavior and selection. Assertions reached their expected output. During long sequential orchestration, the execution environment intermittently held Playwright cleanup processes after a script had printed its successful result, so only independently completed exit-0 runs are counted as clean command passes above.

## Dependency-backed checks unavailable in this environment

The dependency cache is incomplete and network package installation is unavailable. These are reported as unavailable, not passed:

```text
npm ci --offline
# exit 1: ENOTCACHED for whatwg-url-14.2.0.tgz

npm test
# exit 127 after structure check: vitest: not found

npm run check
# exit 2: TS2688, missing @types/node

npm run build
# exit 127: vite: not found
```

The committed dependency-free bundle builder, syntax scanner, offline behavior suite and Chromium release regressions were used instead.

## Release package contract

The final ZIP is flat at its root and excludes `.git`, `node_modules`, `dist`, temporary files, nested ZIP files and user data (`maps.json`, `settings.json`, `checkpoints.json`). Its CRC, root layout and full extraction are checked after this document is included. The dependency-free source checks and the two release-critical Chromium tests are rerun from the extracted directory.

## Manual SiYuan verification still required

- Install over an existing SiYuan 3.7.3 `siyuan-yemind` directory while preserving its fixed `assets/` resources.
- Visually inspect search, project style, upper/same/lower insertion, node style, outer frame, marker and clipart icons in the actual host theme/snippet combination that previously produced black fills.
- Confirm light/dark/custom host surfaces keep the intended fixed source artwork and acceptable contrast.
- Confirm no user maps, settings or checkpoints are changed by the update.
