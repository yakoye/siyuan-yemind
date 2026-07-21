# YeMind Zen

YeMind Zen is a local-first mind-map plugin for SiYuan, powered by `simple-mind-map`.

- Plugin folder and ID: `siyuan-yemind-zen`
- Display name: `YeMind Zen`
- Version: `0.5.14`

v0.5.14 adds the first source-driven KMind Zen visual-parity layer: curved parent-child edges by default, all 13 official theme families with light/dark variants, theme-defined rainbow branches, per-map theme/edge-route persistence, and all 14 layouts supported by the installed `simple-mind-map` runtime. Existing startup, outline, checkpoint and structured-drag contracts remain unchanged.

v0.5.12 added IME-safe transactional outline editing, indent/outdent, caret restoration, a persisted split divider, and the official 60 ms/3-frame drag stability contract. Existing map storage, checkpoints, diagnostics isolation, startup restoration, and upstream history remain unchanged.

See `README_zh_CN.md`, `FEATURE_MATRIX.md`, and `DEVELOPMENT_PLAN.md` for details.

## Development workflow

YeMind Zen development follows the project rules in `AGENTS.md` and the bundled Superpowers skills under `.agents/skills/`. See `docs/superpowers/DEVELOPMENT_REQUIREMENTS.md` for the adapted workflow and completion gates. These development resources do not change the plugin runtime or map data format.
