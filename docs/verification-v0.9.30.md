# YeMind v0.9.30 Verification

## 1. Scope

This release verifies the following v0.9.30 contracts:

- place `+ / - / direct-child count` at the actual outgoing child connector;
- keep quick expansion one-level while node-menu and blank-canvas commands expand complete scopes;
- pin top, bottom and left toolbars by default and expose vertical/diagonal pin states;
- display distinct unlocked/locked icons without changing the existing read-only contract;
- add `文本转导图…` immediately above `添加` in the single-node canvas context menu;
- route canvas and outline marker/clipart clicks through one Replace/Delete popover;
- preserve existing zoom, title, relation, image, drag, outline and dark-theme behavior.

## 2. Test-first record

The v0.9.30 contracts were added before implementation through:

- `tests/suites/commands-selection/v0930BranchControlPlacement.suite.ts`
- `tests/suites/commands-selection/v0930ExpansionScopes.suite.ts`
- `tests/suites/ui-shell/v0930ContextMenuContracts.suite.ts`
- `tests/suites/ui-shell/v0930ToolbarStateIcons.suite.ts`
- `tests/suites/node-content/v0930ResourceActionPopover.suite.ts`
- `tests/offline/branchControlsToolbarResourcesV0930SmokeEntry.ts`
- `scripts/smoke-v0930-branch-controls-toolbar-resources.py`

Before implementation, the new tests failed because the geometry resolver, deep expansion helpers, menu callbacks, three-edge toolbar state and shared resource-action popover did not exist. The same contracts pass after implementation through the dependency-free and Chromium paths described below. The Vitest command could not run in this container because the local dependency is unavailable; this limitation is recorded rather than treating those suites as executed.

## 3. Static and dependency-free verification

### Test structure

```text
Test structure OK: 15 domains, 218 scenario modules.
```

### TypeScript syntax scan

```text
TypeScript syntax OK: 388 files.
```

### Dependency-free offline smoke matrix

All 17 registered offline entries passed. The v0.9.30 result was:

```json
{"pinned":true,"side":"top"}
```

The complete matrix also covered themes, appearance transactions, outline parsing, structured outline projection, drag intent, fixed local assets, interaction regressions, icon isolation, dark-mode icon layout, text import, import-width repair, outline assets/dialogs, relation selection and v0.9.29 quick actions.

### Offline bundle

```text
Built index.js with 276 modules.
```

`node --check index.js` passed.

`index.css` is byte-identical to `src/styles/index.css`.

### Fixed local assets

With the preserved installation assets restored for verification:

```text
YeMind fixed local assets are complete.
```

The release ZIP intentionally excludes these fixed resources as documented in the packaging boundary.

## 4. Chromium verification

The repository browser-smoke matrix was run individually or in small batches. The following 31 scripts completed their assertions during v0.9.30 validation:

1. `smoke-editor-bundle.py`
2. `smoke-load-bundle.py`
3. `smoke-v0910-outline-guides-sync.py`
4. `smoke-v0911-node-actions.py`
5. `smoke-v0912-local-assets.py`
6. `smoke-v0913-interaction-polish.py`
7. `smoke-v0914-summary-geometry-right-drag.py`
8. `smoke-v0915-clipart-geometry.py`
9. `smoke-v0916-direct-image-editing.py`
10. `smoke-v0917-live-width-menu-selection.py`
11. `smoke-v0918-layout-drag-parity.py`
12. `smoke-v0919-icons-dialogs-history-outline.py`
13. `smoke-v0920-cross-root-drag.py`
14. `smoke-v0921-source-icons-rich-toolbar.py`
15. `smoke-v0922-hostile-icon-css.py`
16. `smoke-v0923-icon-grid-dark.py`
17. `smoke-v0924-outline-import-dark.py`
18. `smoke-v0925-import-dark-outline-content.py`
19. `smoke-v0926-import-collapse-outline.py`
20. `smoke-v0927-outline-assets-dialogs.py`
21. `smoke-v0928-outline-dialog-consistency.py`
22. `smoke-v0929-floating-relation-quick-actions.py`
23. `smoke-v0930-branch-controls-toolbar-resources.py`
24. `smoke-v093-interactions.py`
25. `smoke-v094-structured-outline.py`
26. `smoke-v095-drag.py`
27. `smoke-v095-image-tools.py`
28. `smoke-v096-outline-logical-drag.py`
29. `smoke-v097-nearest-logical-drag.py`
30. `smoke-v098-drag-lines-editing.py`
31. `smoke-v099-outline-guides.py`

