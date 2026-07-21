## 0.8.6 — 2026-07-21

- 将 159 个零散 Vitest 入口重组为 15 个功能域入口，测试输出更容易定位且保持场景模块独立。
- 按 contracts、storage、checkpoints、commands、outline、rich-text、drag、node-content、styles、UI、search、diagnostics、settings、advanced structures 和 user regressions 分类。
- 删除 1 个完全重复的插件身份测试文件和 2 条重复版本断言；所有真实用户反馈回归与现行功能契约均保留。
- 新增 `tests/suite-manifest.json` 与 `scripts/check-test-structure.mjs`，阻止未分类、未导入、重复或孤立测试进入发布流程。
- 新增测试架构说明与功能覆盖矩阵，明确 445 项测试对当前产品功能的覆盖关系。
- 测试入口由 159 个降至 15 个，完整测试耗时由基线约 9.29 秒降至约 7 秒，功能代码未改变。

## 0.8.5 — 2026-07-21

- 修复分屏模式中曾编辑过右侧大纲节点后，回到左侧画布新增节点会自动跳回旧大纲节点并再次进入编辑的问题。
- 新增画布/大纲编辑表面所有权协调器，同一时刻只有当前交互表面拥有编辑与焦点恢复权。
- 画布点击、画布节点激活和画布富文本开始会提交并关闭旧大纲编辑器，同时取消尚未执行的旧焦点恢复票据。
- 大纲焦点恢复改为显式事务：只有大纲自身的插入、缩进、删除、折叠等结构命令可以创建恢复票据，普通 `data_change` 不再推断旧编辑节点。
- 异步焦点恢复增加代次校验；画布接管或新大纲请求产生后，旧 `requestAnimationFrame` 恢复任务立即失效。
- 新增分屏旧焦点复活、画布接管、显式大纲插入恢复和异步票据失效的永久回归测试。

## 0.8.4 — 2026-07-21

- 修复节点结构拖动或同位拖动后，双击编辑框被一次零矩形更新移动到 `-6px / -4px`、节点原位空白且文字漂移的问题。
- 富文本编辑事务改为以稳定节点 UID 为身份，在打开、重定位、聚焦和提交前重新解析当前渲染节点实例。
- 编辑位置采用“有效 DOM 矩形 → SVG `getScreenCTM()` 重建 → 最后有效锚点”的回退链，零尺寸和脱离 DOM 的矩形不再覆盖正确位置。
- 完成编辑时将文字提交到重绘后的当前节点实例，避免拖动后仍写入旧渲染节点。
- 诊断新增原始矩形、有效锚点、矩形来源、元素连接状态和实时节点重绑定信息。
- 新增结构拖动后隐藏 SVG 零矩形、屏幕矩阵恢复、失效节点重绑定和当前节点提交的永久回归测试。

## 0.8.3 — 2026-07-21

- 修复画布节点双击后编辑框留在原位空白、文字漂移到页面左上角的问题；富文本编辑层改用编辑器局部绝对坐标。
- 新节点、默认节点和从未编辑过的节点双击后自动全选，可直接粘贴、剪切或替换默认文字。
- 已编辑节点双击后光标落在文字末尾，并完整支持 Ctrl/Cmd+A、复制、剪切、粘贴、Backspace、Delete、方向键和中文输入法。
- 分屏和纯大纲统一使用同样的文本编辑优先级，Ctrl/Cmd+A 只选择当前节点文字，不触发结构快捷键。
- 修复上游预注册 RichText 导致 YeMind 自定义富文本插件未真正生效的问题，按 `instanceName` 替换同名插件。
- 新增真实 `simple-mind-map + SVG + Quill` 编辑定位、首次全选、末尾光标、剪贴板快捷键和大纲选区回归测试。

## 0.8.2 — 2026-07-21

- Dock、顶栏和菜单中的 YeMind 图标改为使用 `currentColor` 的纯 SVG 矢量图标。
- 修复 Dock 激活后蓝色背景上仍显示固定绿色图标、对比度不足的问题。
- 品牌原色图标继续用于关于页和产品展示，交互图标自动适配浅色、深色及激活主题。
- 新增 Dock 图标主题适配回归测试。

## 0.8.1 — 2026-07-21

