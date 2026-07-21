# YeMind v0.5.15 Verification Report

Date: 2026-07-18

## Scope

This release addresses editor-local overlay isolation, visible upstream node editing, partial rich-text selection, palette-based text/background colors and shared canvas/outline rich-text controls. It does not change the map repository schema, checkpoint schema, structural command ownership or drag-drop result algorithm.

## Focused automated coverage

- rich toolbar is mounted inside the editor root rather than `document.body`;
- no separate `clear-color` or `clear-background` buttons exist;
- text/background palettes expose swatches, Reset Default, custom color and EyeDropper behavior;
- color actions are applied to the current formatting target;
- upstream inner editor elements are mounted to the current YeMind editor root;
- canvas edit entry preserves a partial selection instead of selecting the full label;
- edit text, caret and selection receive visible inherited styles;
- outline preserves rich HTML and uses a single active Quill editor;
- formatting only the selected `Hello` range leaves the remainder unchanged;
- outline rich HTML commits through upstream `SET_NODE_TEXT` rich-text mode.

## Verification commands

```text
npm run check
npm test
npm run build
node --check index.js
npm audit --json
```

## Results

```text
Test files: 92 passed
Tests: 240 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 878
Built index.js syntax: passed
```

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in the existing Quill/simple-mind-map/uuid dependency chain. No bottom-layer package was force-upgraded in this interaction release.

## Data and runtime boundaries

- Plugin ID remains `siyuan-yemind-zen`.
- Display name remains `YeMind`.
- Version is `0.5.15`.
- Map/checkpoint file names and schemas are unchanged.
- Outline rich text uses upstream `SET_NODE_TEXT` rich-text mode.
- Canvas node structure, history, layout and persistence remain upstream-owned.

## Remaining manual verification

The current environment cannot launch the user's Windows SiYuan 3.7.2 UI. Verify Settings stacking, native color picker, EyeDropper, real mouse partial selection, Chinese IME and split/full-outline behavior on the desktop installation.
