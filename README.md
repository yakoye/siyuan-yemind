# YeMind Zen

YeMind Zen is a local-first mind-map plugin for SiYuan, powered by `simple-mind-map`.

- Plugin folder and ID: `siyuan-yemind-zen`
- Display name: `YeMind Zen`
- Version: `0.5.11`

v0.5.11 fixes startup restoration when a host-surface registration fails and turns split/full outline views into an editable outline backed by `simple-mind-map` native commands. Enter creates a sibling (or a child from the root), Tab creates a child, empty Backspace/Delete removes a non-root node, and arrow keys move between visible rows. Existing map storage and upstream structural algorithms remain unchanged.

See `README_zh_CN.md`, `FEATURE_MATRIX.md`, and `DEVELOPMENT_PLAN.md` for details.

## Development workflow

YeMind Zen development follows the project rules in `AGENTS.md` and the bundled Superpowers skills under `.agents/skills/`. See `docs/superpowers/DEVELOPMENT_REQUIREMENTS.md` for the adapted workflow and completion gates. These development resources do not change the plugin runtime or map data format.