- Changed the current SiYuan manifest ID and installed folder contract to `siyuan-yemind`.
- Switched runtime icon/resource URLs and diagnostics identity to the current ID.
- New plugin links use `siyuan-yemind`; historical `siyuan-yemind-zen` links remain readable.
- Added direct-overwrite installation guidance for `data/plugins/siyuan-yemind/`.
- Added non-destructive first-start migration from `data/storage/petal/siyuan-yemind-zen/` when the new identity has no corresponding maps, settings or checkpoints.
- Added release gates that prevent the old ID from returning as the active manifest or resource path.

## 0.8.0 — 2026-07-21

- Rebranded the public product from YeMind to YeMind across the plugin manifest, settings, search, diagnostics, Dock, tabs and current documentation.
- Renamed the npm engineering package and source plugin entry to `siyuan-yemind` and `YeMindPlugin`.
- Replaced the old square `Ye` artwork with the user-provided mind-map logo in transparent 32, 64, 128 and 512 pixel assets.
- Normalized every visible icon pixel to the exact theme color `#176B50`.
- Kept the permanent SiYuan plugin ID `siyuan-yemind-zen` so upgrades continue to read existing maps, settings, checkpoints and plugin URLs.
- Published the renamed release artifact as `siyuan-yemind-v0.8.0.zip`.

## 0.7.1 — 2026-07-21

- Fixed global-search navigation failures caused by SiYuan close controls that are SVG or non-HTMLElement elements without a callable `.click()` method.
- Added a safe close adapter that activates HTML buttons or dispatches a bubbling synthetic click for SVG controls, with Escape fallback.
- Ensured closing the search surface can never block opening the target map; Enter, double-click and the preview “打开导图” button now share the same protected path.
- Improved diagnostics self-checks so a navigation attempt stalled at Enter/close/open stages is reported as failed instead of a false pass.
- Added permanent regressions reproducing the real `close2.click is not a function` diagnostic failure.
- Aligned package, manifest, runtime, build metadata, About and release documentation at 0.7.1.

## 0.7.0 — 2026-07-21

- Added a dedicated Settings → About page with product identity, release highlights, manifest/runtime/build/SiYuan versions, build metadata and official KMind reference.
- Added one-click version copying, Diagnostics opening and diagnostics archive export from About.
- Established a semantic-versioning policy and a release identity gate covering package, manifest, runtime, build metadata, About, diagnostics, documentation, archive name and verification report.
- Upgraded diagnostics archives to schema v3 with separate summary, environment, version consistency, event timeline, global-search state, active editor state, self-check results, errors, problem markers and a privacy-safe DOM structure snapshot.
- Instrumented the complete global-search path: query changes, native/YeMind counts, list/preview mounting, selection, Enter capture, search close, tab opening, editor readiness, ancestor expansion, node selection, centering and highlight success/failure.
- Added a guided reproduce → mark problem → export workflow and global-search self-check status in the diagnostics dialog.
- Added permanent regressions for About, version consistency, structured archives and the global-search diagnostic event chain.
- Aligned package, manifest, runtime, build metadata, About, diagnostics and tests at 0.7.0.

# Changelog

## 0.6.9 — 2026-07-21

- Restored YeMind outline previews when SiYuan has no native search result.
- Kept exact numeric and Chinese leaf matches selected after host DOM rebuilds.
- Closed global search before Enter/double-click navigation and preserved right-split intent.
- Added delayed target-node highlighting after ancestors expand and the editor renders.
- Added permanent regressions for hidden preview hosts, exact leaf matches and search-dialog navigation.
- Aligned package, manifest, runtime, diagnostics and tests at 0.6.9.


## 0.6.8 — 2026-07-21

- Replaced the detached global-search card with native list integration inside SiYuan's `#searchList` result column.
- Rendered one result per matching map node with highlighted node content, source labels and right-aligned map/node paths.
- Added a read-only outline context preview inside `#searchPreview` without destroying SiYuan's native Protyle preview.
- Added single-click preview, double-click/Enter open, Alt+click/Alt+Enter right-split open, arrow navigation and PageUp/PageDown behavior.
- Added MutationObserver recovery for host result/preview rebuilds, duplicate prevention, native empty-state suppression and complete unload cleanup.
- Added a sanitized real-structure SiYuan global-search fixture and permanent integration regressions for placement, preview, keyboard, host rebuild and right-split propagation.
- Aligned package, manifest, runtime, diagnostics and tests at 0.6.8.

