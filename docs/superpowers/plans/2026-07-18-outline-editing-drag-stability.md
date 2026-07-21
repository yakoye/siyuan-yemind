# YeMind v0.5.18 大纲稳定性实施计划

> 基于已确认的 v0.5.17 根因，严格执行 RED → GREEN → REFACTOR。

## Task 1：建立 v0.5.18 回归测试与根因证据

文件：
- 新建 `tests/v0518OutlineEditingStability.test.ts`
- 新建 `tests/v0518OutlinePointerDrag.test.ts`
- 新建 `tests/v0518OutlineCollapse.test.ts`
- 新建 `tests/v0518FormulaBlurPresentation.test.ts`

步骤：
1. 写测试证明当前 patch 会重新 append 活动行并使焦点丢失。
2. 写测试要求连续 Delete/Backspace 期间 controller 不 detach。
3. 写测试要求删除六点把手，整行输出 pointer drag 元数据。
4. 写纯函数测试覆盖纵向和横向落点。
5. 写折叠往返状态测试。
6. 写公式图标结构和 blur CSS 测试。
7. 运行：`npm test -- tests/v0518*.test.ts`，确认按预期失败。

## Task 2：重构稳定 keyed patch

文件：
- 修改 `src/editor/outline.ts`
- 修改 `src/editor/YeMindEditor.ts`
- 修改 `src/editor/OutlineRichTextController.ts`

步骤：
1. 增加 visible structure signature。
2. 把 fragment 全量 append 改为仅在顺序变化时 `insertBefore`。
3. 普通文字提交时不移动活动行。
4. 增加 controller `isCommitting` 和带原因的 `commitAndDetach()`，防止同步重入。
5. 运行编辑稳定性测试，确认转绿。

## Task 3：实现整行 Pointer Drag

文件：
- 重写 `src/editor/outlineDrag.ts`
- 修改 `src/editor/YeMindEditor.ts`
- 修改 `src/editor/outline.ts`
- 修改 `src/styles/index.css`

步骤：
1. 删除 drag handle DOM 和 HTML5 drag 监听。
2. 实现拖拽候选、长按、移动阈值和取消状态机。
3. 实现 ghost/drop indicator。
4. 实现基于 X/Y 的层级 intent 解析。
5. 最终仍调用 `moveNodeByUid()`。
6. 运行 pointer drag 与 command 测试。

## Task 4：修复折叠/展开

文件：
- 修改 `src/editor/YeMindEditor.ts`
- 修改 `src/editor/outline.ts`
- 修改 `src/styles/index.css`

步骤：
1. toggle pointerdown/click 阻止行拖拽和穿透。
2. 从模型/命令读取最新展开状态。
3. 只在原行正在编辑时恢复编辑。
4. 无子节点使用不可交互占位。
5. 运行折叠往返测试。

## Task 5：公式 π 与高斯模糊

文件：
- 修改 `src/editor/RichTextToolbar.ts`
- 修改 `src/editor/richTextActions.ts`（如测试需要）
- 修改 `src/styles/index.css`
- 修改相关测试

步骤：
1. π 改为带辅助文本的专用数学图标 span。
2. blur 模式覆盖画布和大纲，使用 `filter`、半透明背景及 `backdrop-filter`。
3. hover 恢复正常显示。
4. hidden 模式保持兼容。
5. 运行视觉契约测试。

## Task 6：全量回归、版本与文档

文件：
- 修改 `package.json`、`package-lock.json`、`plugin.json`
- 修改 `README.md`、`README_zh_CN.md`、`CHANGELOG.md`
- 修改 `ARCHITECTURE.md`、`DEVELOPMENT_PLAN.md`、`FEATURE_MATRIX.md`、`MIGRATION_STATUS.md`
- 新建 `docs/OFFICIAL_FEATURE_PARITY_v0.5.18.md`
- 新建 `docs/verification-v0.5.18.md`

命令：
```bash
npm test
npm run check
npm run build
node --check index.js
npm audit --json
```

打包：
```bash
zip -r /mnt/data/siyuan-yemind-zen-v0.5.18.zip . \
  -x 'node_modules/*' 'dist/*' '.git/*' '*.zip'
unzip -t /mnt/data/siyuan-yemind-zen-v0.5.18.zip
```

解压后二次验证：
```bash
rm -rf /mnt/data/yemind-v0.5.18-verify
mkdir -p /mnt/data/yemind-v0.5.18-verify
unzip -q /mnt/data/siyuan-yemind-zen-v0.5.18.zip -d /mnt/data/yemind-v0.5.18-verify
node --check /mnt/data/yemind-v0.5.18-verify/index.js
```
