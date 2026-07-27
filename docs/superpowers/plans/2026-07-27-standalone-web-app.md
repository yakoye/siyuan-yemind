# YeMind 独立网页版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个不依赖思源、可在浏览器本地保存并可部署到 GitHub Pages/Cloudflare 的完整 YeMind 网页版。

**Architecture:** 网页入口共享插件的编辑器、模型、主题和固定资源；通过窄 `siyuan` 适配模块提供编辑器所需弹窗/消息能力，通过 IndexedDB 提供现有仓库接口。网页外壳只负责导图列表、文件传输和编辑器生命周期。

**Tech Stack:** TypeScript、Vite、Vitest/jsdom、IndexedDB、simple-mind-map、GitHub Actions、Cloudflare-compatible static hosting

---

### Task 1: 浏览器键值存储适配

**Files:**
- Create: `web/src/webStorage.ts`
- Create: `web/tests/webStorage.test.ts`
- Create: `vitest.web.config.ts`
- Modify: `package.json`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createMemoryWebStore, jsonStorage } from '../src/webStorage';

it('round-trips cloned JSON values', async () => {
  const store = createMemoryWebStore();
  const storage = jsonStorage<{ version: 1 }>(store, 'maps');
  const value = { version: 1 as const };
  await storage.save(value);
  value.version = 1;
  expect(await storage.load()).toEqual({ version: 1 });
});

it('serializes writes for the same key', async () => {
  const store = createMemoryWebStore();
  const storage = jsonStorage(store, 'maps');
  await Promise.all([storage.save({ n: 1 }), storage.save({ n: 2 })]);
  expect(await storage.load()).toEqual({ n: 2 });
});
```

- [ ] **Step 2: 配置 web 测试并验证红色**

`vitest.web.config.ts`：

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', include: ['web/tests/**/*.test.ts'] },
});
```

`package.json`：

```json
"test:web": "vitest run --config vitest.web.config.ts"
```

Run: `npm run test:web`

Expected: FAIL with module not found。

- [ ] **Step 3: 实现存储接口**

```ts
export interface WebKeyValueStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  transaction(values: Record<string, unknown>): Promise<void>;
}

export function createIndexedDbWebStore(
  indexedDb: IDBFactory = window.indexedDB,
): WebKeyValueStore;

export function jsonStorage<T>(store: WebKeyValueStore, key: string): {
  load(): Promise<unknown>;
  save(value: T): Promise<void>;
};
```

IndexedDB 名称为 `yemind-web`，object store 为 `documents`，版本 `1`。`set()` 和 `transaction()` 都必须等待 `transaction.oncomplete`；`onerror/onabort` reject。

- [ ] **Step 4: 运行测试并提交**

Run: `npm run test:web`

Expected: PASS。

```bash
git add web/src/webStorage.ts web/tests/webStorage.test.ts vitest.web.config.ts package.json
git commit -m "feat(web): add browser storage adapter"
```

### Task 2: 导图文件和整库备份

**Files:**
- Create: `web/src/webFileTransfer.ts`
- Create: `web/tests/webFileTransfer.test.ts`

- [ ] **Step 1: 写格式校验失败测试**

```ts
it('rejects a backup with an unknown format without writing', async () => {
  const store = createMemoryWebStore();
  await expect(restoreBackup(store, { product: 'YeMind', format: 'other' }))
    .rejects.toThrow(/format/i);
  expect(await store.get('maps')).toBeUndefined();
});

it('imports a map with a fresh id', () => {
  const imported = importMapFile(validMapFile, () => 'new-map');
  expect(imported.id).toBe('new-map');
  expect(imported.title).toBe(validMapFile.map.title);
});
```

- [ ] **Step 2: 验证红色**

Run: `npm run test:web -- web/tests/webFileTransfer.test.ts`

Expected: FAIL with module not found。

- [ ] **Step 3: 实现类型和校验**

导出：

```ts
export interface YeMindWebBackup {
  product: 'YeMind';
  format: 'yemind-web-backup';
  version: 1;
  exportedAt: string;
  maps: MapStorageDocument;
  settings: YeMindSettings;
  checkpoints: CheckpointStorageDocument;
}

export interface YeMindMapFile {
  product: 'YeMind';
  format: 'yemind-map';
  version: 1;
  exportedAt: string;
  map: YeMindMapDocument;
}

export function createBackup(...): YeMindWebBackup;
export function validateBackup(value: unknown): YeMindWebBackup;
export async function restoreBackup(store: WebKeyValueStore, value: unknown): Promise<void>;
export function exportMapFile(map: YeMindMapDocument): YeMindMapFile;
export function importMapFile(value: unknown, id?: () => string): YeMindMapDocument;
export function downloadJson(filename: string, value: unknown): void;
```

恢复只调用一次 `store.transaction({ maps, settings, checkpoints })`。

- [ ] **Step 4: 运行测试并提交**

Run: `npm run test:web`

Expected: PASS。

