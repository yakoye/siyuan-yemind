# YeMind

YeMind 是面向思源笔记和独立网页的本地优先思维导图工作区。两端共用同一套 TypeScript 源码、数据模型和交互控制器，导图、大纲、卡片、主题及导入导出保持一致。

当前版本：`1.9.9-rc.4`
思源基线：`3.7.3`

## 主要能力

- 28 种真实结构：右/左/双向导图、树状图、时间轴、组织结构图、鱼骨图、树形表格、放射/圆形/气泡/括号图。
- 导图与可编辑结构化大纲同步：节点增删改查、跨层拖动、富文本、图片、剪贴图、图标、标号、备注、批注、关联线和外框。
- 导图、大纲及多个文件之间统一复制文字、图片和完整节点结构，并用原子事务支持撤销与重做。
- 卡片与专注复习：掌握进度、收藏、状态、翻面、复习队列、间隔安排及来源节点关联均可保存。
- 跟随系统/思源、浅色、深色三种界面外观，25 个整图主题，以及可发现的响应式工具栏。
- 双端统一导入导出：可编辑 YeMind SVG/ZIP、SVG、KMindz、XMind、Markdown、OPML、PNG、Text、大纲/交互 HTML 和 PDF。
- 默认本地保存：插件数据保存在思源插件存储中；网页版数据保存在浏览器 IndexedDB。

## 安装与使用

思源版使用 Release 中的插件 ZIP，安装目录为 `data/plugins/siyuan-yemind`。网页版可直接使用 GitHub Pages，也可把网页版 ZIP 部署到 Cloudflare Pages 或其他静态站点。

升级前建议导出 `.yemind.svg` 或下载整库备份。旧 `.yemindz.svg`、`.yemindz.zip` 仍可继续导入。

## 开发与验证

```text
npm ci
npm run dev
npm run dev:web
npm run check
npm test
npm run test:web
npm run test:offline
npm run verify:assets
npm run test:e2e
npm run release:build
npm run release:verify
```

详细规则见 [回归验收清单](docs/standards/回归验收清单.md)、[版本与发布规范](docs/standards/版本与发布规范.md)、[测试与验收](docs/standards/测试与验收.md) 和 [v1.5.0 设计说明](docs/designs/2026-07-28-1853-v1.5.0-界面与双端统一-设计.md)。版本更新历史统一放在 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

MIT
