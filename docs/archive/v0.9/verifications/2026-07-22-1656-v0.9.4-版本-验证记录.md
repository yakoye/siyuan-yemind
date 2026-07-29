# YeMind v0.9.4 verification

## Scope

v0.9.4 replaces the user-facing text/node outline split with one YeMind-owned structured outline editor. The release changes outline projection, selection, clipboard, keyboard and drag routing while keeping the existing map, settings and checkpoint schemas.

## Executed source checks

- Theme source generation: passed; 25 appearance definitions generated from 19 named source themes.
- Test organization: passed; 15 domains and 169 registered scenario modules.
- Static test declarations: 503 `it()` / `test()` cases across the registered scenario modules.
- Strict TypeScript project check: passed.
- Independent TypeScript syntax transpilation: passed for 297 source and test files.
- Offline behavior contracts: passed for theme/border priority, atomic appearance redraw, legacy indentation import and the unified structured outline model.
- Deterministic offline production bundle: passed; 245 reachable modules.
- Bundle syntax: `node --check index.js` passed.
- Bundle SHA-256: `2d158c9880d7cb4993ed6c72dd5ef71f5b9d559db20c03c923391385e3c4f831`.
- Rebuilding the bundle and manifest produced byte-identical files.

## Unified outline browser regression

The release bundle was loaded in system Chromium and exercised through the real editor DOM.

Verified behavior:

- one contenteditable outline surface, with no text/node mode buttons and no outline textarea;
- native selection across node rows;
- staged current-node/full-outline `Ctrl/Cmd+A`, including direct promotion from a cross-node range and reset after the live selection changes;
- partial, whole-node and cross-node selection replacement on paste;
- rich copy/paste, plain-text paste and safe rich-boundary handling;
- whole-outline copy includes logical collapsed descendants, while ordinary visible ranges do not silently include hidden rows;
- multiline indentation import, escaped punctuation normalization and one-transaction tree replacement;
- existing child subtrees remain attached when multiline paste replaces only the current node content;
- readonly staged select-all and copy remain available while paste, undo and redo mutations are blocked;
- IME composition is not reconciled until composition completes;
- branch triangles and leaf squares are both 7 px and pure black;
- indent-rainbow guides remain visible;
- hover uses `#ececec`; active/editing uses `#deeae6` and green text; border, outline, shadow and left accent are absent;
- formatting toolbar stays hidden during pointer selection and appears after selection completes;
- structure drag starts only from the dedicated gutter and publishes depth-aligned before/inside/after indicators;
- supplied 34-node PCIe table-of-contents text imports with the expected hierarchy;
- a 601-node structured paste completed in approximately 0.34 seconds in the regression environment;
- no page errors or console errors occurred.

Historical browser regressions also passed for plugin bootstrap, repository/editor mount, SVG canvas mount, 22-theme registration, theme/rainbow immediate redraw, dark appearance, viewport preservation, root background coverage and hover quick-action bridge behavior.

## Formal dependency gate limitation

A clean `npm ci` was attempted in a separate directory. The internal package gateway returned:

```text
npm error code E503
npm error 503 Service Temporarily Unavailable - GET https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/whatwg-url/-/whatwg-url-14.2.0.tgz
```

Therefore the formal Vitest command and a fresh Vite build could not be executed in this environment. This report does not claim that they ran. Their repository scripts and all 169 registered suites remain included in the release package for execution when the registry is available.

## Release-package gate

The final ZIP must additionally pass, from a new extraction directory:

- flat plugin-root layout;
- CRC and complete extraction;
- version consistency across package, lockfile, manifest, runtime and release metadata;
- absence of user maps/settings/checkpoints, `node_modules`, temporary folders, nested ZIPs and VCS data;
- regenerated theme data;
- strict TypeScript and independent syntax checks;
- all offline contracts;
- deterministic byte-identical bundle rebuild;
- all Chromium plugin/editor/outline regressions.

The final archive size, entry count and SHA-256 are reported alongside the released artifact after this second-pass verification.