## 0.6.7 — 2026-07-21

- Reused the shared 52-color HEX/RGB palette for the whole-map custom background.
- Mounted YeMind global-search results at the top of SiYuan's native result region and activated results on pointer-down.
- Right-aligned comment timestamps, per-comment actions and dialog footer actions.
- Kept all prior canvas rich-text, outline editing, folding, drag, search and style regressions in the release gate.
- Aligned package, manifest, runtime, diagnostics and tests at 0.6.7.

## 0.6.6 — 2026-07-20

- Remapped density presets: compact is 30/2, default inherits the former compact values, and comfortable inherits the former default values.
- Reduced the whole-map Style panel to a narrow minimal layout and removed density subtitles.
- Made SiYuan global-search results activate on primary mousedown before the host can remove the blurred result surface; click and Enter remain as fallbacks.
- Replaced the fit-view text glyph with a four-corner focus SVG.
- Added permanent regression coverage for density mappings, compact panel layout, early search activation and the fit icon.
- Aligned package, manifest, runtime, diagnostics and tests at 0.6.6.

## 0.6.5 — 2026-07-20

- Reassigned density presets so the former Compact spacing is now Default, the former Default/theme spacing is Comfortable, and a new tighter Compact preset reduces both horizontal and vertical gaps.
- Added editable horizontal and vertical custom spacing to whole-map Style, with normalization, persistence and checkpoint coverage.
- Made the whole-map Style panel close on an outside click without closing for interactions inside the panel.
- Queued SiYuan global-search node navigation while a map tab is still mounting, then focused the exact node once the editor becomes ready.
- Reused the shared 52-swatch Reset/More/HEX/RGB palette for node fill, border and text colors.
- Restored visible canvas rich-text editing by synchronizing the real node text color and safe edit background into the upstream Quill wrapper.
- Strengthened the permanent real-SVG double-click regression: enter edit, keep text visible, select a partial range, show the toolbar and apply Bold only to that range.
- Aligned package, manifest, runtime, diagnostic and test identity at 0.6.5.

## 0.6.4 — 2026-07-20

- Added a find-first project search surface whose left disclosure button reveals or hides the replace row without rebuilding the active query input.
- Added subtle leaf-node dots to split/full outline while excluding Root, branches and generalizations.
- Restricted outline hierarchy dragging to the blank gutter left of node text; pointer gestures starting on text remain editing and selection gestures.
- Integrated YeMind map title, node text, notes, comments, tags, links and TODO text into the SiYuan global-search surface, with click-through node navigation.
- Renamed the top project control to `样式`, kept node-context `节点样式` distinct, and added whole-map density, rainbow-line and background controls to the top and blank-canvas menu.
- Persisted whole-map style through maps, checkpoints and restore while retaining theme inheritance for legacy maps.
- Added permanent v0.6.4 find/replace, drag-boundary, global-search, project-style transaction and persistence tests, plus the complete historical regression matrix.
- Aligned package, manifest, runtime and diagnostic version identity at 0.6.4.

## 0.6.3 — 2026-07-20

- Replaced the bottom `选/拖` text with shared pointer and hand SVG icons; settings now uses the same icon choices and keeps the complete Select-first/Drag-first guidance.
- Added geometry-based note/comment hover placement that tries right, left, top and bottom positions, adapts to narrow canvases and never intentionally covers the source badge.
- Added compact right-aligned date/time metadata to comment hover previews.
- Made the top and bottom toolbars single-line, nonshrinking, horizontally scrollable surfaces so narrow editor tabs no longer wrap or clip controls.
- Reworked Note and Comment dialogs into compact internal-header layouts with local close controls, tighter cards, aligned metadata/actions and viewport-safe sizing.
- Unified the top-toolbar and node-context-menu `节点样式` entry on the same SVG and callback-backed style panel.
- Reorganized the node menu into Clipboard, Node Content, Style & Relations and Arrange & Collapse groups; only the inner items surface owns scrolling, eliminating the double scrollbar.
- Added plugin-owned clipboard SVGs instead of relying on uncertain host Cut/Paste icon names.
- Added permanent v0.6.3 regressions for canvas-mode icons, hover placement, comment timestamps, compact dialogs, responsive toolbars, menu grouping and single-scroll ownership while retaining all previous user-reported release gates.
- Aligned package, manifest, runtime and diagnostic version identity at 0.6.3.

