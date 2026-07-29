# YeMind 网页版首版验证记录

验证日期：2026-07-27
版本：`1.0.0`

## 功能范围

- 不依赖思源笔记即可在浏览器中使用 YeMind 编辑器。
- 使用 IndexedDB 保存导图、设置和检查点。
- 支持新建、切换、重命名和删除导图。
- 支持 `.yemind` 单图导入导出。
- 支持完整备份导出与恢复。
- 复用插件的结构、主题、彩虹连线、节点编辑、搜索、检查点等核心能力。
- 提供 GitHub Pages 自动构建与部署工作流。

## 自动验证

```text
npm run test:web
npm run build:web
```

结果：

- 5 个测试文件、13 条测试全部通过。
- `web-dist/` 生产构建成功。
- 构建产物包含 `.nojekyll`、插件图标和完整本地资源。

## 浏览器验证

- 首次访问能初始化 IndexedDB 并创建默认导图。
- 新建、切换和刷新后的持久化正常。
- 主题实际色块和彩虹连线分组选择器正常。
- 390px 移动端布局无横向溢出，侧栏可收起和展开。
- 控制台无错误或警告。

## 部署

工作流文件：`.github/workflows/pages.yml`

推送到 `main` 后，GitHub Actions 会执行安装、测试、类型检查和网页构建，并将 `web-dist/` 部署到 GitHub Pages。Cloudflare Pages 也可以直接使用：

```text
Build command: npm ci && npm run build:web
Output directory: web-dist
```
