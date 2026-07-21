# YeMind Zen v0.5.19 官方功能对齐边界

## 参考基线

- 用户提供的 KMind Zen 思源插件包：内部版本 `0.34.0`。
- YeMind 结构与历史内核：`simple-mind-map 0.14.0-fix.3`。
- 本轮目标：空节点删除、可往返折叠、安全删除和大纲层级可视化。

## 对照结论

| 主题 | KMind Zen 0.34.0 | YeMind Zen v0.5.19 | 边界 |
| --- | --- | --- | --- |
| 连续大纲行 | 使用稳定实体行和独立编辑事务 | 使用稳定 UID keyed patch 与单活动 Quill | 不导入官方私有 ProseMirror/文档内核 |
| 折叠状态 | 文档视图状态保存 collapsed node IDs | 当前编辑器维护局部 collapsed UID Set | 不把大纲按钮写回画布 `data.expand` |
| 折叠按钮 | child count 决定是否可展开，collapsed 决定箭头 | `hasChildren` 决定按钮，局部 Set 决定 `▾/▸` | 叶节点使用不可交互占位 |
| 空行删除 | 编辑命令区分正文删除与结构删除 | 空白非 Root 行返回 `delete-empty` 并调用 `REMOVE_NODE` | Root 永远不可通过该路径删除 |
| 画布删除 | 核心命令先判断 selection，再执行 delete | 捕获阶段和 `beforeShortcutRun` 双层拦截，过滤 Root | 不修改上游 Root 数量约束 |
| 层级提示 | 连续大纲按 depth 排版 | 四级循环 indent-rainbow 细线 | 纯 CSS，不新增拖拽命中 DOM |

## 为什么不直接复制官方大纲内核

KMind Zen 0.34.0 的连续大纲建立在其私有文档模型、ProseMirror schema、selection、view state、history 和 command bus 上。直接复制单个 UI 组件会同时引入第二套节点模型、历史与持久化，无法与当前 `simple-mind-map` 数据保持可靠同步。

本版移植的是可验证的交互原则：

1. 正文删除与结构删除分开。
2. 折叠由明确的节点 ID 状态驱动，不能依赖偶然的 DOM 状态。
3. Root 删除在进入底层命令前即被阻断。
4. 展开按钮始终由“是否有子节点 + 当前折叠状态”生成，可反复往返。
5. 层级引导只负责显示，不参与编辑、选择和拖拽命中。

最终节点删除仍使用上游 `REMOVE_NODE`，结构、撤销历史、布局和保存仍由 `simple-mind-map` 与 YeMind 现有仓库负责。