A final spot-check immediately before packaging re-ran the v0.9.30 and v0.9.29 scripts successfully. A second late repeat of the long v0.9.18 script exceeded that command window; its full layout and drag assertions had already completed successfully in the earlier browser matrix and were not reclassified as a new pass from the timed-out repeat.

### Key v0.9.30 browser result

```text
default: pinned=true, top=true, bottom=true, left=true
auto-hide: pinned=false, top=false, bottom=false, left=false
logicalStructure: right
logicalStructureLeft: left
organizationStructure: bottom
catalogOrganization: bottom
timeline: bottom
verticalTimeline: right
fishbone: right
rightFishbone: left
node menu: 文本转导图… appears immediately before 添加
canvas menu: 展开全部节点 and 折叠全部节点 are separate commands
resource Replace/Delete popover: present
```

### v0.9.29 regression spot-check

```text
pinned default: top/bottom/left visible
unpin: top/bottom/left auto-hidden
zoom input: 125%
title rename: repository/tab/status label synchronized
relation hit target: 12px
selected relation stroke: 3px
shared image lightbox: present
```

## 5. Standard npm command attempts

These commands were actually attempted. Failed commands are not reported as passed.

### `npm ci --offline`

Failed with `ENOTCACHED` because the cache does not contain:

```text
whatwg-url-14.2.0.tgz
```

### `npm test`

The structure check passed, then execution stopped because `vitest` is not installed locally:

```text
sh: 1: vitest: not found
```

### `npm run check`

Stopped because the local Node type definitions are unavailable:

```text
Cannot find type definition file for 'node'.
```

A fallback global TypeScript run with an available external Node type root reached one existing unrelated error:

```text
src/core/officialDragIntent.ts(298,42)
OfficialDragRect | null is not assignable to OfficialDragRect
```

No v0.9.30 file appeared in that compiler error.

### `npm run build`

Stopped because local `vite` is unavailable:

```text
sh: 1: vite: not found
```

The repository's dependency-free bundle builder was used instead and its output was validated by syntax and Chromium tests.

## 6. Package verification

The release handoff records the archive file count, size and SHA-256 after deterministic packaging. These values are intentionally not embedded into the archive itself, avoiding a self-referential hash.

The final archive is required to satisfy:

- two independent deterministic builds produce the same SHA-256;
- ZIP CRC validation passes;
- `plugin.json` is directly at archive root;
- no extra top-level wrapper directory exists;
- no `.git`, `node_modules`, `dist`, nested ZIP or cache files are present;
- no `maps.json`, `settings.json`, `checkpoints.json`, diagnostics exports or user-created storage are present;
- fixed installation assets remain excluded:
  - `assets/clipart/`
  - `assets/icons/marker-sprite.png`
  - `assets/layout-thumbnails/`
- a fresh extraction repeats structure, syntax, offline, bundle, `node --check`, v0.9.30 and v0.9.29 checks;
- rebuilt `index.js` and `index.css` match the packaged release output.

## 7. Manual verification still recommended

The following require real SiYuan and platform interaction even though their underlying contracts were automated:

1. Inspect every structure preset visually, especially the less common tree, S-timeline, organization and fishbone variants, and confirm the control sits exactly on the outgoing child connector.
2. Confirm the pinned setting survives a full SiYuan restart and that vertical/diagonal pin semantics remain intuitive.
3. Test top, bottom and left edge reveal at Windows 100%, 125% and 150% scaling.
4. Check the Replace/Delete popover and the subsequent marker/clipart picker near all four corners and four viewport edges.
5. Test full-subtree and full-map expansion on a very large real map for perceived performance and undo behavior.
6. Check default and third-party light/dark themes.