```bash
git add web/src/webFileTransfer.ts web/tests/webFileTransfer.test.ts
git commit -m "feat(web): add map import and backup files"
```

### Task 3: 网页平台适配与构建入口

**Files:**
- Create: `web/index.html`
- Create: `web/src/main.ts`
- Create: `web/src/siyuanAdapter.ts`
- Create: `web/src/types.d.ts`
- Create: `vite.web.config.ts`
- Create: `web/tests/siyuanAdapter.test.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: 写适配器失败测试**

```ts
import { Dialog, confirm, showMessage } from '../src/siyuanAdapter';

it('renders and destroys a compatible dialog', () => {
  const dialog = new Dialog({ title: '标题', content: '<p>内容</p>', width: '420px' });
  expect(document.querySelector('.b3-dialog')).not.toBeNull();
  dialog.destroy();
  expect(document.querySelector('.b3-dialog')).toBeNull();
});

it('returns a promise from confirm', () => {
  expect(confirm('标题', '内容')).toBeInstanceOf(Promise);
});
```

- [ ] **Step 2: 验证红色**

Run: `npm run test:web -- web/tests/siyuanAdapter.test.ts`

Expected: FAIL with module not found。

- [ ] **Step 3: 实现最小思源兼容表面**

`siyuanAdapter.ts` 只导出共享编辑器/UI 实际使用的：

```ts
export class Dialog {
  element: HTMLElement;
  constructor(options: { title: string; content: string; width?: string; height?: string; destroyCallback?: () => void });
  destroy(): void;
}
export function confirm(title: string, content: string, onConfirm?: () => void, onCancel?: () => void): Promise<boolean>;
export function showMessage(message: string, timeout?: number, type?: string): void;
export class Menu { /* 支持 addItem/addSeparator/open/destroy */ }
```

弹窗支持 Escape、遮罩点击策略、可访问标题和按钮；消息使用 `aria-live=polite`。

- [ ] **Step 4: 配置网页构建**

`vite.web.config.ts`：

```ts
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname, 'web'),
  base: './',
  resolve: {
    alias: {
      siyuan: resolve(__dirname, 'web/src/siyuanAdapter.ts'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'web-dist'),
    emptyOutDir: true,
  },
});
```

`package.json`：

```json
"dev:web": "vite --config vite.web.config.ts",
"build:web": "vite build --config vite.web.config.ts"
```

- [ ] **Step 5: 运行测试、空入口构建并提交**

Run:

```text
npm run test:web
npm run build:web
```

Expected: PASS 和 build exit 0。

```bash
git add web/index.html web/src/main.ts web/src/siyuanAdapter.ts web/src/types.d.ts web/tests/siyuanAdapter.test.ts vite.web.config.ts package.json tsconfig.json
git commit -m "feat(web): add standalone browser entry"
```

### Task 4: 网页应用服务和导图外壳

**Files:**
- Create: `web/src/webServices.ts`
- Create: `web/src/webApp.ts`
- Create: `web/src/styles.css`
- Create: `web/tests/webApp.test.ts`
- Modify: `web/src/main.ts`

- [ ] **Step 1: 写服务启动失败测试**

```ts
it('creates a default map on first launch', async () => {
  const services = createWebServices(createMemoryWebStore());
  await services.load();
  expect(services.repository.list()).toHaveLength(1);
  expect(services.repository.getActiveMapId()).toBe(services.repository.list()[0].id);
});
```

- [ ] **Step 2: 写外壳生命周期失败测试**

```ts
it('switches editors without leaking the previous instance', async () => {
  const mounted: string[] = [];
  const destroyed: string[] = [];
  const app = new YeMindWebApp(root, services, {
    createEditor: (options) => {
      mounted.push(options.mapId);
      return { destroy: () => destroyed.push(options.mapId), resize: () => undefined };
    },
  });
  await app.start();
  await app.createMap('第二张');
  expect(mounted).toHaveLength(2);
  expect(destroyed).toEqual([mounted[0]]);
});
```

- [ ] **Step 3: 验证红色**

Run: `npm run test:web -- web/tests/webApp.test.ts`

Expected: FAIL with module not found。

- [ ] **Step 4: 实现服务容器**

`createWebServices(store)` 创建：

- `MapRepository`
- `SettingsStore`
- `CheckpointRepository`
- `CheckpointService`
- `DiagnosticsService`

`load()` 加载三类数据；若没有导图，调用 `repository.create('未命名导图', settings.defaultLayout)`。

诊断服务的 manifest probe 返回当前 package version，storage probe 对 `metadata` 写读删使用隔离 key。

- [ ] **Step 5: 实现网页外壳**

外壳 DOM：

```html
<div class="ymw-app">
  <aside class="ymw-sidebar">
    <header><strong>YeMind</strong><button data-web-action="new-map">新建</button></header>
    <div data-web-map-list></div>
    <footer>
      <button data-web-action="import">导入</button>
      <button data-web-action="export">导出</button>
      <button data-web-action="backup">备份</button>
      <button data-web-action="restore">恢复</button>
    </footer>
  </aside>
  <main data-web-editor></main>
