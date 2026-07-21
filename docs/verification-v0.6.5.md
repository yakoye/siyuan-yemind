# YeMind Zen v0.6.5 Verification Report

Date: 2026-07-20

## Release scope

v0.6.5 reassigns whole-map density presets and adds custom horizontal/vertical spacing, closes the Style panel on outside click, preserves global-search node navigation across delayed tab startup, unifies Node Style colors on the shared 52-swatch HEX/RGB palette, and restores visible partial-range canvas rich-text editing.

## Automated verification

```text
Test files: 143 passed
Tests: 378 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 897
Built index.js syntax: passed
ZIP CRC/integrity: passed
Complete extraction: passed
Extracted npm ci: passed
Extracted tests: 143 files / 378 tests passed
Extracted TypeScript: passed
Extracted production build: passed
Extracted index.js syntax: passed
```

Focused coverage includes:

- the new Compact preset is tighter than Default, Default equals the former compact spacing, and Comfortable preserves the selected theme's native spacing;
- custom horizontal and vertical spacing is normalized, applied to the map, saved in MapRepository and retained by checkpoints;
- the whole-map Style panel closes only when clicking outside its own surface;
- SiYuan search result navigation focuses immediately when an editor exists and queues/flushes the exact node UID while a tab is still mounting;
- node fill, border and text colors share the 52-swatch Reset/More/HEX/RGB palette and isolate input events from canvas shortcuts;
- real SVG double-click enters the upstream Quill editor, synchronizes visible text/background colors, selects a partial range, shows the shared toolbar and applies Bold only to that range;
- every accumulated Root/branch folding, number/triangle expansion, Delete/Backspace isolation, right-button pan, outline selection/drag, note, comment, image, node-style, summary, search and responsive-UI regression remains active.

## Dependency audit

The online npm advisory request did not complete in the current environment. The offline npm cache audit completed successfully and reported no cached production vulnerabilities. No dependency was added or upgraded for v0.6.5.

## Package identity

```text
Plugin ID: siyuan-yemind-zen
Display name: YeMind Zen
Version: 0.6.5
```

The release archive excludes `node_modules/`, temporary `dist/`, `.git/` and nested ZIP files while retaining TypeScript source, tests, Superpowers design/plan documents, architecture, development plan, feature matrix, changelog and verification documentation.

## Remaining manual verification

The current environment cannot launch the user's Windows SiYuan 3.7.2 desktop UI. Real desktop acceptance should verify all four density modes across layouts/themes, outside-click behavior around native controls, SiYuan global-search click-through after cold tab startup, node color editing through the native picker, and canvas double-click/partial selection on light, dark and custom-colored nodes.