## 0.6.2 — 2026-07-20

- Unified YeMind active, focus, selection and canvas-node highlight states around the plugin green `#176B50`.
- Renamed the canvas interaction modes to “选（选择优先）” and “拖（拖动优先）”, made new installs default to “选”, and aligned toolbar, settings and help wording.
- Moved the canvas mode control to the bottom bar immediately before Readonly.
- Reduced the left rail to History, Undo and Redo and replaced text/glyph controls with consistent SVG icons.
- Replaced Search, Readonly, Zen and Zen Exit text glyphs with plugin-owned SVG icons.
- Added permanent v0.6.2 visual-language and toolbar-location regressions while retaining all previous folding, editing, right-drag, rich-text, outline and node-content gates.
- Aligned package, manifest, runtime and diagnostic version identity at 0.6.2.

## 0.6.1 — 2026-07-20

- Prevented split/full-outline text selection from ever arming whole-row structure dragging while the persistent Quill host is active; `.ql-editor`, contenteditable descendants and the complete active outline editor surface own pointer selection.
- Kept deliberate whole-row hierarchy dragging available only outside text-editing mode, retaining the existing movement and long-press thresholds for non-editing labels.
- Consolidated the top toolbar by removing Add Child, Add Sibling, Checkpoints, Undo and Redo while retaining the requested single search entry.
- Added visible icon-and-text `线型` and `节点样式` project controls to the top toolbar.
- Replaced the left Reset View entry with `历史`, backed by the existing checkpoint/history dialog; left Fit was removed, while Undo/Redo remain.
- Removed bottom Search and kept bottom Fit as the only fit-view entry outside the clickable brand.
- Moved Note and Comment close controls into the top-right corner of their own dialog content and hid the detached SiYuan host header close surface.
- Changed the YeMind brand and current-map title chips from black to the plugin icon green.
- Added permanent v0.6.1 regressions for outline text-selection ownership, toolbar surface uniqueness, dialog-local close controls and icon-green branding, while retaining the accumulated folding, deletion, right-drag, canvas rich-text and quick-action matrices.
- Aligned package, manifest, runtime and diagnostic version identity at 0.6.1.

## 0.5.23 — 2026-07-20

- Restored reliable canvas-node rich-text selection after right-button panning by ending the gesture on window-level mouseup and blur, not only on map-local mouseup.
- Removed the editor-root-wide `user-select: none` drag rule and explicitly forced the canvas Quill edit wrapper, container and editor to remain selectable with a text cursor.
- Cancelled any stale canvas right-drag session before an upstream text editor opens.
- Isolated pointer, mouse, double-click and context-menu events inside the canvas rich-text editor so node dragging, box selection and canvas gestures cannot steal text selection.
- Classified the complete `.smm-richtext-node-edit-wrap` surface as editable, keeping Delete/Backspace inside canvas Quill as well as outline Quill.
- Added a real SVG/Quill integration regression that double-clicks a rendered node, selects only part of its label, shows the shared toolbar, clicks Bold and Underline and verifies only the selected range changes.
- Added a permanent user-reported regression matrix covering node quick controls, Root/branch expansion from persisted children, canvas/outline editing isolation and right-drag cleanup.

## 0.5.22 — 2026-07-20

- Fixed collapsed branch and Root expansion by checking persisted `nodeData.children` instead of the empty live `node.children` list before dispatching `SET_NODE_EXPAND`.
- Routed both outline disclosure triangles and canvas hidden-count buttons through the same explicit native expand command; outline disclosure no longer runs navigation first.
- Classified the outline editor host and descendants as editable targets and protected an active Quill session during the Root capture phase.
- Stopped Backspace/Delete at the outline bubble boundary after Quill/default editing, preventing the upstream window shortcut from deleting the node; already-empty non-Root rows retain explicit structural deletion.
- Added right-button canvas panning in both canvas modes with a 5 px movement threshold, grabbing cursor, incremental pan fallback in pan mode, and post-drag context-menu suppression for both nodes and blank canvas.
- Added focused regressions for collapsed live-node expansion, Root expansion, editable-host recognition, right-drag gesture thresholds, pan/select behavior and menu suppression.

## 0.5.21 — 2026-07-20

