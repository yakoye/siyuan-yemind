# YeMind v0.6.3 Verification Report

Date: 2026-07-20

## Release scope

v0.6.3 replaces the bottom Select/Drag text with shared pointer/hand icons, makes node-content hover previews avoid their source badges, adds compact comment timestamps, keeps top/bottom toolbars usable in narrow tabs, compacts Note/Comment dialogs, unifies Node Style entry points and reorganizes the node context menu into grouped single-scroll sections.

## Automated verification

```text
Test files: 132 passed
Tests: 356 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 890
Built index.js syntax: passed
```

Focused coverage includes:

- pointer/hand icons come from one function and are reused by the bottom toolbar and settings;
- settings retain complete Select-first and Drag-first operation guidance;
- note/comment preview placement tries multiple directions, stays inside the editor and avoids the source badge;
- comment hover previews include small right-aligned date/time metadata;
- top and bottom toolbars remain one-line, nonshrinking, horizontally scrollable surfaces in narrow tabs;
- Note and Comment dialogs use compact internal headers, local close buttons and viewport-safe sizing;
- top-toolbar and node-menu Node Style entries share the same SVG and style panel command path;
- the node menu is grouped into Clipboard, Node Content, Style & Relations and Arrange & Collapse;
- only the menu-items container owns vertical scrolling;
- all accumulated folding, Root expansion, Delete/Backspace isolation, right-button panning, canvas rich-text, outline selection/drag, colors, notes, comments, images, styles and summary regressions remain active.

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in the existing `quill` / `simple-mind-map` / `uuid` dependency chain. No dependency was added or force-upgraded for this interaction release.

## Package identity

```text
Plugin ID: siyuan-yemind-zen
Display name: YeMind
Version: 0.6.3
```

The archive excludes `node_modules/`, temporary `dist/`, `.git/` and nested ZIP files while retaining complete TypeScript source, tests, Superpowers design/plan documents, architecture, development plan, feature matrix, changelog and verification documentation.

## Remaining manual verification

The current environment cannot launch the user's Windows SiYuan 3.7.2 desktop UI. Real desktop acceptance should verify extreme narrow-tab toolbar scrolling, note/comment badge avoidance at all canvas edges, host-menu submenu height, dialog density at Windows display scaling and light/dark theme icon legibility.
