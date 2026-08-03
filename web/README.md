# YeMind 网页版

当前版本：`1.9.7`。目录中的 `VERSION` 是网页版发布标记，必须与仓库根目录、插件清单和 npm 包版本一致。

网页版复用 YeMind 的完整导图编辑器，但不依赖思源笔记。数据只保存在当前浏览器的 IndexedDB `yemind-web` 中，不会自动上传服务器。

## 本地运行

```text
npm install
npm run dev:web
```

生产构建：

```text
npm run build:web
```

静态文件输出到 `web-dist/`，可直接部署到 GitHub Pages、Cloudflare Pages 或其他静态站点。

## 数据迁移

- “导出”支持 `.yemind.svg`（默认和完整 SVG 包）、普通 SVG、KMindz、`.yemind.zip`、Markdown、OPML、XMind、PNG、Text、大纲 HTML、交互导图 HTML 和 PDF。
- “导入”自动识别 YeMind/KMindZ 容器、XMind、旧 `.yemind/.kmind/.json` 以及 `.md/.opml/.txt/.mm` 大纲，并创建新的导图副本，不覆盖原图。
- “导出”中的 YeMind 完整库格式用于备份导图、设置和检查点。
- “导入”可识别 YeMind 完整库格式并执行恢复；恢复前会先校验格式。

清理浏览器网站数据会删除本地导图库，请定期下载备份。
