# YeMind Zen v0.5.18 Verification Report

日期：2026-07-18

## 发布范围

v0.5.18 解决 v0.5.17 中仍可复现的大纲焦点、删除、拖拽和折叠问题：

- 文字模型同步不再移动或重新插入活动 Quill 行。
- Backspace/Delete 连续编辑不退出，不进入节点结构删除命令。
- 同步 `data_change` 回调不能重入同一次文字提交。
- 删除六点 HTML5 拖拽把手，改为整行 Pointer 拖拽。
- 正文内短按保留光标/文字选择，长按后移动才开始拖拽。
- 横向位置参与父子层级和向左降级判断。
- 拖动前只提交一次，防止正文被误写为空而显示成小圆圈。
- 折叠/展开可往返，叶节点使用不可交互占位。
- 公式按钮使用数学字体 `π`；模糊使用画布/大纲统一高斯和毛玻璃显示。

## 官方适配边界

研究基于用户提供的 KMind Zen 0.34.0 包。官方连续大纲依赖其 ProseMirror/Tiptap schema、文档实体、命令总线和历史，不能在不引入第二套导图内核的前提下直接复制。

本版移植稳定实体、编辑事务、指针几何和层级 drop slot 原则；正文、结构、历史、布局和持久化继续由 YeMind 当前适配层及 `simple-mind-map` 上游命令负责。详见：

- `docs/official-source-outline-editing-analysis-v0.5.18.md`
- `docs/OFFICIAL_FEATURE_PARITY_v0.5.18.md`
- `docs/superpowers/specs/2026-07-18-outline-editing-drag-stability-design.md`
- `docs/superpowers/plans/2026-07-18-outline-editing-drag-stability.md`

## TDD 证据

新增失败测试首先复现：

- 活动行经过全量 Fragment append 后失焦；
- 连续 Delete 提交后 Quill 会话失焦；
- 同步模型回调递归进入 `flush()`；
- 六点拖拽把手仍存在；
- 横向层级解析和 toggle resolver 缺失；
- 公式按钮没有专用数学 symbol；
- 模糊没有高斯/毛玻璃规则。

初始聚焦结果为 4 个测试文件中 9 项失败、1 项通过。实现后新增 v0.5.18 聚焦测试全部转绿，并进入完整回归。

## 自动验证

```text
Test files: 109 passed
Tests: 285 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 885
Built index.js syntax: passed
```

关键覆盖：

- 活动 DOM 身份与 `document.activeElement` 保持；
- 连续两次 Delete-style Quill 提交；
- 同步 commit 防重入；
- 文字变化与结构变化签名分离；
- Backspace/Delete 在空和非空正文中均不触发结构动作；
- 新增/删除/重排兄弟节点时活动行保持；
- 整行拖拽启动阈值、正文长按和交互控件隔离；
- before/inside/after、向右子级和向左降级；
- 自身/后代移动拒绝及上游 MOVE/INSERT 命令映射；
- 折叠/展开往返和叶节点占位；
- 数学 `π` 结构和画布/大纲高斯模糊；
- 既有启动、仓库、保存、检查点、富文本、颜色、备注、批注、图片、布局、画布拖动和诊断回归。

## 依赖审计

```text
low: 1
moderate: 2
high: 0
critical: 0
```

现有低/中风险仍来自既有依赖链。本轮未为界面和大纲修复强制升级底层包。

## 包完整性要求

发布包必须：

- 包含完整 TypeScript 源码、测试、Superpowers skills、设计、实施计划、官方源码研究、功能矩阵、迁移状态、变更记录和本报告；
- 包含构建后的根目录 `index.js`、`index.css`、`index.js.map`；
- 排除 `node_modules/`、临时 `dist/`、`.git/` 和旧压缩包；
- 通过 ZIP CRC、完整解压、解压后入口语法和版本一致性检查。

## 仍需真实桌面端验收

当前环境不能启动用户 Windows SiYuan 3.7.2 桌面 UI，以下仍需安装后验收：

1. 分屏和纯大纲连续输入中文、英文并连续 Backspace/Delete，确认始终留在同一编辑行。
2. 在正文中普通点击/拖选文字不会启动拖拽；长按后移动可以拖拽。
3. 行空白处直接拖动，在目标上下/中部和左右不同位置检查同级、子级、向左降级。
4. 拖动后检查原正文、富文本、备注、批注均未丢失，画布不出现意外小圆圈。
5. 连续多次折叠和展开；折叠包含当前编辑子节点的父节点后再次展开。
6. 检查数学 `π` 在 Windows 字体回退下的粗细和垂直对齐。
7. 检查模糊在浅色、深色、自定义节点背景以及悬停恢复时的可读性。
8. 检查拖拽撤销/重做、保存后重开、检查点恢复和中文输入法。

## 发布归档验证结果

```text
ZIP entries: 389
Regular files: 349
Package version: 0.5.18
Plugin version: 0.5.18
ZIP CRC/integrity: passed
Complete extraction: passed
Extracted index.js syntax: passed
Extracted npm ci: passed
Extracted test files: 109 passed
Extracted tests: 285 passed
Extracted TypeScript: passed
Extracted production build: passed
Extracted Vite modules transformed: 885
```
