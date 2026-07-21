# YeMind Zen

YeMind Zen is a local-first mind-map plugin for SiYuan, powered by `simple-mind-map`.

- Plugin folder and ID: `siyuan-yemind-zen`
- Display name: `YeMind Zen`
- Version: `0.5.12`

v0.5.12 studies the user-provided KMind Zen 0.33.0 public production bundle and ports its interaction mechanisms without importing its private editor state, persistence, history, or layout engine. Split and full-outline views now use commit-before-structure transactions, IME-safe keyboard handling, precise focus restoration, indent/outdent and collapse/expand commands. The split divider is adjustable and persisted. Structured dragging keeps `simple-mind-map` target calculation and drop commands while replacing the upstream 300 ms overlap throttle with animation-frame sampling, a 60 ms/3-frame stable target, and smooth cubic parent guides.

See `README_zh_CN.md`, `FEATURE_MATRIX.md`, and `DEVELOPMENT_PLAN.md` for details.

## Development workflow

YeMind Zen development follows the project rules in `AGENTS.md` and the bundled Superpowers skills under `.agents/skills/`. See `docs/superpowers/DEVELOPMENT_REQUIREMENTS.md` for the adapted workflow and completion gates. These development resources do not change the plugin runtime or map data format.
