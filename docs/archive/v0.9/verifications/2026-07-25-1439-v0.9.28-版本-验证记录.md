# YeMind v0.9.28 verification

## Scope

This release addresses the remaining outline accessory alignment, semantic note/comment indicators, first-hover preview sizing, outline image double-click arbitration, canvas clipart direct manipulation, edge-safe asset-dialog placement and inconsistent dialog chrome reported after v0.9.27.

## Red-first development

The v0.9.28 scenario was added before implementation through:

- `tests/suites/outline-split/v0928OutlineDialogConsistency.suite.ts`
- `tests/offline/outlineDialogConsistencyV0928SmokeEntry.ts`
- `scripts/smoke-v0928-outline-dialog-consistency.py`

The first dependency-free run failed because the eight-direction placement contract and shared dialog chrome did not exist. The implementation was then added and the same contracts were rerun without weakening their assertions.

## Implemented contracts

### Outline markers and semantic status

- Outline marker artwork is rendered directly on the compact button using a mathematically scaled sprite background.
- The compact marker viewport is `18 × 18px`; the original sprite catalog remains `28 × 28px` per item.
- Notes use `#iconYeMindNote` and comments use `#iconYeMindComment`.
- Comment count remains in the accessible label and hover content, but is no longer rendered as a leading number.

### Hover preview stability

- Preview content is initially measured while hidden instead of being displayed at an incomplete size.
- Positioning settles over animation frames.
- `ResizeObserver` updates placement after content-size changes.
- Image load events trigger remeasurement.

### Outline image click arbitration

- Single click opens image editing after a cancellable `380ms` delay.
- Double click cancels the pending edit and opens the same shared lightbox used by canvas images.
- Read-only mode continues to permit preview without editing.

### Clipart direct manipulation

- Canvas clipart selection restores all eight resize handles.
- The top-right delete control remains available.
- Single click still opens the clipart picker.
- Only the ordinary replace toolbar is hidden for clipart; ordinary images retain their existing toolbar and resize behavior.

### Anchored asset dialogs

- Marker and clipart dialogs evaluate eight placement candidates around the clicked asset.
- Candidate scoring considers viewport overflow, anchor overlap and displacement.
- The result is clamped to viewport margins and avoids the clicked asset whenever a non-overlapping candidate exists.

### Unified dialog chrome

- All YeMind `Dialog` creation is routed through `createYeMindDialog` / `applyDialogChrome`.
- Native and custom headers use a `46px` minimum row.
- Titles are bold and vertically centered.
- Close controls use the same `30 × 30px` centered geometry.
- Footer actions are right aligned with consistent spacing.

## Static and dependency-free verification

- Test structure: **15 domains / 209 scenario modules**.
- TypeScript syntax scan: **372 files**.
- Dependency-free offline entries: **15/15 passed**.
- Offline bundle: **271 modules**.
- `node --check index.js`: passed.
- Root `index.css` was regenerated from `src/styles/index.css` and used by browser tests.

The v0.9.28 offline result was:

```json
{"htmlLength":1086,"placement":"left-top"}
```

## Real Chromium verification

All **29** repository Chromium smoke scripts completed successfully, including the long multi-layout drag-parity script.

Key v0.9.28 measurements:

```text
Outline marker slot:       18 × 18px
Sprite background size:    244.286 × 313.714px
Sprite background offset:  -55.2857px -9px
Marker child wrappers:     0
First hover preview:       fully measured and visible
Dialog header height:      46px
Dialog title weight:       700
Dialog footer alignment:   flex-end
Close-button center delta: 0.5px
Clipart resize handles:    8
Asset placement:           non-overlapping viewport-safe candidate
```

The browser run also preserved the previous release contracts for:

- text-to-map import geometry and width migration;
- deterministic branch collapse;
- dark icon and panel visibility;
- canvas/outline/split synchronization;
- direct ordinary-image editing and lightbox preview;
- marker and clipart catalogs;
- rich-text selection and formula toolbar;
- all supported layouts and left/right fishbone dragging;
- page errors: `0`;
- console errors: `0` in the scripts that collect them.

## Standard npm command attempts

The required repository commands were actually attempted.

### `npm ci --offline`

Failed with `ENOTCACHED` because the environment lacks:

```text
whatwg-url-14.2.0.tgz
```

### `npm test`

The test-structure stage passed, then execution stopped because `vitest` is not installed in the materialized environment.

### `npm run check`

Stopped because the local `@types/node` package is unavailable.

### `npm run build`

Stopped because the local `vite` executable is unavailable.

These commands are not reported as passed. The release bundle was generated with the repository's dependency-free builder and validated with static, offline-runtime and real Chromium coverage.

## Package safety contract

The release ZIP must:

- place `plugin.json` directly at the archive root;
- contain no extra top-level wrapper directory;
- exclude `.git`, `node_modules`, `dist`, nested ZIP files and temporary artifacts;
- exclude `maps.json`, `settings.json`, `checkpoints.json`, diagnostic exports and all user-created storage;
- continue excluding the large fixed resource directories documented in `OVERLAY_PACKAGE_NOTICE.md`;
- pass ZIP CRC validation;
- produce the same SHA-256 from two independent deterministic packaging runs;
- pass structure, syntax, offline-runtime, bundle and key Chromium verification after fresh extraction.

## Manual SiYuan verification still recommended

1. Check outline priority/progress marker alignment at Windows display scaling `100%`, `125%` and `150%`.
2. Hover note/comment icons immediately after opening a large map and confirm the first preview is complete.
3. Single-click and double-click the same outline image at normal and rapid click speeds.
4. Resize and delete clipart from all eight handles, then reopen the picker from the selected clipart.
5. Open marker and clipart dialogs from assets near each screen edge and all four corners.
6. Inspect every dialog in built-in light/dark themes and representative third-party themes for title, close-control and footer alignment.
7. Confirm ordinary images still show their replace/delete toolbar and are unaffected by clipart-specific behavior.