- Fixed a three-layer Root collapse conflict: editor startup no longer rewrites `expand: false`, outline flattening no longer forces Root open, and Root rows now render the same disclosure control as other branches.
- Made split/full-outline collapse and expansion read and write the same persisted `expand` field for Root and ordinary branches.
- Made collapsed node count pills explicit expand controls, including Root, and added a controller regression proving count clicks route to `SET_NODE_EXPAND(..., true)`.
- Updated quick actions so unselected expanded nodes show no controls, selected leaves show `+`, selected expanded branches show `−` and `+`, and every collapsed branch shows only the hidden-descendant count.
- Unified `+` and `−` to the existing compact minus-button dimensions, typography, stroke weight, border and hit area.
- Added Root persistence, repeatable Root disclosure, count-click routing, selection visibility and native Root expand-command regression coverage.

## 0.5.19 — 2026-07-18

- Added explicit structural deletion for empty non-root outline rows: Backspace/Delete discards the empty editor host, removes the matching node through the command adapter, and restores focus to a neighboring visible row.
- Separated outline disclosure from canvas node `expand` data by introducing editor-local collapsed UID state consumed by flattening, signatures, rendering, and keyed patching.
- Restored repeatable Root and branch collapse/expand and pruned disclosure entries when nodes disappear or lose their children.
- Routed canvas Backspace/Delete through capture-phase interception and the upstream `beforeShortcutRun` safety resolver, filtering Root nodes before `REMOVE_NODE` and preventing the KMind multi-Root error dialog.
- Added mixed-selection deletion regression coverage to guarantee upstream delete commands never receive Root nodes.
- Added subtle four-level repeating VS Code-style indent guides without new row DOM or pointer interception.
- Added focused regression tests for empty deletion, Root disclosure round trips, map/outline expansion independence, stale-state pruning, shortcut safety, mixed Root deletion, and indent guides.

## 0.5.18 — 2026-07-18

- Reworked split/full-outline reconciliation so ordinary text commits never move or reinsert the active Quill row; consecutive Backspace/Delete edits now keep the same browser focus and selection.
- Added a commit re-entry guard and reasoned `commitAndDetach()` boundary so synchronous `data_change` callbacks and structure moves cannot write an accidental empty label that renders as a tiny circle.
- Replaced the six-dot HTML5 drag handle with whole-row Pointer Events: row chrome drags immediately, while editable text requires a deliberate long press plus movement so normal caret placement and selection remain available.
- Added geometry-based horizontal depth intent in addition to before/inside/after vertical slots, allowing same-level reorder, child placement and leftward outdent through upstream `MOVE_NODE_TO`, `INSERT_BEFORE` and `INSERT_AFTER` commands.
- Fixed repeatable collapse/expand by resolving from the latest row state, stopping click-through, using a noninteractive leaf placeholder and clearing impossible focus restoration when a collapsed subtree hides the active row.
- Added a dedicated math-font, bold `π` formula symbol with an accessible label.
- Replaced the solid cloze block with shared canvas/outline Gaussian and glass blur presentation; hover restores readable, selectable text while hidden mode remains fully hidden.
- Added focused regressions for stable active-row DOM, repeated Delete commits, synchronous commit re-entry, text-vs-structure signatures, whole-row drag thresholds, horizontal hierarchy resolution, leaf placeholders and collapse round trips.

## 0.5.17 — 2026-07-18

- Studied the user-supplied KMind Zen 0.34.0 bundle and adapted its stable outline-row, explicit structure-transaction, note-image, note-resize, and root-Enter interaction mechanisms without importing the private KMind document kernel.
- Replaced full outline rerenders with stable UID-keyed row patching; the active Quill host, selection, IME composition, and local draft survive ordinary map saves and `data_change` events.
- Made empty text a valid rich-text commit and separated text deletion from structural node deletion; Backspace/Delete inside outline editing never removes a node.
- Added boundary-aware row navigation, IME-safe Enter/Shift+Enter/Tab/Shift+Tab handling, and pre-armed focus restoration for synchronous structure changes.
- Added a dedicated drag handle to every movable outline row, with before/inside/after drop zones mapped to upstream `INSERT_BEFORE`, `MOVE_NODE_TO`, and `INSERT_AFTER`.
- Added editable HEX/RGB fields with validation, real-time bidirectional conversion, live application, Escape rollback, saved selection restoration, and keyboard/input/composition isolation from the node editor.
- Added long-form node notes, sanitized rich HTML, pasted note images, persisted resizable note dialogs, separate note/comment badges, hover previews, and reliable custom menu SVG icons.
- Changed the Zen capsule to `● 禅` / `● 退出禅模式`, changed UI cloze wording to `模糊/取消模糊`, and changed the formula affordance from `Fx` to `π` while preserving existing data formats.
- Simplified TODO context-menu semantics to `添加待办/删除待办`; completion remains a checkbox-only state toggle.
- Expanded diagnostics with problem markers, ± event windows, outline edit/IME/drag transactions, high-frequency view-event coalescing, and manifest/runtime/build version consistency checks.
- Corrected the runtime version constant that had remained at 0.5.13 and aligned package, manifest, build, and diagnostic versions at 0.5.17.

