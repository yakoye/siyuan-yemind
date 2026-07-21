# Changelog

## 0.5.6 — 2026-07-17

- Performed a stability-only regression pass without adding new features.
- Added complete context-menu surface coverage and corrected availability for read-only, root, generalization, rich-text selection, and code-block states.
- Hardened root deletion, targeted summary deletion, and right-click primary-node promotion during multi-selection.
- Registered the complete Quill font and size attributors and preserved rich-text selections while toolbar controls are used.
- Unified node hyperlinks and inline links under the same protocol validation and configured external-window behavior through the upstream `customHyperlinkJump` hook.
- Made map creation, rename, update, deletion, and settings persistence transactional so failed storage writes do not mutate committed in-memory state.
- Serialized saves and settings updates, prevented stale autosave completions from reporting newer data as saved, and retried dirty editor data when closing.
- Deferred restored-tab mounting until storage readiness, cleaned failed registrations, and made repeated tab-close requests idempotent.
- Added safe local-image loading with visible failure reporting instead of unhandled promise rejection.
- Kept node/subtree dragging, selection, zoom, fit, view reset, layout, history, summaries, and associative lines on the existing `simple-mind-map` paths.
- Expanded automated regression coverage for menus, text selection tools, toolbar controls, settings completeness, lifecycle operations, drag/view configuration, and persistence failure paths.

## 0.5.5 — 2026-07-17

- Completed summary handling by keeping native `ADD_GENERALIZATION` range parsing and adding precise add/remove menu states.
- Added native removal for the selected summary node and native removal of all summaries owned by a selected normal node.
- Added a compact associative-line state toolbar driven by upstream `associative_line_click` and `associative_line_deactivate` events.
- Added direct native actions for editing relation text, deleting the active line, cancelling line creation, and Esc cancellation.
- Exposed only four upstream-backed settings: default summary text, default relation text, line z-order, and endpoint/control-point adjustment.
- Added immutable persistence cleanup for missing or duplicate relation targets while preserving aligned point, control-offset, text, and style data.
- Treated generalization UIDs as valid relation endpoints during cleanup.
- Added focused tests for upstream range-summary behavior, native relation methods, relation UI states, relation settings, and deletion cleanup.

## 0.5.4 — 2026-07-16

- Exposed `simple-mind-map` native box selection through a persistent pan-priority / selection-priority toggle.
- Kept selection ownership in the upstream `Select` plugin and Ctrl/Cmd node toggling in `MindMapNode`; no custom selection rectangle or active-node state was added.
- Kept batch subtree movement in the upstream `Drag` plugin, which filters selected descendants to top-level selected subtrees before `MOVE_NODE_TO`, `INSERT_BEFORE`, or `INSERT_AFTER`.
- Added a compact selected-node count that appears only for multi-selection.
- Added accurate help and settings guidance for Ctrl/Cmd-click, box selection, selection-priority mode, and dragging any selected node to move the batch.
- Added contract tests against the installed upstream Select, MindMapNode, and Drag implementations.

## 0.5.3 — 2026-07-16

- Added same-map node subtree copy, cut and paste by delegating directly to `simple-mind-map` native `Render.copy`, `Render.cut` and `Render.paste` methods.
- Kept Ctrl/Cmd+C, Ctrl/Cmd+X and Ctrl/Cmd+V under the upstream `KeyCommand` implementation instead of adding a second keyboard listener.
- Enabled the upstream in-memory clipboard path with `disabledClipboard: true`, avoiding browser clipboard permission failures for same-map operations.
- Preserved complete subtrees and relied on upstream top-ancestor filtering so selecting a parent and descendant does not duplicate the descendant subtree.
- Relied on native `CUT_NODE`, `PASTE_NODE` and `INSERT_MULTI_CHILD_NODE` commands for fresh node IDs, activation, history, rendering and autosave events.
- Added copy, cut and paste entries to the native SiYuan node context menu without introducing a second clipboard data format.
- Added focused regression tests for renderer delegation, native shortcut ownership, top-ancestor filtering and complete subtree cloning.

## 0.5.2 — 2026-07-16

- Removed YeMind Zen's custom node-drag viewport capture/restore layer and delegated drag movement, subtree movement, sibling insertion and layout recalculation entirely to `simple-mind-map`.
- Locked the stable editor path to native structured drag; removed the experimental free-drag and post-drag viewport restoration controls from settings.
- Kept edge auto-pan as the only optional native drag behavior and left it disabled by default.
- Fixed restored SiYuan tabs opening before map storage was loaded by deferring editor mounting until plugin readiness.
- Prevented tabs closed during startup from mounting an editor after asynchronous loading finishes.
- Serialized repository writes so an older asynchronous save cannot overwrite a newer map snapshot.
- Flushed a pending autosave before destroying a tab editor, reducing edit loss when a tab is closed quickly.
- Added focused regression tests for native drag lifecycle, restored-tab startup, serialized saves and editor close-time flushing.

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
