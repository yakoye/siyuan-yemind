# YeMind Zen v0.6.7 迁移状态

## 当前状态

- 数据格式无需迁移。
- 已保存的项目背景色继续使用原 `projectStyle.backgroundColor` 字段。
- 批注数据结构与存储语义不变，仅调整布局。
- 全局搜索仍使用当前 MapRepository 数据，不写入思源文档数据库。
- v0.5.10 至 v0.6.6 的全部交互契约继续纳入回归。
