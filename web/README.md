# YeMind 网页版

当前版本：`1.1.0`。目录中的 `VERSION` 是网页版发布标记，必须与仓库根目录、插件清单和 npm 包版本一致。

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

- “导出”生成单张 `.yemind` 文件。
- “导入”会创建新的导图副本，不覆盖原图。
- “备份”生成包含导图、设置和检查点的 JSON。
- “恢复”会在校验格式后一次性替换浏览器中的三类数据。

清理浏览器网站数据会删除本地导图库，请定期下载备份。
