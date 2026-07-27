# YeMind v0.9.31 verification

## Scope

v0.9.31 changes only the existing Theme dropdown presentation. It adds group tabs, two-column theme cards and six real branch-color blocks per card. Theme definitions, IDs, names, categories, color data, application, persistence and map redraw behavior are unchanged. The Line Style dropdown remains the existing list UI.

## TDD evidence

### RED

The new offline smoke was added before production changes and failed with:

```text
TS2307: Cannot find module '../../src/editor/themeChoicePresentation'
```

This proved that the new six-color presentation contract did not yet exist.

### GREEN

After adding the presentation helper, opt-in palette renderer and CSS, the same offline suite passed:

```text
[offline] themePalettePanelV0931SmokeEntry:
{"presets":22,"sixColorPalettes":true,"listPanelPreserved":true}
```

## Automated results

| Check | Result |
|---|---|
| Test structure | PASS — 15 domains / 219 scenario modules |
| TypeScript syntax scan | PASS — 391 files |
| Dependency-free offline suite | PASS — 18/18 entries |
| Offline release bundle | PASS — 277 modules |
| `node --check index.js` | PASS |
| `index.css` equals `src/styles/index.css` | PASS |
| Theme source JSON unchanged from v0.9.30 | PASS — identical SHA-256 |
| Generated theme color data unchanged from v0.9.30 | PASS — identical SHA-256 |
| Theme preset definitions unchanged from v0.9.30 | PASS — identical SHA-256 |
| v0.9.31 Chromium regression | PASS |
| v0.9.25 Theme/Line dark-panel regression | PASS after updating its selected-item selector for the intentional card presentation |
| v0.9.24 dark-theme/view-stability regression | PASS |
| v0.9.30 branch/toolbars/resources regression | PASS |
| Bundle loading and editor appearance regression | PASS |

## Chromium details

The v0.9.31 browser regression verified:

```text
Existing group tabs: 基础 / 缤纷 / 经典
Basic theme cards: 3
Colorful theme cards: 10
Colors per visible card: 6
Selected theme: scheme-dawn
Dark panel background: rgb(34, 37, 43)
Line Style presentation: original list retained
Page errors: 0
Console errors: 0
```

The test also confirmed that switching the host from light to dark did not change any of the six actual palette block colors.

## Standard npm commands

These commands were attempted and are not reported as passing:

### `npm ci`

The connected package registry repeatedly returned HTTP 503 while downloading dependencies, leaving an incomplete `node_modules` directory. The incomplete directory was removed before packaging.

### `npm ci --offline`

Failed with `ENOTCACHED` because `whatwg-url-14.2.0.tgz` was not available in the local cache.

### `npm test`

The structure check passed, then execution stopped because `vitest` was unavailable in the incomplete dependency installation.

### `npm run check`

Stopped because the local `@types/node` package was unavailable. Running the global TypeScript compiler with an available external Node type root reached one pre-existing error only:

```text
src/core/officialDragIntent.ts(298,42)
OfficialDragRect | null is not assignable to OfficialDragRect
```

No v0.9.31 file appeared in that error.

### `npm run build`

Stopped because local `vite` was unavailable. The repository's dependency-free bundle builder successfully generated and validated the 277-module release bundle instead.

## Fixed asset verification boundary

This is a resource-excluded update archive. The fixed marker sprite, clipart and layout thumbnails are intentionally not included and must be retained from the existing installation. Therefore `verify-yemind-assets.mjs` cannot pass against the update archive alone. Catalog contracts and counts were verified by the offline suite.

## Manual verification requested

1. Open Theme in the real SiYuan light and dark themes.
2. Confirm every existing theme is still present under its existing group.
3. Confirm every card shows exactly six colors and the colors match the theme.
4. Select themes from all three groups and verify the map, saved theme and reopened map remain correct.
5. Confirm Line Style and Style panels are visually and functionally unchanged.
6. Check the two-column panel at Windows 100%, 125% and 150% scaling; narrow windows should fall back to one column.

## Packaging contract

The release package excludes:

- `.git`
- `node_modules`
- `dist`
- fixed `assets/`
- nested ZIP archives
- `maps.json`
- `settings.json`
- `checkpoints.json`
- diagnostics and other user-generated data

Final ZIP metadata and SHA-256 are recorded in the release response after deterministic packaging and clean extraction verification.
