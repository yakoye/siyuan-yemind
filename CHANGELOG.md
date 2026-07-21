# Changelog

## 0.3.0 — 2026-07-16

- Registered the RichText, Formula, AssociativeLine and NodeImgAdjust engine plugins.
- Added a compact rich-text selection toolbar for bold, italic, underline, strike, colors, size, font and format clearing.
- Added reversible cloze formatting with hover-to-reveal behavior.
- Added inline and block formula insertion using the engine Quill/KaTeX pipeline.
- Added node todos with text and completion state, plus clickable node status badges.
- Added multiple node comments with add, edit and delete operations.
- Added native node notes, tags, custom icons, hyperlinks and images.
- Added image selection, preview, removal and engine-provided image resizing.
- Added summaries and associative lines through native simple-mind-map commands.
- Expanded the native SiYuan node context menu with separate content actions.
- Added focused tests for node-content state, engine commands, plugin registration, decorations and the rich-text toolbar.

## 0.2.0 — 2026-07-16

- Renamed and standardized the plugin folder and ID as `siyuan-yemind-zen`.
- Kept the SiYuan display name as `YeMind Zen`.
- Completely replaced the transitional runtime with a source-built TypeScript + Vite runtime.
- Adopted `simple-mind-map` as the active editor core.
- Added persistent map repository and automatic saving.
- Added Dock map creation, opening, link copying, renaming and confirmed deletion.
- Added stable tab reuse for the same map.
- Added node editing, child/sibling insertion, deletion, drag hierarchy changes, undo and redo.
- Added canvas pan, zoom, fit, layouts, read-only, zen and fullscreen modes.
- Added native SiYuan context menus and a KMind-Zen-inspired top/left/bottom interface.
- Added global settings and 15 automated tests.

## 0.1.0 — 2026-07-16

- Created the YeMind Zen project and green `Ye` icon.
- Added the initial TypeScript/Vite source skeleton.
- Added `simple-mind-map` as the planned editor core.
- Kept a temporary transitional runtime for installation testing.
