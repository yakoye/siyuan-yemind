# YeMind Zen v0.5.20 迁移状态

## 当前边界

本版继续保留 YeMind 的 `simple-mind-map` 数据、历史、检查点和持久化。官方 KMind Zen 0.34.0 的结构、主题、节点样式和概要交互被适配到现有上游命令层，没有引入官方私有文档模型或第二套导图仓库。

## 数据兼容

- 节点样式使用上游原生样式字段；旧图没有局部样式时继续继承主题。
- 大纲折叠状态改为读取原生 `expand`，不再维护独立折叠集合。
- 历史版本可能留下 `Root.expand=false`；打开时会恢复为 `true`，避免整图被隐藏。
- 既有 `generalization` 概要数据保持不变。

## 历史说明

旧版本迁移记录仍保留在 Changelog、Superpowers specs 和 verification 文档中。
