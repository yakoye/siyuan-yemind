# YeMind 插件整理与独立网页版设计

## 1. 目标

本次工作同时交付两个可以长期维护的产品入口：

1. 整理并验证思源插件，修正主题预览和彩虹连线配色选择器，清除运行目录中的非运行文件。
2. 在同一仓库内增加不依赖思源笔记的 YeMind 网页版，保留主要编辑能力，使用浏览器本地存储，并可部署到 GitHub Pages 或 Cloudflare。

现有思源插件继续兼容 SiYuan `3.7.3`，用户导图、设置和检查点不得因整理或升级丢失。

## 2. 已确认的产品决策

- 网页版第一版采用完整独立版范围，不是只读展示页或精简原型。
- 网页版不提供账号体系和云同步；数据保存在当前浏览器，并提供文件备份与恢复。
- “经典”主题卡不再固定显示 6 个分支色，而是显示该主题在实际渲染中使用的颜色，去重后按稳定语义顺序排列。
- “样式 → 彩虹连线”使用分组配色卡下拉：按“缤纷 / 经典”分组、两列色卡、显示真实渐变、标记当前选择。
- 后续未明确的普通实现细节使用本设计中的推荐方案持续推进，不逐项中断开发。

## 3. 方案比较

### 3.1 推荐：共享内核与双入口

思源插件和网页版共享 `src/core`、`src/editor`、`src/model`、主题数据、固定资源和大部分 UI。插件入口继续使用思源 API；网页入口提供浏览器平台适配、网页外壳和浏览器存储。

优点：

- 主要功能修复只做一次。
- 数据模型、主题、布局、导入逻辑和编辑行为保持一致。
- 网页版不会伪造完整思源运行环境。

代价：

- 需要明确平台边界，将少量思源弹窗、消息和链接行为替换为适配接口或构建别名。

### 3.2 备选：构建时伪造全部思源 API

网页版保留所有现有导入，通过一个大而全的 `siyuan` shim 运行。

优点是初期改动少；缺点是隐藏耦合、运行期错误难发现、后续思源 API 变化会让网页版一起变脆，因此不采用。

### 3.3 备选：复制一套独立网页版

复制编辑器和主题代码到单独项目。

短期容易启动，但插件与网页会快速分叉，测试和修复需要重复，长期维护成本最高，因此不采用。

## 4. 仓库和构建结构

保留现有插件根目录结构，新增：

```text
web/
  index.html
  src/
    main.ts
    webApp.ts
    webStorage.ts
    webFileTransfer.ts
    siyuanAdapter.ts
    styles.css
  tests/
vite.web.config.ts
```

根 `package.json` 增加网页版开发、构建和测试脚本。插件构建仍输出根目录 `index.js`、`index.css` 和所需资源；网页构建输出 `web-dist/`，两者互不覆盖。

固定图标、布局缩略图和 clipart 继续以仓库现有 catalog 为清单来源。网页构建把 catalog 引用的固定资源复制到 `web-dist/assets/`，禁止运行时扫描目录。

## 5. 平台边界

### 5.1 共享编辑器接口

`YeMindEditor` 继续接收现有仓库、设置、检查点和诊断服务，同时接收一个平台服务：

```ts
interface YeMindPlatformServices {
  showMessage(message: string, timeout?: number, type?: 'info' | 'error'): void;
  confirm(options: ConfirmOptions): Promise<boolean>;
  prompt(options: PromptOptions): Promise<string | null>;
  openExternalLink(href: string, mode: 'new-window' | 'current-window'): void;
  createDialog(options: DialogOptions): YeMindDialogHandle;
}
```

若一次性抽取该接口会造成不必要的大范围修改，网页版构建可先通过窄 `siyuanAdapter.ts` 提供编辑器实际使用的 `Dialog`、`confirm`、`showMessage` 等同名能力；适配器只覆盖可验证的最小 API，不模拟插件生命周期、Dock、Tab 或事件总线。

### 5.2 思源插件入口

现有 `src/index.ts` 和 `YeMindPlugin` 保持插件生命周期所有权：

- 思源负责插件数据文件、Dock、Tab、顶栏菜单、设置入口和全局搜索集成。
- 插件数据仍写入 `maps.json`、`settings.json`、`checkpoints.json`。
- 旧插件 ID 的兼容迁移逻辑不变。

### 5.3 网页入口

网页版负责：

- 左侧导图列表及新建、重命名、删除。
- 中间 YeMind 编辑器。
- 设置、检查点、诊断、导入、导出和整库备份入口。
- 浏览器离线启动，不请求思源 API。

首屏直接进入最近使用的导图；没有导图时创建一个“未命名导图”。

## 6. 数据与文件契约

### 6.1 浏览器存储

使用 IndexedDB 数据库 `yemind-web`，schema 版本从 `1` 开始。逻辑记录：

| Key | 内容 |
|---|---|
| `maps` | `MapStorageDocument` |
| `settings` | `YeMindSettings` |
| `checkpoints` | `CheckpointStorageDocument` |
| `metadata` | 网页版 schema、最近备份时间等非导图元数据 |

保存接口继续符合现有 `RepositoryStorage`、设置存储和检查点存储契约。写入采用单事务更新；加载失败时不覆盖原数据，只显示可恢复错误。

### 6.2 备份与恢复

整库备份文件：

```ts
interface YeMindWebBackup {
  product: 'YeMind';
  format: 'yemind-web-backup';
  version: 1;
  exportedAt: string;
  maps: MapStorageDocument;
  settings: YeMindSettings;
  checkpoints: CheckpointStorageDocument;
}
```

恢复前必须：

