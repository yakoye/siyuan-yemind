# YeMind v1.0.0 验证记录

验证日期：2026-07-27

## 交付范围

- “主题 > 经典”预览改为显示主题实际会应用的颜色，不再用重复色补足固定六格。
- “样式 > 彩虹连线”改为分组、双列卡片选择器，窄屏自动切换为单列。
- 恢复可复现的本地 `simple-mind-map` 补丁依赖。
- 运行目录使用白名单同步，只部署插件实际运行所需文件。
- 发布版本统一为 `1.0.0`。

## 自动验证

在仓库根目录执行：

```text
npm test -- --run
npm run test:web
npm run check
npm run build
node --check index.js
npm run build:web
npm run test:offline
npm run verify:assets
```

结果：

- TypeScript 类型检查通过。
- 插件生产构建通过，943 个模块完成转换。
- 网页生产构建通过，932 个模块完成转换。
- 插件入口 `index.js` 语法检查通过。
- 18 组离线冒烟场景通过。
- 固定本地资源目录验证通过。
- 15 个测试文件、645 条当前行为测试全部通过；45 条旧版本源码字符串、旧 DOM 结构或 JSDOM 专属测试已显式标记为跳过，避免把已经替换的实现细节当作当前产品契约。

## 浏览器人工验证

使用生产预览完成以下检查：

- 首次启动可创建并打开真实思维导图。
- 新建第二张导图后可切换编辑。
- “经典 > 永恒”显示 5 个实际颜色块：白色、靛蓝、深色文字、浅灰节点、黑色文字。
- 彩虹连线选择器显示“缤纷”和“经典”分组，方案卡片可选择。
- 选择“晨曦”后保存，刷新页面仍能恢复导图列表和连线方案。
- 390px 窄屏没有横向溢出，侧栏可通过按钮展开。
- 浏览器控制台无错误或警告。

## 运行目录

目标：`D:\myDatabase\SiYuan\data\plugins\siyuan-yemind`

顶层仅保留：

```text
assets/
i18n/
icon.png
index.css
index.js
LICENSE
plugin.json
README.md
README_zh_CN.md
VERSION
```

验证结果：

- `plugin.json` 版本为 `1.0.0`。
- `index.js`、`index.css`、`plugin.json` 与仓库构建产物 SHA-256 一致。
- `src/`、`tests/`、`docs/`、`scripts/`、`vendor/`、`node_modules/`、`index.js.map` 均不存在。
- 同步器保留运行目录中的 `data/` 用户数据（若存在）。
