# YeMind Zen

YeMind Zen is a local-first mind-map plugin for SiYuan, powered by `simple-mind-map`.

- Plugin folder and ID: `siyuan-yemind-zen`
- Display name: `YeMind Zen`
- Version: `0.5.18`

v0.5.18 fixes the remaining outline focus-loss root cause by keeping the active keyed row in place during text-only model updates and preventing synchronous commit re-entry. It removes the six-dot handle in favor of whole-row pointer dragging with long-press protection inside editable text, adds horizontal hierarchy intent, restores repeatable collapse/expand, uses a math-font `π`, and replaces solid cloze blocks with shared Gaussian/glass blur for canvas and outline. Structural changes remain upstream-owned by `simple-mind-map` commands and history.

v0.5.17 rebuilds split/full-outline editing around stable UID-keyed rows and one persistent active Quill session. It adds IME-safe commits, non-destructive Backspace/Delete behavior, boundary-aware row navigation, and a dedicated drag handle on every movable outline row while keeping structural changes in upstream `simple-mind-map` commands and history. It also adds editable bidirectional HEX/RGB color inputs with event isolation, long-form notes with pasted images and resizable dialogs, hover previews for notes/comments, corrected TODO menu semantics, the `● 禅` capsule, `模糊/取消模糊`, the `π` formula affordance, problem-time diagnostic markers, and manifest/runtime/build version consistency checks.

v0.5.16 removed the node ellipsis button, split canvas/node context menus, removed comment counts, added target-specific node image paste/drop with upstream aspect-ratio resizing, and introduced the compact Zen exit capsule.

v0.5.15 isolated every YeMind editor overlay inside its own tab, fixed invisible node-edit text, preserved partial rich-text selection, and introduced one active outline Quill target.

See `README_zh_CN.md`, `FEATURE_MATRIX.md`, and `DEVELOPMENT_PLAN.md` for details.

## Development workflow

YeMind Zen development follows the project rules in `AGENTS.md` and the bundled Superpowers skills under `.agents/skills/`. See `docs/superpowers/DEVELOPMENT_REQUIREMENTS.md` for the adapted workflow and completion gates. These development resources do not change the plugin runtime or map data format.
