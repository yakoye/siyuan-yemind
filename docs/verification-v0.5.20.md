# YeMind Zen v0.5.20 Verification Report

Date: 2026-07-20

## Release scope

v0.5.20 implements the requested structure, style and summary interaction batch:

- editor-local node-tail controls: leaf nodes expose add-child; expanded branches expose compact collapse plus add-child; collapsed branches expose hidden-child count plus add-child;
- one native `expand` state shared by map, split and outline views, with Root fixed and Root first-level branches foldable;
- removal of the top-toolbar Delete action;
- icon-based Structure, Theme and Line Style controls;
- Structure, Theme and Line Style submenus on the blank-canvas context menu only;
- a node-local style panel covering shape, fill, border, width/fit and core text styling;
- dedicated summary icon and editable native generalization rows in outline views.

## Official-source adaptation boundary

The implementation follows the supplied KMind Zen 0.34.0 interaction and command model while retaining YeMind Zen's `simple-mind-map` structure, repository, history, checkpoints and persistence. No KMind private React state tree, document kernel, renderer or second history was imported.

The installed public engine exposes three stable parent-child line styles (`curve`, `straight`, `direct`). v0.5.20 presents those native choices as icons rather than claiming unsupported private KMind edge routes.

## Test-driven development

Focused failing tests were added before implementation for:

- leaf, branch and Root quick-action contracts;
- native outline expansion and Root first-level branch folding;
- toolbar labels/icons and blank-vs-node context-menu ownership;
- normalized node-style patches and style-panel input isolation;
- native summary rows in outline mode;
- existing safe-resize behavior after the view-mode integration changed shape.

After implementation and regression correction, the complete source tree passed:

```text
Test files: 118 passed
Tests: 308 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 889
Built index.js syntax: passed
Package version: 0.5.20
Plugin version: 0.5.20
Runtime version: 0.5.20
```

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in the existing dependency chain. No broad dependency upgrade was forced into this UI and interaction release.

## Package policy

The release archive retains complete TypeScript source, tests, Superpowers skills/design/plan, architecture, changelog, feature matrix, migration notes, official-source analysis, parity notes and this verification report.

The archive excludes:

- `node_modules/`;
- temporary `dist/`;
- `.git/`;
- nested ZIP files and release-check workspaces.

## Manual desktop acceptance still required

The current environment cannot launch the user's Windows SiYuan 3.7.2 desktop UI. Real desktop acceptance should focus on:

1. exact node-tail `− / + / count` placement at different zoom levels and layouts;
2. map/outline fold synchronization, including Root first-level branches and reopen persistence;
3. Structure, Theme and Line Style icon menus in light/dark mode;
4. node-style application, reset, undo/redo and persistence for single and multiple selections;
5. summary creation, text editing, movement, deletion and bracket layout;
6. continued outline IME, Backspace/Delete, drag and autosave stability from v0.5.17-v0.5.19.
