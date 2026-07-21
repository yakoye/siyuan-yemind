# YeMind Zen v0.5.20 官方结构、样式与概要研究

日期：2026-07-20

## 研究来源

- 用户提供的 KMind Zen 0.34.0 思源插件源码包
- 当前 YeMind Zen v0.5.19
- `simple-mind-map` 0.14.0-fix.3 源码

## 结论

官方的结构、主题、线型、节点样式和概要并非纯 CSS，而是围绕统一节点模型、选择状态、命令历史和渲染事务工作。官方完整编辑器仍依赖私有文档状态，因此 v0.5.20 采用机制适配：保留 YeMind 数据仓库和检查点，将界面动作路由到 `simple-mind-map` 原生命令。

## 可直接复用的上游能力

- `SET_NODE_EXPAND`：折叠状态和历史；
- `SET_NODE_STYLES` / `REMOVE_CUSTOM_STYLES`：局部节点样式；
- `ADD_GENERALIZATION` / `REMOVE_GENERALIZATION`：概要范围和括号布局；
- `setLayout`、主题配置和线型主题字段；
- 节点 UID、渲染完成事件和视图变换事件。

## 不移植的边界

- 官方私有 React 状态树；
- 官方文档模型和第二套撤销历史；
- 官方私有存储格式；
- 需要替换 YeMind 检查点或 MapRepository 的实现。

## 关键适配

1. 关闭上游重复的创建/折叠按钮，使用编辑器局部快速控件，但动作仍调用上游命令。
2. 删除大纲独立折叠集合，使大纲和画布读取同一 `expand` 字段。
3. 节点样式面板只产生规范化 patch，并映射 `width` 到原生 `customTextWidth`。
4. 清除全部局部样式使用 `REMOVE_CUSTOM_STYLES`；单字段清除写入 `undefined`，恢复主题继承。
5. 概要继续使用原生 generalization 数据和渲染，只补专用入口及大纲行。
