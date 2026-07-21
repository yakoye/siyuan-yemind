# Changelog

## 0.5.13 — 2026-07-17

- Traced the stale solid drag connection to upstream ownership: `hideChildren()` hides outgoing child lines, while the dragged node's incoming line is stored in `parent._lines[parent.children.indexOf(node)]`.
- Snapshotted and hid every dragged top-level node's incoming line for the whole drag session, then restored each line's original visibility after native drop/cancel cleanup.
- Replaced the remaining upstream pointer/quadrant preview detector with a pure rectangle-based intent adapter modeled from KMind Zen 0.33.0's production bundle.
- Added official child-tail and sibling-lane geometry: 80 px tails, 8/22 px child enter/leave padding, and 44/72 px sibling lane/end padding.
- Preserved official intent precedence: child tail, sibling lane when the clone center is outside the target body, child body, then sibling fallback.
- Continued animation frames while an intent is pending so a stationary pointer can still satisfy the 60 ms/3-frame stabilizer instead of waiting for another mousemove.
- Selected horizontal or vertical Bézier guide geometry from each actual target/original parent in mixed layouts instead of applying one orientation to the entire map.
- Kept final structural mutation entirely upstream-owned through `MOVE_NODE_TO`, `INSERT_BEFORE`, and `INSERT_AFTER`; no second history, layout, or persistence implementation was added.
- Added focused regressions for old incoming-line visibility, screenshot-equivalent upper-target switching, logical-left/mind-map/organization geometry, active leave padding, mixed-layout guide orientation, and fishbone fallback.

## 0.5.12 — 2026-07-17

- Studied the user-provided KMind Zen 0.33.0 production bundle and adopted Scheme C: transplant verified interaction mechanisms while keeping YeMind Zen's current data model and `simple-mind-map` structural ownership.
- Reworked outline editing into commit-before-structure transactions with UID-based caret restoration and structure-operation serialization.
- Added IME-safe Enter/Shift+Enter, Tab/Shift+Tab, empty deletion, visible-row navigation, and caret-boundary collapse/expand behavior.
- Added an adjustable right-side split divider with animation-frame updates, keyboard adjustment, reset, bounds, and persisted ratio.
- Replaced upstream's fixed 300 ms drag-check throttle with animation-frame scheduling, a 60 ms/3-frame candidate stabilizer, and cubic target/original-parent guides.
- Retained upstream `SET_NODE_TEXT`, node-structure commands, final drag commands, history, layout, persistence, and recovery behavior.

## 0.5.11 — 2026-07-17

- Analyzed the `yemind-diagnostics-20260717-130840.zip` runtime archive and proved that startup recorded `plugin/onload` but never reached `bootstrap-started`; the repository stayed unloaded until map creation called `ensureLoaded()`.
- Started the real repository/settings/checkpoint bootstrap before host-surface registration and isolated synchronous Tab, Dock, Settings, command, and plugin-URL registration failures.
- Added per-step startup diagnostics so a future host API failure identifies the exact registration without exposing an already-resolved readiness promise.
- Replaced the read-only outline list with shared editable split/full-outline controls.
- Added outline keyboard behavior: Enter inserts a sibling (root inserts a child), Tab inserts a child, empty Backspace/Delete removes a non-root node, ArrowUp/ArrowDown navigate visible rows, and Escape cancels the pending text edit.
- Delegated outline text and structure mutations to upstream `SET_NODE_TEXT`, `INSERT_NODE`, `INSERT_CHILD_NODE`, `REMOVE_NODE`, and `GO_TARGET_NODE` commands instead of modifying tree data directly.
- Kept split outline on the right, made full outline fill the workspace, added wrapped auto-growing editors, and preserved read-only selection/navigation.
- Added focused startup coordination, outline semantics, native command bridge, and layout regression tests.

## 0.5.10 — 2026-07-17

