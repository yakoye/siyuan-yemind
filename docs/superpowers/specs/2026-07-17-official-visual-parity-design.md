# YeMind Zen v0.5.14 Official Visual Parity Design

## Goal

Bring the existing YeMind Zen visual controls closer to KMind Zen 0.33.0 without importing KMind Zen's private document kernel, history, renderer, or persistence implementation.

The first parity batch covers the user's explicit examples and the shared foundation needed by later parity work:

1. Curved parent-child edges by default.
2. Per-map theme preset selection.
3. Smart light/dark theme variants following SiYuan appearance.
4. All 13 official theme families and level styling mapped onto `simple-mind-map`.
5. Theme-defined rainbow branches through the upstream `RainbowLines` plugin.
6. Per-map line-style selection and checkpoint-safe persistence.
7. All 14 layouts supported by the installed `simple-mind-map` runtime.
8. A complete feature comparison matrix that identifies later parity batches.

## Source study

The official package exposes a bundled runtime with:

- smart light/dark variants;
- theme presets including KMind Default, Ink Branch, Material 3 variants, Slate, Midnight Neon and Rainbow Breeze;
- default cubic/curved incoming edges;
- theme-defined node levels, backgrounds, relation colors and rainbow palettes;
- a project-level theme document and a separate custom theme designer.

The official theme schema cannot be passed directly to `simple-mind-map`. YeMind Zen therefore maps official tokens into the upstream theme fields while preserving the existing YeMind data, command, history and persistence contracts.

## Architecture

### Map persistence

Keep `theme` as the logical preset ID and add `lineStyle` as a map field.

Legacy maps migrate as follows:

- `theme: "default"` becomes `theme: "kmind-default"` in memory and is persisted on the next repository migration save.
- missing `lineStyle` becomes `curve`.

Checkpoints store and restore both fields.

### Theme adapter

Add `src/core/themePresets.ts` containing:

- the supported logical preset IDs and labels;
- light and dark variants;
- official-source colors, typography, shapes and branch palettes adapted to upstream fields;
- a pure `buildThemeConfig()` adapter producing a valid `simple-mind-map` theme config;
- appearance detection helpers;
- the supported line-style list.

The adapter merges values in this order:

1. preset variant;
2. map line style;
3. existing user spacing settings.

This keeps the current spacing controls authoritative.

### Runtime application

`createMindMap()` always uses upstream base theme `default`, supplies the adapted theme config, and configures `rainbowLinesConfig`.

`YeMindEditor` owns the logical preset ID. Theme/line controls update the map immediately and schedule persistence. An appearance observer reapplies the selected preset when SiYuan changes between light and dark.

### Upstream reuse

Use upstream:

- `setThemeConfig()` for node and edge rendering;
- `RainbowLines` for branch colors;
- existing render/history and layout engines.

Do not implement a second renderer, node style model, history stack or tree mutation path.

## UI

Add two compact selectors to the top toolbar:

- Theme: 13 official-named presets.
- Line: Curve, Straight, Direct.

The default is KMind Default + Curve.

## Scope boundaries

This version does not yet implement the full official theme designer, `.kmind-theme.json` import/export, project/root-level theme overrides, per-node shape inspector or all official edge routes that `simple-mind-map` cannot natively render.

Those remain in the parity matrix and will be implemented in later isolated batches.

## Compatibility

- Existing map data and IDs remain unchanged.
- Existing node-level custom styles continue to override the theme through upstream behavior.
- Existing v0.5.10-v0.5.13 startup, diagnostics, outline, todo and drag contracts remain protected.
