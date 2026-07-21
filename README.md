# YeMind Zen

YeMind Zen is a local-first mind-map plugin for SiYuan, powered by `simple-mind-map`.

- Plugin folder and ID: `siyuan-yemind-zen`
- Display name: `YeMind Zen`
- Version: `0.6.9`

## v0.6.9: exact-match preview and search navigation stability

- Keeps the outline preview visible when SiYuan has zero native matches.
- Exact numeric and Chinese leaf matches retain ancestor context.
- Enter/double-click closes global search, opens the map, focuses and briefly highlights the target node.
- Alt+Enter and Alt+click preserve right-side opening.

## v0.6.8: native SiYuan global-search integration

- YeMind matches are native-style entries inside SiYuan's result list instead of a detached card in the search header.
- Each result shows highlighted node content, a source label, and a right-aligned map/node path.
- Single click opens a read-only outline context preview; double click or Enter opens and focuses the map node.
- Alt+click/Alt+Enter use right-split opening, while arrow and PageUp/PageDown navigation remain available.
- Host list/preview rebuilds are recovered without duplicate injection.

## v0.6.7: shared project colors and native search placement

- Whole-map background uses the shared 52-color editable HEX/RGB palette.
- Global search results render at the top of the native result region and open on pointer-down.
- Comment timestamps and actions are right-aligned.

## v0.6.7: compact style panel and reliable search opening

- Compact is fixed at horizontal 30 / vertical 2. Default and Comfortable inherit the previous Compact and Default presets.
- The whole-map Style panel is narrowed to 220 px, removes density subtitles and uses compact spacing controls.
- SiYuan global-search matches open on primary mousedown so host blur/re-render cannot swallow the result click; map opening remains the guaranteed fallback before node focus.
- Fit View uses a four-corner focus SVG.



v0.6.5 redefines whole-map density presets, adds custom horizontal/vertical spacing, closes Style on outside click, makes SiYuan search navigation survive tab startup, unifies Node Style colors on the shared 52-swatch HEX/RGB palette, and hardens visible partial-range canvas rich-text editing. The full accumulated regression matrix remains a release gate.

v0.6.4 adds a find-first expandable replace surface, subtle outline leaf markers, a text-safe left-gutter structure drag boundary, SiYuan global-search results for map and node content, and a whole-map Style surface for density, rainbow lines and background. Whole-map style persists through map storage and checkpoints while node-context Node Style remains local to selected nodes.

v0.6.3 replaces the bottom Select/Drag text with shared pointer and hand icons, adds badge-safe adaptive note/comment previews with comment timestamps, keeps top and bottom tools usable in narrow tabs, compacts the Note/Comment dialogs, unifies both Node Style entries, and reorganizes the node context menu into one-scroll grouped sections. The complete accumulated regression matrix remains a release gate.

v0.6.2 unifies YeMind selection, focus and editing states around the plugin green, aligns canvas modes as Select-first and Drag-first, defaults new installs to Select-first, consolidates the left rail to History/Undo/Redo, and replaces Search, History, Undo, Redo, Readonly and Zen text glyphs with plugin-owned SVG icons. The complete accumulated regression matrix remains a release gate.

v0.6.1 gives the active split/full-outline Quill editor complete pointer-selection ownership, so drag-selecting text no longer starts structural row dragging. It consolidates the top/left/bottom tool surfaces, exposes icon-and-text Line Style and Node Style controls, moves Checkpoint/History to the left rail, places Note/Comment close controls inside their dialogs, and uses the plugin icon green for the brand and current-map chips. The accumulated user-reported regression matrix remains a release gate.

v0.5.19 makes empty non-root outline rows structurally deletable, separates outline disclosure from canvas `expand` data, restores repeatable Root and branch collapse/expand, and prunes stale disclosure state. Canvas Delete/Backspace now passes through a capture-phase and `beforeShortcutRun` safety boundary that filters Root nodes before any upstream delete command can show the multi-Root error dialog. The outline also gains subtle repeating VS Code-style indent guides.

v0.5.18 fixes the remaining outline focus-loss root cause by keeping the active keyed row in place during text-only model updates and preventing synchronous commit re-entry. It removes the six-dot handle in favor of whole-row pointer dragging with long-press protection inside editable text, adds horizontal hierarchy intent, restores repeatable collapse/expand, uses a math-font `π`, and replaces solid cloze blocks with shared Gaussian/glass blur for canvas and outline. Structural changes remain upstream-owned by `simple-mind-map` commands and history.

v0.5.17 rebuilds split/full-outline editing around stable UID-keyed rows and one persistent active Quill session. It adds IME-safe commits, non-destructive Backspace/Delete behavior, boundary-aware row navigation, and a dedicated drag handle on every movable outline row while keeping structural changes in upstream `simple-mind-map` commands and history. It also adds editable bidirectional HEX/RGB color inputs with event isolation, long-form notes with pasted images and resizable dialogs, hover previews for notes/comments, corrected TODO menu semantics, the `● 禅` capsule, `模糊/取消模糊`, the `π` formula affordance, problem-time diagnostic markers, and manifest/runtime/build version consistency checks.

v0.5.16 removed the node ellipsis button, split canvas/node context menus, removed comment counts, added target-specific node image paste/drop with upstream aspect-ratio resizing, and introduced the compact Zen exit capsule.

v0.5.15 isolated every YeMind editor overlay inside its own tab, fixed invisible node-edit text, preserved partial rich-text selection, and introduced one active outline Quill target.

See `README_zh_CN.md`, `FEATURE_MATRIX.md`, and `DEVELOPMENT_PLAN.md` for details.

## Development workflow

YeMind Zen development follows the project rules in `AGENTS.md` and the bundled Superpowers skills under `.agents/skills/`. See `docs/superpowers/DEVELOPMENT_REQUIREMENTS.md` for the adapted workflow and completion gates. These development resources do not change the plugin runtime or map data format.
