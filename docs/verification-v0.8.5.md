# YeMind v0.8.5 验证报告

日期：2026-07-21

## 修复目标

修复分屏模式中曾编辑右侧大纲节点 A 后，点击左侧画布节点 C，再通过 Tab/Enter 创建 D 时，旧节点 A 被自动恢复焦点并再次进入编辑的问题。

## 诊断结论

用户诊断包显示：

```text
rich-text / opened
editor / data-change
outline / editor-destroy (structure-change)
outline / edit-start
```

说明画布新增节点后，大纲重绘逻辑主动恢复了旧编辑节点。根因是旧实现根据“结构变化 + 活动大纲编辑器”隐式生成焦点恢复请求，没有区分变化来源。

## 实现验证

- 新增 `EditingSurfaceCoordinator`，所有者为 `none / canvas / outline`。
- 画布捕获阶段 `pointerdown`、画布节点激活和画布富文本开始都会接管编辑权。
- 画布接管会提交并关闭旧大纲编辑器，取消旧恢复票据。
- 普通 `data_change` 不再根据旧活动行推断焦点。
- 大纲插入、缩进、删除、折叠等命令继续显式创建焦点恢复票据。
- 异步恢复使用代次校验，旧 RAF 请求无法复活。

## 自动测试

```text
测试文件：159 passed
测试数量：448 passed
TypeScript：passed
生产构建：passed
Vite modules：903
构建入口语法：passed
```

新增专项测试：

- 画布接管取消旧大纲票据；
- 外部画布结构变化不生成大纲恢复；
- 大纲自身插入仍恢复新节点；
- 新请求替换旧异步票据；
- 正式编辑器接入 pointerdown、node_active、before_show_text_edit 三条接管路径；
- `renderOutline()` 不再保存并恢复旧活动行选区。

## 发布包二次验证

从最终 ZIP 完整解压后执行：

```text
npm ci：passed
测试文件：159 passed
测试数量：448 passed
TypeScript：passed
生产构建：passed
Vite modules：903
index.js 语法：passed
```

发布身份：

```text
plugin.json.name：siyuan-yemind
plugin.json.version：0.8.5
package.json.name：siyuan-yemind
package.json.version：0.8.5
显示名称：YeMind
```

发布包不包含：

- `maps.json`
- `settings.json`
- `checkpoints.json`
- `node_modules/`
- `dist/`
- `.git/`
- 嵌套 ZIP

## 依赖审计

```text
low：1
moderate：2
high：0
critical：0
```

本版未新增或升级依赖。现有问题来自既有依赖链，强制自动修复会引入破坏性版本变化，因此未执行 `npm audit fix --force`。

## 桌面端重点验收

1. 在分屏右侧进入节点 A 编辑；
2. 点击左侧画布节点 C；
3. 按 Tab 或 Enter 创建节点 D；
4. 应保持左侧 D 进入编辑；
5. 右侧 A 不得重新获得焦点或进入编辑；
6. 重复多次切换左右视图、缩进、折叠和删除，确认大纲自身命令仍恢复正确目标。