## 0.5.16 — 2026-07-18

- Removed the node ellipsis menu and its obsolete setting; comment badges no longer display counts.
- Split blank-canvas and node context menus and constrained the long node menu to a thin scroll surface.
- Added target-specific local image paste/drop and retained upstream natural-size/aspect-ratio resizing.
- Added the compact Zen exit capsule and updated outline deletion semantics so editing text does not implicitly remove nodes.

## 0.5.15 — 2026-07-18

- Studied KMind Zen 0.33.0 selection-toolbar, persistent rich editor and overlay-mounting behavior, then adapted the verified mechanisms without importing its private document kernel.
- Root-scoped all editor overlays and established an isolated local stacking context so YeMind toolbars, search surfaces and rich editors no longer render above SiYuan Settings or unrelated host dialogs.
- Fixed invisible/white node-edit text by explicitly inheriting node color and text fill for the upstream rich-text editor, caret and selection.
- Disabled automatic whole-node selection on edit entry so users can select and format only part of a node label.
- Replaced separate text/background reset “X” controls with palette popovers containing swatches, one Reset Default action, native custom color selection and EyeDropper support with a safe fallback.
- Introduced a shared `RichTextFormattingTarget` contract so canvas node editing and outline editing use the same toolbar actions and dialogs.
- Replaced plain-text outline rows with preserved rich HTML and one active Quill session, enabling partial-selection bold, italic, underline, strike, inline code, code block, color, background, font, size, link, cloze, formula and clear-format actions in split and full-outline views.
- Kept all rich HTML persistence on upstream `SET_NODE_TEXT` rich-text mode; map structure, history, checkpoints and repositories remain unchanged.
- Added focused regressions for local overlay ownership, edit-text visibility, palette/reset/eyedropper behavior and partial outline selection formatting.
## 0.5.14 — 2026-07-17

- Studied KMind Zen 0.33.0 theme, appearance, layout and edge-route runtime instead of deriving styles from screenshots.
- Changed new and migrated maps to the logical `kmind-default` preset with curved parent-child edges by default.
- Added all 13 official KMind theme families available in the supplied bundle, mapped to `simple-mind-map` light/dark theme fields without importing the private KMind document kernel.
- Added live SiYuan light/dark appearance following, per-map theme selection, per-map edge route selection, and checkpoint-safe persistence.
- Registered the upstream `RainbowLines` plugin and enabled theme-defined rainbow branches for official presets that request them.
- Expanded the layout selector to all 14 layouts supported by the installed `simple-mind-map` runtime, including timeline, vertical timeline and fishbone variants.
- Kept existing user node-spacing settings authoritative when a theme is applied and preserved v0.5.10-v0.5.13 startup, outline, checkpoint and drag contracts.
- Added a maintained official-feature parity matrix so later batches can move node styling, advanced edge routes, outline inspector, import/export and other official functions without creating duplicate kernels.

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

- Studied the user-provided KMind Zen 0.33.0 production bundle and adopted Scheme C: transplant verified interaction mechanisms while keeping YeMind's current data model and `simple-mind-map` structural ownership.
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

- Removed YeMind's custom node-drag viewport capture/restore layer and delegated drag movement, subtree movement, sibling insertion and layout recalculation entirely to `simple-mind-map`.
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
- Kept the SiYuan display name as `YeMind`.
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

- Created the YeMind project and green `Ye` icon.
- Added the initial TypeScript/Vite source skeleton.
- Added `simple-mind-map` as the planned editor core.
- Kept a temporary transitional runtime for installation testing.