</div>
```

`mountMap(mapId)` 必须先 `destroy()` 旧 `YeMindEditor`，再创建新编辑器，并把 `pluginBaseUrl` 设为 `new URL('./', document.baseURI).pathname.replace(/\/$/, '')`。

- [ ] **Step 6: 完成文件操作**

隐藏 file input 接受 `.json,.yemind`。导入/恢复先读取文本和 `JSON.parse`，错误时 `showMessage(..., 'error')` 且不刷新服务。导出当前图；备份导出全库。

- [ ] **Step 7: 实现响应式布局**

桌面左侧栏宽 `260px`；小于 `760px` 时变为顶部可折叠抽屉，编辑器始终 `min-width:0; min-height:0`。补齐思源 CSS 变量的网页版默认值，复用 `src/styles/index.css`。

- [ ] **Step 8: 运行测试和构建并提交**

Run:

```text
npm run test:web
npm run check
npm run build:web
```

Expected: 全部通过。

```bash
git add web/src/webServices.ts web/src/webApp.ts web/src/styles.css web/src/main.ts web/tests/webApp.test.ts
git commit -m "feat(web): add standalone YeMind workspace"
```

### Task 5: 固定资源和部署配置

**Files:**
- Create: `scripts/copy-web-assets.mjs`
- Create: `.github/workflows/pages.yml`
- Create: `web/README.md`
- Modify: `package.json`
- Modify: `vite.web.config.ts`

- [ ] **Step 1: 写资源清单失败测试**

在 `web/tests/webAssets.test.ts` 读取三份 catalog，断言每个资源源文件存在，并断言构建后对应相对路径存在于 `web-dist/assets`。

- [ ] **Step 2: 验证红色**

Run: `npm run build:web && npm run test:web -- web/tests/webAssets.test.ts`

Expected: FAIL；网页构建尚未复制固定资源。

- [ ] **Step 3: 实现资源复制**

`copy-web-assets.mjs` 复制：

```text
assets/icons/
assets/clipart/
assets/layout-thumbnails/
src/data/*.json（若运行时代码未内联）
icon.png
```

构建脚本：

```json
"build:web": "vite build --config vite.web.config.ts && node scripts/copy-web-assets.mjs"
```

- [ ] **Step 4: 添加 GitHub Pages 工作流**

workflow 在 `push: branches: [main]` 和手动触发时：

```text
actions/checkout
actions/setup-node (node 22, cache npm)
npm ci
npm test
npm run check
npm run build:web
actions/upload-pages-artifact path web-dist
actions/deploy-pages
```

权限仅包含 `contents: read`、`pages: write`、`id-token: write`。

- [ ] **Step 5: 构建并提交**

Run: `npm run build:web && npm run test:web`

Expected: 资源测试 PASS，`web-dist/index.html` 使用相对资源 URL。

```bash
git add scripts/copy-web-assets.mjs .github/workflows/pages.yml web/README.md package.json vite.web.config.ts web/tests/webAssets.test.ts
git commit -m "build(web): add assets and Pages deployment"
```

### Task 6: 浏览器端关键流程和发布

**Files:**
- Create: `docs/verification-web-v1.md`
- Modify: `README.md`
- Modify: `README_zh_CN.md`

- [ ] **Step 1: 启动生产预览**

Run: `npm run build:web && npx vite preview --config vite.web.config.ts`

Expected: 输出一个本地 URL，刷新子路径和根路径都不产生 404。

- [ ] **Step 2: 浏览器验证**

使用真实浏览器验证：

```text
首次启动创建导图
新建/重命名/删除/切换
节点新增、编辑、拖动、撤销/重做
主题真实色预览、彩虹配色卡
结构、线型、背景、密度
图片、图标、clipart、备注、批注、标签、待办
分屏、大纲、搜索、检查点、只读、禅模式
单图导入导出、整库备份恢复、刷新持久化
窄屏布局
```

发现缺陷时先补失败测试，再改实现。

- [ ] **Step 3: 运行最终验证**

Run:

```text
npm test
npm run test:web
npm run check
npm run build
node --check index.js
npm run build:web
npm run test:offline
npm run verify:assets
```

Expected: 全部 exit 0。

- [ ] **Step 4: 更新文档**

`README.md` 和 `README_zh_CN.md` 增加网页版启动、构建、数据位置、导入导出和部署说明。`docs/verification-web-v1.md` 记录自动与人工浏览器结果。

- [ ] **Step 5: 提交、推送和部署**

```bash
git add README.md README_zh_CN.md docs/verification-web-v1.md
git commit -m "docs(web): document standalone YeMind"
git push origin main
```

若 Sites 连接可用，用同一已验证源码发布 Cloudflare-compatible 站点；若只使用 GitHub Pages，则等待 Actions 成功并返回 Pages URL。