- Analyzed two diagnostics archives exported from SiYuan 3.7.2 and confirmed that all three real maps remained in persistent storage with no real `map-deleted` event.
- Moved map/checkpoint lifecycle regression into unique isolated temporary repositories so running diagnostics no longer inserts and removes a temporary map in the real Dock.
- Coalesced concurrent self-check requests and guaranteed temporary lifecycle storage cleanup.
- Deferred Dock rendering until repository readiness and deferred restored-tab editor construction until its container has a non-zero size.
- Added stale-tab handle detection and deferred activation while SiYuan is still creating a restored tab head element.
- Prevented `mindMap.resize()` from running while the canvas is hidden in outline mode and added bounded safe-resize retries when returning to map or split view.
- Changed todo badge clicks to toggle pending/completed only; deletion remains exclusively in the context-menu `删除待办` action.
- Added `YeMindDrag`, a thin subclass of upstream `Drag`, to draw a dashed guide from the drag clone to the upstream-selected target parent without changing `MOVE_NODE_TO`, `INSERT_BEFORE`, or `INSERT_AFTER`.
- Added focused regressions for repository isolation, concurrent diagnostics, zero-size visibility, restored-tab liveness, outline self-checks, todo semantics, and drag-guide target resolution.

## 0.5.9 — 2026-07-17

- Added a local diagnostics recorder with a bounded in-memory ring buffer and no automatic network upload.
- Added global `error` and `unhandledrejection` capture with sensitive-field redaction and per-session hashed map identifiers.
- Added a regression runner covering plugin storage probes, transactional map create/update/delete, checkpoint create/restore, tree integrity, checkpoint references, settings, and active editor state.
- Added lifecycle and interaction traces for tab mounting, editor data/view changes, autosave, toolbar actions, context-menu actions, rich-text commands, read-only changes, and view-mode changes without recording node text by default.
- Added a diagnostics dialog with run, start/stop recording, export, clear, and explicit opt-in for full map content.
- Added ZIP diagnostics export containing environment metadata, sanitized logs, regression results, settings, map/checkpoint summaries, and an optional clearly warned full-content attachment.
- Added a temporary storage probe file that is removed after each self-check and kept diagnostics isolated from normal map/checkpoint data.
- Added focused recorder, privacy, self-check, service, lifecycle, and integration regression tests without introducing another drag, selection, save, or history implementation.

## 0.5.8 — 2026-07-17

- Added a dedicated transactional `checkpoints.json` repository instead of embedding history in the main map document.
- Added named manual checkpoints containing immutable data, layout, theme, view and node-count snapshots.
- Added per-map retention of 20 checkpoints while preserving all recovery-protection snapshots from automatic deletion.
- Added safe restore that first flushes pending autosave data, creates a protected pre-restore checkpoint, then transactionally replaces the current map snapshot.
- Restored the active editor through the upstream `setFullData` API so data, layout, theme, view and native history are reinitialized together.
- Added a compact checkpoint menu and management dialog with time, node count, restore, rename and delete actions.
- Disabled restore in read-only mode while keeping checkpoint creation and history viewing available.
- Removed checkpoints after a map is successfully deleted without risking the primary map deletion transaction.
- Added focused persistence, retention, restore, presentation, plugin-lifecycle and editor-integration tests.

## 0.5.7 — 2026-07-17

- Registered the installed `simple-mind-map` native `OuterFrame` plugin without adding a separate boundary model.
- Added single-node outer frames and continuous-sibling multi-node outer frames through the native `ADD_OUTER_FRAME` command.
- Kept top-ancestor filtering, non-continuous range splitting, different-parent grouping, `groupId`, rendering, history, and relayout behavior in the upstream plugin.
- Added a compact active-frame toolbar that delegates text editing, stroke/fill color, solid/dashed border, text alignment, and deletion to native plugin methods.
- Added read-only guards at both menu/toolbar and command-adapter boundaries while preserving frame viewing.
- Added only three upstream-backed settings: default outer-frame text and horizontal/vertical padding.
- Added focused tests against the installed upstream range parser plus registration, command, presentation, settings, and editor-lifecycle regression tests.
- Added no custom frame coordinates, range calculation, migration layer, persistence sanitizer, or second history stack.

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
