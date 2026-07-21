# YeMind Zen 启动恢复诊断分析（2026-07-17 13:08）

## 输入

- 诊断包：`yemind-diagnostics-20260717-130840.zip`
- 插件版本：`0.5.10`
- 思源版本：`3.7.2`
- 平台：Windows / Electron 42.6.1 / Chrome 148

## 用户现象

1. 完整替换插件并重启思源后，YeMind Zen Dock 显示“暂无导图”。
2. 思源恢复的旧导图标签显示“导图不存在，它可能已被删除”。
3. 创建一张新导图后，原有导图与新导图同时重新出现在 Dock 中。
4. 再次重启后问题重复出现。

## 诊断证据

### 1. 启动没有进入正式 bootstrap

事件序列开头只有：

```text
sequence 1  diagnostics/recording-started
sequence 2  plugin/onload
```

诊断中没有：

```text
plugin/bootstrap-started
plugin/bootstrap-completed
plugin/bootstrap-failed
```

说明 `onload()` 已经执行到记录启动事件，但在调用 `bootstrap()` 之前停止。

### 2. 自检时正式仓库仍是未加载空状态

自检结果中的正式导图库统计为：

```text
mapCount: 0
nodeCount: 0
```

同时没有打开编辑器。此时 Dock 和恢复标签读取到的是尚未加载的内存空仓库，而不是磁盘上的真实导图集合。

### 3. 创建新导图后旧导图重新出现

创建操作随后成功，最终诊断摘要中存在四张导图：三张原有导图和一张新建导图。

这说明原有数据没有被删除。创建路径调用 `MapRepository.ensureLoaded()`，首次真正读取 `maps.json`，于是旧导图与新导图一起进入内存并刷新 Dock。

## 根因

v0.5.10 的 `onload()` 顺序为：

```text
注册 Tab
注册 Dock
注册 Settings
注册 Commands
注册插件 URL 事件
启动 bootstrap
```

上述任一同步注册步骤抛出异常，都会提前中止 `onload()`。此时：

1. `bootstrap()` 没有启动；
2. `ready` 仍是类初始化时的已完成 Promise；
3. Dock 和恢复标签误以为数据已经就绪；
4. 正式 `MapRepository` 实际仍未加载；
5. 创建导图时才由 `ensureLoaded()` 被动补载真实数据。

诊断包能够证明故障发生在 `plugin/onload` 与 `bootstrap-started` 之间，但 v0.5.10 没有逐项注册日志，因此无法仅凭这份诊断确定究竟是 Tab、Dock、Settings、Commands 还是 URL 事件注册抛错。

## v0.5.11 修复策略

### 启动顺序

正式 bootstrap 先启动，再逐项注册宿主界面：

```text
启动 repository/settings/checkpoint bootstrap
注册 Tab
注册 Dock
注册 Settings
注册 Commands
注册插件 URL 事件
```

`whenReady()` 从一开始就指向真实 bootstrap Promise。

### 注册隔离

每个注册步骤独立 `try/catch`：

- 一个宿主界面失败，不阻止正式仓库加载；
- 后续注册仍继续；
- 诊断记录 `registration-started`、`registration-completed` 和失败步骤；
- 下一份诊断包可直接定位具体宿主 API。

### 数据兼容

本修复没有修改：

- 插件 ID；
- `maps.json`、`settings.json`、`checkpoints.json` 名称；
- 导图数据结构；
- 导图 ID；
- 恢复标签页保存的数据格式。

## 大纲问题分析

v0.5.10 的大纲只是静态行列表，只有点击定位，没有文本输入、键盘编辑或结构命令桥接。

官方 KMind Zen 公开仓库在本次检查时只提供 README、CHANGELOG 和插件清单，没有可直接复用的编辑器源码。YeMind Zen 因此不复制或反编译其私有内核，而是对齐可观察交互，并调用当前安装的 `simple-mind-map` 原生命令：

- `SET_NODE_TEXT`
- `INSERT_NODE`
- `INSERT_CHILD_NODE`
- `REMOVE_NODE`
- `GO_TARGET_NODE`

删除、撤销、重新布局、数据变化事件和自动保存继续归上游命令系统所有，不建立第二套树结构算法。

## 手工验证重点

1. 替换 v0.5.11 后重启思源，不新建导图，确认旧导图立即出现在 Dock。
2. 确认恢复标签不再误报已有导图被删除。
3. 再次重启，确认结果稳定。
4. 导出新诊断，确认出现 `bootstrap-started`、`bootstrap-completed` 和各注册步骤记录。
5. 分屏和纯大纲中修改文字，验证 Enter、Tab、空节点 Backspace/Delete、方向键和 Escape。
