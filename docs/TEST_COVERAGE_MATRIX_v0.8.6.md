# YeMind v0.8.6 功能—测试覆盖矩阵

## 汇总

| 指标 | 重构前 | 重构后 |
|---|---:|---:|
| Vitest 测试入口 | 159 | 15 |
| 独立场景模块 | 159 | 158 |
| 测试项 | 448 | 445 |
| 删除内容 | — | 1 个完全重复文件、2 条重复版本断言 |
| 用户反馈回归 | 全部执行 | 全部保留并执行 |

减少的 3 项均为重复身份/版本断言，不涉及产品功能覆盖。

## 功能域覆盖

| 功能域 | 测试数 | 关键能力 |
|---|---:|---|
| Outline & Split | 52 | 分屏、大纲编辑、折叠展开、Root、拖动、焦点恢复、缩进线、叶节点 |
| UI Shell | 47 | 工具栏、右键菜单、布局、禅模式、响应式、选择/拖动模式 |
| Storage & Lifecycle | 42 | 导图 CRUD、自动保存、启动、标签恢复、只读、迁移、操作安全 |
| Styles & Themes | 40 | 颜色面板、主题、密度、节点/整图样式、品牌和 Dock 主题适配 |
| Node Content | 38 | 备注、批注、图片、链接、标签、装饰和悬停预览 |
| Rich Text Editing | 35 | Quill、双击、新旧节点选区、Ctrl+A、剪贴板、格式、拖动后定位 |
| Drag Interactions | 33 | 节点结构拖动、画布右键平移、同位拖动和上游拖动生命周期 |
| Commands & Selection | 31 | Tab/Enter、删除、快捷键隔离、剪贴板、多选与主选节点 |
| Search & Navigation | 31 | 查找替换、全局搜索融合、精确匹配预览、Enter/双击打开与高亮 |
| Advanced Structures | 26 | 概要、外框、关联线、多选和上游结构行为 |
| Checkpoints | 20 | 检查点创建、列表、恢复、对话框与编辑器集成 |
| Diagnostics & Release | 19 | 事件记录、自检、诊断 ZIP、关于、版本发布门禁 |
| Contracts & Compatibility | 17 | 插件 ID、Manifest、图标、旧链接、构建输出和源码入口 |
| Settings | 11 | 设置持久化、对话框、保存、关闭清理和默认值 |
| User Regression Matrix | 3 | 跨模块用户反馈关键路径 |
| **合计** | **445** | **当前全部公开功能与关键兼容边界** |

## 发布门禁

每次发布必须依次通过：

1. `npm test`：结构门禁 + 445 项功能回归；
2. `npm run check`：TypeScript；
3. `npm run build`：生产构建；
4. `node --check index.js`：发布入口语法；
5. ZIP CRC 与禁止目录检查；
6. 从最终 ZIP 完整解压后重新执行上述流程。