1. 校验 `product`、`format`、`version` 和三类数据结构。
2. 先导出当前浏览器数据为内存保护快照。
3. 一次事务写入全部数据。
4. 任一写入失败时回滚，不产生半恢复状态。

### 6.3 单图导入导出

单图文件使用：

```ts
interface YeMindMapFile {
  product: 'YeMind';
  format: 'yemind-map';
  version: 1;
  exportedAt: string;
  map: YeMindMapDocument;
}
```

导入时生成新的导图 ID，避免覆盖同名或同 ID 导图；标题冲突允许存在。图片继续以内嵌 Data URL 保存，保证文件可移植。

## 7. 两处界面修复

### 7.1 经典主题真实预览色

根因是当前 `themePaletteColors()` 无条件读取前 6 个 `level1Background`，而所有经典主题的 `cycleLength` 都是 `1`，后 5 个分支不会用于实际渲染。

新的预览规则：

1. 按 `background`、`centerText`、实际循环分支的连线色、一级背景/文字、二级背景/文字、普通背景/文字的稳定顺序收集。
2. 忽略 `transparent` 和无效 CSS 颜色。
3. 大小写不敏感去重。
4. 最多显示 6 个真实颜色，但不补齐、不重复。
5. “基础 / 缤纷”主题仍优先显示其实际循环分支色；仅在分支色不足时补充真实层级色。

主题卡的色点数量由返回数组决定，不能在渲染器中再次强制补到 6。

### 7.2 彩虹连线配色卡下拉

原生 `<select>` 作为隐藏兼容值控件保留，新增可访问的自定义触发按钮和配色面板：

- 触发按钮显示当前配色名称和渐变条。
- 面板按 `YeMindColorScheme.category` 生成“缤纷 / 经典”标签。
- 每个色卡显示名称和 `scheme.colors` 的真实渐变。
- 点击色卡立即提交 `rainbowScheme` 并将 `rainbowLines` 设为 `true`。
- 当前项使用 `aria-selected=true` 和可见勾选/描边。
- Escape、点击面板外、选择完成后关闭。
- 只读模式禁用切换，不改变现有值。
- 窄屏退化为单列。

## 8. 运行目录整理与同步规则

Git 仓库是唯一源码来源。思源运行目录只保留：

- `plugin.json`
- `index.js`
- `index.css`
- `icon.png`
- `i18n/`
- `assets/`
- 许可证和插件市场需要的 README（如当前安装规则要求）

明确不放入运行目录：

- `.git`、`.agents`、`.superpowers`
- `src/`、`tests/`、`scripts/`、`docs/`
- TypeScript/Vite 配置和 npm 锁文件
- 历史分析文档、旧测试文件、开发计划
- `index.js.map`，除非调试发布显式开启
- 用户数据文件 `maps.json`、`settings.json`、`checkpoints.json`

同步脚本先构建到临时目录，验证必需文件，再按白名单复制到运行目录。清理前解析并检查运行目录绝对路径必须严格等于目标插件目录；用户数据目录不在删除范围内。

## 9. 部署

网页版必须使用相对 `base` 路径，确保以下地址都可运行：

- `https://<user>.github.io/<repo>/`
- Cloudflare Pages / Sites 根路径或项目路径
- 本地静态服务器

GitHub Actions 在主分支网页版构建成功后生成 Pages artifact。若当前仓库未启用 Pages，代码仍完整提交，启用动作由仓库设置决定。

Cloudflare 发布使用同一 `web-dist/` 构建结果，不维护第二套源码。

## 10. 测试与验收

### 10.1 测试先行

每个缺陷或新行为先增加失败测试：

- 经典主题预览不包含未使用分支色，不固定补 6。
- 缤纷主题仍显示实际循环色。
- 彩虹配色面板分组、预览、选择、只读和关闭行为。
- IndexedDB 适配的加载、保存、并发写入和错误保持。
- 单图与整库文件校验、ID 冲突和事务恢复。
- 网页平台适配不得请求思源 API。

### 10.2 自动验证

插件：

```text
npm test
npm run check
npm run build
node --check index.js
npm run test:offline
npm run verify:assets
```

网页：

```text
npm run test:web
npm run build:web
```

最终发布包重新解压后执行 `npm ci` 和完整验证。运行目录与白名单做文件差异检查。

### 10.3 浏览器关键流程

- 首次进入自动创建导图。
- 新建、重命名、删除、切换导图。
- 节点新增、编辑、拖动、撤销/重做。
- 结构、主题、线型、彩虹连线、背景和密度。
- 图片、图标、clipart、备注、批注、标签、待办。
- 导入、导出、整库备份、恢复和刷新后持久化。
- 分屏、大纲、搜索、检查点、只读、禅模式和窄屏布局。

## 11. 错误处理

- 存储失败：保留内存中当前状态并显示“保存失败”，后续允许重试或导出。
- 文件格式错误：指出不兼容字段，不写入任何数据。
- 固定资源缺失：构建失败，不发布残缺网页。
- 浏览器不支持 IndexedDB：提示使用受支持浏览器，并允许只读导入预览但不承诺保存。
- 插件运行目录目标异常：停止同步，不做模糊路径清理。
- 网页某个思源专属能力没有等价实现：隐藏该入口并在功能矩阵明确记录，不展示点击后报错的空壳功能。

## 12. 完成标准

- 两处已确认的界面问题在插件运行目录中可复现验证。
- 插件运行目录只含白名单文件，用户数据未受影响。
- 现有测试、类型检查、构建、离线 smoke 和资源验证通过。
- 网页版可离线打开并完成主要编辑、保存、导入导出和恢复流程。
- GitHub 包含源码、测试、构建说明和部署配置。
- 最终提交已推送，部署成功时提供可访问网址；若外部权限阻止部署，明确给出唯一所需动作。
