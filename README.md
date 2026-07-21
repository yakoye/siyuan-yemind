# YeMind Zen

YeMind Zen is a local-first mind-map plugin for SiYuan, powered by `simple-mind-map`.

- Plugin folder and ID: `siyuan-yemind-zen`
- Display name: `YeMind Zen`
- Version: `0.5.10`

v0.5.10 hardens the real SiYuan runtime path discovered through exported diagnostics: lifecycle self-checks are isolated from the real map repository, restored tabs wait for a visible container, outline mode avoids zero-size resize calls, todo checkboxes toggle without deletion, and structured node drag shows a dashed guide to the upstream-selected parent. No new map data format or second drag engine is introduced.

See `README_zh_CN.md`, `FEATURE_MATRIX.md`, and `DEVELOPMENT_PLAN.md` for details.
