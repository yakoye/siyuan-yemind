# YeMind 测试结构

YeMind 的测试不再以 159 个零散 `*.test.ts` 文件直接执行，而是分为两层：

- `tests/specs/`：15 个功能域入口，Vitest 只收集这些文件。
- `tests/suites/<domain>/`：独立场景模块，保留每个历史故障、集成场景和单元契约的隔离边界。

这样既减少测试报告噪声，也避免把 445 项测试塞进几个超大文件。

## 功能域

| 入口 | 主要覆盖内容 |
|---|---|
| `contracts-compatibility` | Manifest、插件 ID、版本、图标、链接、构建产物与兼容边界 |
| `storage-lifecycle` | 导图仓库、保存、启动、标签页、只读、安全生命周期与旧存储迁移 |
| `checkpoints` | 检查点仓库、服务、对话框、编辑器集成与恢复 |
| `commands-selection` | 命令、快捷键、剪贴板、多选、主选节点与安全拦截 |
| `outline-split` | 大纲、分屏、折叠、编辑、拖动、缩进线与焦点所有权 |
| `rich-text-editing` | Quill、双击编辑、选区、格式、链接、代码、拖动后定位与文本事务 |
| `drag-interactions` | 画布拖动、节点拖动、右键平移、官方拖动意图与生命周期 |
| `node-content` | 备注、批注、图片、链接、装饰、悬停预览与节点内容菜单 |
| `styles-themes` | 颜色、节点样式、整图样式、主题、密度、品牌和 Dock 图标 |
| `ui-shell` | 顶部/底部/左侧工具栏、右键菜单、禅模式、响应式和布局 |
| `search-navigation` | 查找替换、思源全局搜索、预览、打开、定位、高亮与键盘导航 |
| `diagnostics-release` | 诊断记录、自检、导出、关于页、版本一致性和发布信息 |
| `settings` | 设置存储、对话框、保存、关闭清理和节点装饰设置 |
| `advanced-structures` | 概要、外框、关联线、多选与上游结构契约 |
| `user-regressions` | 用户反馈形成的跨模块永久回归矩阵 |

## 结构门禁

`npm test` 会先运行：

```bash
node scripts/check-test-structure.mjs
```

它会检查：

1. 每个功能域都有且只有一个 `tests/specs/*.test.ts` 入口；
2. 每个 `*.suite.ts` 都登记在 `suite-manifest.json`；
3. 每个登记场景都被入口导入；
4. 不允许测试重新散落到 `tests/` 根目录；
5. 不允许出现孤立或漏执行的场景模块。

## 删除原则

只删除以下内容：

- 完全重复的断言；
- 已被更强集成测试完整覆盖的相同契约；
- 已下线且源码中不存在的功能测试。

用户实际反馈形成的回归测试不会因为版本较旧而删除。文件名中的旧版本号表示该故障首次被纳入回归的版本，并不代表测试已经过期。
