# YeMind Zen

YeMind Zen is a local-first mind-map plugin for SiYuan, powered by `simple-mind-map`.

- Plugin folder and ID: `siyuan-yemind-zen`
- Display name: `YeMind Zen`
- Version: `0.5.3`

v0.5.3 adds same-map subtree copy, cut and paste through the native `simple-mind-map` renderer and command pipeline. It deliberately keeps clipboard shortcuts under the upstream `KeyCommand` implementation and uses its permission-free in-memory fallback instead of introducing another clipboard state layer.

See `README_zh_CN.md`, `FEATURE_MATRIX.md`, and `DEVELOPMENT_PLAN.md` for details.
