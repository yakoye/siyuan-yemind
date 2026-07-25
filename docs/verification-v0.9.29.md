# YeMind v0.9.29 verification

## Scope

This release clears transient resource-edit overlays when changing views, expands relation-line pointer hit areas without changing their visual appearance, keeps node quick actions attached to the actual child branch across layouts, and adds persisted floating-toolbar controls, direct zoom entry and inline map-title rename.

## Red-first development

The v0.9.29 contracts were added before implementation through:

- `tests/suites/commands-selection/v0929QuickActionGeometry.suite.ts`
- `tests/suites/advanced-structures/v0929RelationHitArea.suite.ts`
- `tests/suites/ui-shell/v0929FloatingToolbarFields.suite.ts`
- `tests/suites/node-content/v0929ViewImagePreviewState.suite.ts`
- `tests/offline/floatingRelationQuickActionsV0929SmokeEntry.ts`
- `scripts/smoke-v0929-floating-relation-quick-actions.py`

The first red run failed because the quick-action geometry helpers, relation hit-width helper, zoom/title parsers and persisted `toolbarsPinned` setting did not exist. The implementation was then added and the same contracts were rerun without weakening their assertions.

## Implemented contracts

### View-transition resource cleanup

- Leaving map view clears image and clipart resize handles, delete controls and resource toolbars.
- Node selection may remain, but resource-level editing state is not restored when returning from outline or split view.
- Outline image double-click continues to route to the same shared `ImageLightbox` instance used by the canvas.

### Relation selection and layout isolation

- The visible relation line keeps its configured visual width.
- A separate transparent non-scaling stroke uses a `12px` hit width with `pointer-events: stroke`.
- Selecting a relation restores the normal active visual width (`3px` in the Chromium fixture).
- Relation overlays remain SVG presentation layers and do not participate in node text or bounding-box measurement.

### Layout-aware quick actions

- The disclosure badge shows the count of direct children only.
- Collapse recursively closes every descendant branch.
- Expanding a collapsed branch opens only the direct child layer; deeper descendants remain collapsed.
- The control anchor is calculated from direct-child geometry and follows the actual child branch side.
- Explicit coverage includes right logical structure, left logical structure, mind map, organization structure and catalog organization layouts.

### Floating toolbars

- Top and bottom toolbars auto-hide by default.
- Entering the edge hot zone or the toolbar itself reveals the corresponding toolbar.
- Hover and keyboard focus retain visibility long enough to operate controls without flicker.
- One bottom pin fixes both toolbars.
- Pin state is persisted in settings through `toolbarsPinned` and is also exposed in the settings dialog.

### Direct zoom entry

- The status zoom value is a real editable input.
- Values such as `80`, `80%`, `125` and `125%` are accepted.
- Invalid values are rejected and valid values are clamped to the configured zoom range.
- Enter applies, Escape cancels, and blur applies a valid value.

### Inline map-title rename

- Clicking the status title enters inline editing and selects the current title.
- Enter or blur saves; Escape cancels.
- Blank titles normalize to `未命名导图`.
- A successful rename updates repository data, the status label and the open SiYuan tab title.

## Static and dependency-free verification

- Test structure: **15 domains / 213 scenario modules**.
- TypeScript syntax scan: **381 files**.
- Dependency-free offline entries: **16/16 passed**.
- Offline bundle: **275 modules**.
- `node --check index.js`: passed.
- Root `index.css` was regenerated from `src/styles/index.css` and byte-compared.

The v0.9.29 offline result was:

```json
{"relationHitWidth":12,"anchor":{"side":"left","x":100,"y":120},"title":"未命名导图"}
```

A global TypeScript check with an available external Node type root reached the existing unrelated error only:

```text
src/core/officialDragIntent.ts(298,42)
OfficialDragRect | null is not assignable to OfficialDragRect
```

No v0.9.29 file appeared in the compiler error output.

## Real Chromium verification

The repository Chromium smoke scripts were exercised individually or in bounded batches. All **30** scripts completed successfully when run independently, including the long layout/drag parity coverage. A later aggregate all-in-one shell run was not used as a release signal because cumulative browser execution exceeded the command window before reaching the end; the same scripts had already passed individually.

