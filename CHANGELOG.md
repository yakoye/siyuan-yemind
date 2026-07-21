# Changelog

## 0.5.1 — 2026-07-16

- Restored structured node dragging as the default so a moved node keeps its complete child subtree and the layout engine recalculates sibling spacing.
- Disabled drag-edge canvas auto-pan by default and added viewport capture/restore to prevent the whole map from flying away during node dragging.
- Added bounded validation for persisted zoom and canvas transforms; malformed or extreme saved positions are ignored.
- Added automatic cleanup of legacy free-drag `customLeft`/`customTop` coordinates when opening a map in structured mode.
- Preserved unnamed maps as `未命名导图` instead of dropping them during repository normalization.
- Serialized repository startup loading and mutations so a newly created map cannot be overwritten by a late storage load.
- Added `整理布局` to the left toolbar and node context menu using the native layout reset command.
- Expanded settings into General, Drag & Layout, Node & Content, and Shortcuts pages.
- Added drag mode, edge auto-pan, viewport preservation, saved-view restoration, canvas limits, zoom range, fit padding, and second/lower-level node spacing settings.
- Added plugin startup readiness gating so Dock, URL and top-bar actions wait for stored maps and settings before reading them.


## 0.5.0 — 2026-07-16

- Changed the node todo context menu into a direct three-state workflow: add, complete and remove, with no dialog.
- Replaced the faint comment indicator with a larger outlined note/comment icon and kept the multi-comment count badge.
- Added an optional compact active-node menu button beside node content.
- Added project search, previous/next navigation, current replacement and replace-all through the native Search plugin.
- Added map, split and outline views with click-to-locate outline rows.
- Added default map/split/outline, zen and read-only startup modes.
- Added a complete two-page settings dialog for canvas, node controls, links, code, cloze and shortcuts.
- Added shortcut recording, disabling, restoring defaults and conflict detection.
- Routed SiYuan's built-in plugin settings entry to the same complete settings window to avoid duplicate settings UIs.
- Added regression tests for todo transitions, node decorations, outline rendering, search commands, settings schema and shortcuts.

## 0.4.1 — 2026-07-16

- Rebuilt the comment dialog around explicit empty, view and edit states.
- Added comment timestamps and bottom-right vertical edit/delete controls.
- Added an immediately applied multi-comment workflow and confirmed “clear all” action.
- Moved todo state to a checkbox before the node text, with a green completed state.
- Kept comment access as a compact node-side message icon with a count for multiple comments.
- Removed the separate note feature from the menu and command layer.
- Migrated legacy node notes into comments without discarding existing text.
- Added regression tests for comment presentation, clear confirmation, todo placement, settings visibility and note migration.

## 0.4.0 — 2026-07-16

- Replaced the upstream RichText registration with a YeMind extension that persists links, inline code and language-aware code blocks.
- Added safe inline-link normalization for HTTP(S), mail, telephone and SiYuan block links.
- Added inline-link add, edit, remove and configurable open behavior.
- Added inline-code formatting and a complete code-block editor with language, indentation, wrapping, font size, remove-format and delete actions.
- Added live settings for autosave, rich toolbar visibility, links, code blocks, cloze display and node badges.
- Added configurable cloze hidden/blur rendering and hover reveal.
- Added node-badge visibility controls and live editor configuration updates.
- Added focused tests for link, code-block, settings, toolbar, custom RichText formats and badge settings.

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
