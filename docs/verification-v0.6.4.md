# YeMind v0.6.4 Verification Report

Date: 2026-07-20

## Release scope

v0.6.4 adds a collapsed-by-default Find/Replace surface, leaf-node markers and strict text-versus-drag hit zones in outline views, YeMind results inside SiYuan search, and a whole-map Style surface for density, rainbow branch colors and background. The existing node context-menu Node Style remains scoped to selected nodes.

## Automated verification

```text
Test files: 139 passed
Tests: 370 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 894
Built index.js syntax: passed
ZIP CRC/integrity: passed
Complete extraction: passed
Extracted npm ci: passed
Extracted tests: 139 files / 370 tests passed
Extracted TypeScript: passed
Extracted production build: passed
Extracted index.js syntax: passed
```

Focused coverage includes:

- Find is the default one-row state and the disclosure control explicitly expands/collapses Replace;
- leaf markers appear only on non-Root, non-generalization nodes without children;
- outline structural drag starts only left of the text editor boundary, while the text area remains an editing and selection surface;
- global search matches map title, node text, Note, Comment, Tag, Link and Todo content;
- stale YeMind search results are replaced, empty searches remove the panel, and result clicks open the exact map/node;
- whole-map density, rainbow lines and background normalize through one transaction model;
- project styles survive save/reopen and checkpoint restore;
- top/canvas “Style” and node-menu “Node Style” remain separate entry points and scopes;
- all accumulated Root folding, number/triangle expansion, Delete/Backspace isolation, right-button pan, canvas rich text, outline selection/drag, notes, comments, images, node styles and summary regressions remain active.

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in the existing dependency chain. No dependency was added or force-upgraded for v0.6.4.

## Package identity

```text
Plugin ID: siyuan-yemind-zen
Display name: YeMind
Version: 0.6.4
```

The release archive excludes `node_modules/`, temporary `dist/`, `.git/` and nested ZIP files while retaining TypeScript source, tests, Superpowers design/plan documents, architecture, development plan, feature matrix, changelog and verification documentation.

## Remaining manual verification

The current environment cannot launch the user's Windows SiYuan 3.7.2 desktop UI. Real desktop acceptance should verify SiYuan global-search placement and node navigation, large-map search responsiveness, mouse text selection beside the outline drag gutter, leaf-marker legibility in light/dark themes, and the visual density/rainbow/background results across every layout.
