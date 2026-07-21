# YeMind Zen v0.6.9 迁移状态

- 当前稳定版本：v0.6.9。
- 全局搜索继续使用思源原生 `#searchList` 与 `#searchPreview`，没有建立第二套搜索窗口。
- 原生结果为 0 时由插件临时恢复预览宿主；切换回思源结果时恢复宿主状态。
- 搜索打开仍复用既有 `openMapAtNode → pendingNodeTargets → focusNode` 管线。
- 旧导图数据、检查点和节点 UID 无需迁移。
