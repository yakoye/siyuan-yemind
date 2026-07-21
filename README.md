# YeMind Zen

YeMind Zen is a local-first mind-map plugin for SiYuan, powered by `simple-mind-map`.

- Plugin folder and ID: `siyuan-yemind-zen`
- Display name: `YeMind Zen`
- Version: `0.5.13`

v0.5.13 fixes two structured-drag regressions found in SiYuan 3.7.2: the old parent connection is hidden for the whole drag session, and target preview now uses the verified KMind Zen rectangle/tail/lane geometry instead of upstream pointer/quadrant hit testing. Pending targets continue settling by animation frame, mixed layouts choose guide orientation per target, and final structure changes remain owned by upstream `MOVE_NODE_TO`, `INSERT_BEFORE`, and `INSERT_AFTER`.

v0.5.12 added IME-safe transactional outline editing, indent/outdent, caret restoration, a persisted split divider, and the official 60 ms/3-frame drag stability contract. Existing map storage, checkpoints, diagnostics isolation, startup restoration, and upstream history remain unchanged.

See `README_zh_CN.md`, `FEATURE_MATRIX.md`, and `DEVELOPMENT_PLAN.md` for details.

## Development workflow

YeMind Zen development follows the project rules in `AGENTS.md` and the bundled Superpowers skills under `.agents/skills/`. See `docs/superpowers/DEVELOPMENT_REQUIREMENTS.md` for the adapted workflow and completion gates. These development resources do not change the plugin runtime or map data format.