Key v0.9.29 browser result:

```json
{
  "autoHide":{"top":"false","bottom":"false","pinned":"false"},
  "zoomApplied":"125%",
  "title":{"repo":"重新命名","tab":"重新命名","label":"重新命名"},
  "relation":{"width":12,"pointer":"stroke","fill":"none"},
  "activeWidth":3,
  "layoutSides":{
    "logicalStructure":{"actual":"right","expected":"right"},
    "logicalStructureLeft":{"actual":"left","expected":"left"},
    "mindMap":{"actual":"right","expected":"right"},
    "organizationStructure":{"actual":"bottom","expected":"bottom"},
    "catalogOrganization":{"actual":"bottom","expected":"bottom"}
  },
  "lightbox":true
}
```

The browser runs also preserved previous release contracts for:

- all supported layouts and left/right drag geometry;
- outline/canvas/split content synchronization;
- image and clipart editing and preview;
- marker and clipart catalogs;
- import geometry and deterministic branch disclosure;
- relation, summary, outer-frame and rich-text behavior;
- dark-theme icon and dialog presentation;
- page and console error collectors reporting zero in the scripts that expose them.

## Standard npm command attempts

The required repository commands were actually attempted.

### `npm ci --offline`

Failed with `ENOTCACHED` because the environment lacks:

```text
whatwg-url-14.2.0.tgz
```

### `npm test`

The structure stage passed (`15 domains / 213 scenario modules`), then execution stopped because `vitest` is not installed in the materialized environment.

### `npm run check`

Stopped because the local `@types/node` package is unavailable.

### `npm run build`

Stopped because the local `vite` executable is unavailable.

These commands are not reported as passed. The release bundle was generated with the repository's dependency-free builder and validated with static, offline-runtime and real Chromium coverage.

## Package safety contract

The release ZIP must:

- place `plugin.json` directly at the archive root;
- contain no extra top-level wrapper directory;
- exclude `.git`, `node_modules`, `dist`, nested ZIP files, caches and temporary artifacts;
- exclude `maps.json`, `settings.json`, `checkpoints.json`, diagnostic exports and all user-created storage;
- continue excluding the large fixed resource directories documented in `OVERLAY_PACKAGE_NOTICE.md`;
- pass ZIP CRC validation;
- produce the same SHA-256 from two independent deterministic packaging runs;
- pass structure, syntax, offline-runtime, bundle and key Chromium verification after fresh extraction.

## Manual SiYuan verification still recommended

1. Move the pointer slowly and quickly into the top and bottom edge hot zones at Windows display scaling `100%`, `125%` and `150%`.
2. Pin and unpin both toolbars, restart SiYuan and confirm the preference persists.
3. Type zoom values near the configured minimum/maximum and verify the viewport center remains intuitive.
4. Rename a map from the bottom title and confirm repository, tab and reopen behavior.
5. Select relations with straight, curved and dashed styles at several zoom levels and confirm the visible stroke never becomes permanently thicker.
6. Switch every supported layout and inspect `+ / - / count` placement on left, right, top and bottom branches.
7. Collapse a deep branch and confirm the next expansion shows only direct children.
8. Select an image or clipart, switch to outline and split views, and confirm resize handles and floating resource controls do not remain.
9. Double-click an outline image and confirm the same full lightbox appears as on the canvas.

## Final archive verification

- Deterministic packaging was performed twice and the archives were byte-identical.
- Archive file count: **681**.
- ZIP CRC check: passed (`testzip() == None`).
- `plugin.json` is present directly at archive root.
- Forbidden-path scan found no `.git`, `node_modules`, `dist`, nested ZIP, cache, user map/settings/checkpoint or diagnostic-export files.
- A fresh extraction repeated the 15-domain structure check, 381-file syntax scan, all 16 offline entries, the 275-module dependency-free bundle and `node --check` successfully.
- Rebuilt `index.js` and `index.css` were byte-identical to the packaged bundle.
- Fresh-extraction Chromium checks for v0.9.29 and v0.9.28 passed.
- The long v0.9.18 full layout/drag script had already passed in the work tree; a later fresh-extraction repeat did not finish inside the container execution window, so that repeat is not reported as an additional pass.
