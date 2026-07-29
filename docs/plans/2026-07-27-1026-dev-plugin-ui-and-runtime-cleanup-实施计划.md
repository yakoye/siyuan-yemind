# YeMind 插件界面修复与运行目录整理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正经典主题预览和彩虹连线配色下拉，并将思源运行目录收敛为经过验证的运行文件白名单。

**Architecture:** 主题预览逻辑保持为纯函数；彩虹配色选择器拆为独立 UI 控制器并由 `ProjectStylePanel` 组合；运行目录由白名单同步脚本从已验证构建产物生成。所有用户数据路径和插件源码路径相互隔离。

**Tech Stack:** TypeScript、Vitest/jsdom、Vite、Node.js ESM、PowerShell（最终目录差异核验）

---

### Task 1: 建立插件基线

**Files:**
- Inspect: `package.json`
- Inspect: `tests/suite-manifest.json`
- Inspect: `D:\myDatabase\SiYuan\data\plugins\siyuan-yemind`

- [ ] **Step 1: 运行现有测试**

Run: `npm test`

Expected: 15 个 domain entry 全部通过；若失败，记录失败用例且不修改生产代码。

- [ ] **Step 2: 运行类型、构建和产物语法检查**

Run: `npm run check && npm run build && node --check index.js`

Expected: 三条命令 exit 0，根目录重新生成 `index.js`、`index.css` 和 `index.js.map`。

- [ ] **Step 3: 运行离线和资源检查**

Run: `npm run test:offline && npm run verify:assets`

Expected: 所有 smoke 脚本和固定资源目录检查通过。

- [ ] **Step 4: 记录运行目录差异**

Run:

```powershell
$repo = 'C:\Users\color\Downloads\siyuan-yemind-package\siyuan-yemind'
$runtime = 'D:\myDatabase\SiYuan\data\plugins\siyuan-yemind'
Compare-Object `
  (Get-ChildItem $repo -Recurse -File | ForEach-Object { $_.FullName.Substring($repo.Length + 1) }) `
  (Get-ChildItem $runtime -Recurse -File | ForEach-Object { $_.FullName.Substring($runtime.Length + 1) })
```

Expected: 只读输出，确认运行目录当前含历史源码、测试、文档和 `index.js.map`。

### Task 2: 修正经典主题真实预览色

**Files:**
- Modify: `src/editor/themeChoicePresentation.ts`
- Modify: `src/ui/projectChoicePanel.ts`
- Modify: `tests/suites/styles-themes/v0931ThemePalettePanel.suite.ts`
- Modify: `src/styles/index.css`

- [ ] **Step 1: 写失败测试**

在 `v0931ThemePalettePanel.suite.ts` 将固定六色断言改为：

```ts
it('shows only real applied colors for classic themes', () => {
  const classic = YEMIND_THEME_PRESETS.find((preset) => preset.label === '永恒')!;
  const colors = themePaletteColors(classic);
  expect(colors).toEqual(['#FFFFFF', '#3949AB', '#141414', '#EEEEEE', '#000000']);
  expect(colors).not.toContain('#F13A3A');
});

it('keeps colorful branch cycles in source order', () => {
  const rainbow = YEMIND_THEME_PRESETS.find((preset) => preset.label === '彩虹')!;
  expect(themePaletteColors(rainbow)).toEqual(
    rainbow.light.colorAppearance.branches
      .slice(0, rainbow.light.colorAppearance.cycleLength)
      .map((branch) => branch.level1Background),
  );
});
```

- [ ] **Step 2: 验证测试按预期失败**

Run: `npx vitest run tests/specs/styles-themes.test.ts --pool=forks --poolOptions.forks.singleFork=true`

Expected: FAIL；经典“永恒”仍返回 6 个未过滤的分支背景色。

- [ ] **Step 3: 实现真实色收集**

在 `themeChoicePresentation.ts` 实现：

```ts
const isVisibleColor = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '' && value.toLowerCase() !== 'transparent';

function uniqueColors(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  return values.filter(isVisibleColor).filter((color) => {
    const key = color.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

export function themePaletteColors(preset: YeMindThemePreset): readonly string[] {
  const appearance = preset.light.colorAppearance;
  const applied = appearance.branches.slice(0, appearance.cycleLength);
  if (appearance.cycleLength > 1) {
    return uniqueColors(applied.map((branch) => branch.level1Background));
  }
  return uniqueColors([
    appearance.background,
    appearance.centerText,
    ...applied.flatMap((branch) => [
      branch.centerToLevel1Line,
      branch.level1Background,
      branch.level1Text,
      branch.level2Background,
      branch.level2Text,
      branch.normalBackground,
      branch.normalText,
    ]),
  ]);
}
```

- [ ] **Step 4: 取消渲染器补齐六格**

在 `ProjectChoicePanel.renderPalette()` 中删除 fallback 补齐循环，只渲染：

```ts
const colors = [...(option.previewColors ?? [])].slice(0, 6);
colors.forEach((color) => {
  const block = document.createElement('i');
  block.className = 'ymz-project-choice-panel__palette-block';
  block.style.backgroundColor = color;
  strip.appendChild(block);
});
strip.style.setProperty('--ymz-palette-count', String(Math.max(1, colors.length)));
```

把 CSS 的固定列数改为：

```css
.ymz-project-choice-panel__palette-strip{
  grid-template-columns:repeat(var(--ymz-palette-count,6),minmax(0,1fr));
}
```

- [ ] **Step 5: 验证绿色**

Run: `npx vitest run tests/specs/styles-themes.test.ts --pool=forks --poolOptions.forks.singleFork=true`

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/editor/themeChoicePresentation.ts src/ui/projectChoicePanel.ts src/styles/index.css tests/suites/styles-themes/v0931ThemePalettePanel.suite.ts
git commit -m "fix: show real colors for classic theme previews"
```

### Task 3: 彩虹连线分组配色卡下拉

**Files:**
- Create: `src/ui/rainbowSchemePicker.ts`
- Create: `tests/suites/styles-themes/v0932RainbowSchemePicker.suite.ts`
- Modify: `src/ui/projectStylePanel.ts`
- Modify: `src/editor/editorTemplate.ts`
- Modify: `src/styles/index.css`
- Modify: `tests/specs/styles-themes.test.ts`
- Modify: `tests/suite-manifest.json`

- [ ] **Step 1: 写纯数据和 DOM 失败测试**

```ts
import { describe, expect, it, vi } from 'vitest';
import { RainbowSchemePicker } from '../../../src/ui/rainbowSchemePicker';

it('renders grouped palette cards and selects a scheme', () => {
  const host = document.createElement('div');
  host.innerHTML = '<button data-rainbow-trigger></button><div data-rainbow-picker hidden></div>';
  const onSelect = vi.fn();
  const picker = new RainbowSchemePicker(host, {
    selected: 'rainbow',
    readonly: () => false,
    onSelect,
  });
  const panel = host.querySelector<HTMLElement>('[data-rainbow-picker]')!;
  expect(panel.querySelectorAll('[data-rainbow-group]').length).toBe(2);
  expect(panel.querySelector('[data-rainbow-value="dawn"]')).not.toBeNull();
  panel.querySelector<HTMLButtonElement>('[data-rainbow-value="dawn"]')!.click();
  expect(onSelect).toHaveBeenCalledWith('dawn');
  picker.destroy();
});

it('does not select while readonly', () => {
  const host = document.createElement('div');
  host.innerHTML = '<button data-rainbow-trigger></button><div data-rainbow-picker hidden></div>';
  const onSelect = vi.fn();
  const picker = new RainbowSchemePicker(host, {
    selected: 'rainbow',
    readonly: () => true,
    onSelect,
  });
  host.querySelector<HTMLButtonElement>('[data-rainbow-trigger]')!.click();
  host.querySelector<HTMLButtonElement>('[data-rainbow-value="dawn"]')!.click();
  expect(onSelect).not.toHaveBeenCalled();
  picker.destroy();
});
```

- [ ] **Step 2: 注册测试并验证红色**

在 `tests/specs/styles-themes.test.ts` 加：

```ts
import '../suites/styles-themes/v0932RainbowSchemePicker.suite';
```

在 `tests/suite-manifest.json` 的 `styles-themes` 增加 `v0932RainbowSchemePicker.suite.ts`。

Run: `npx vitest run tests/specs/styles-themes.test.ts --pool=forks --poolOptions.forks.singleFork=true`

Expected: FAIL with module not found。

- [ ] **Step 3: 实现独立选择器**

`RainbowSchemePicker` 负责：

```ts
interface RainbowSchemePickerOptions {
  selected: string;
  readonly(): boolean;
  onSelect(value: string): void;
}

class RainbowSchemePicker {
  constructor(root: HTMLElement, options: RainbowSchemePickerOptions);
  setSelected(value: string): void;
  refreshReadonly(): void;
  hide(): void;
  destroy(): void;
}
```

实现中从 `YEMIND_COLOR_SCHEMES` 生成分组标签和两列卡片；每张卡用：

```ts
preview.style.background = `linear-gradient(90deg, ${scheme.colors.join(',')})`;
```

点击色卡时先检查 `readonly()`，再调用 `onSelect(scheme.id)` 并关闭。

- [ ] **Step 4: 接入样式面板**

在 `editorTemplate.ts` 用以下结构替换可见原生 select，原 select 保留 hidden：

```html
<button type="button" data-rainbow-trigger aria-haspopup="listbox" aria-expanded="false">
  <span data-rainbow-current-label>彩虹</span><i data-project-rainbow-preview></i><span aria-hidden="true">⌄</span>
</button>
<select data-project-style="rainbowScheme" hidden>...</select>
<div data-rainbow-picker hidden></div>
```

在 `ProjectStylePanel` 构造 `RainbowSchemePicker`：

```ts
this.rainbowPicker = new RainbowSchemePicker(this.panel, {
  selected: normalizeColorSchemeId(this.style.rainbowScheme) ?? 'rainbow',
  readonly: this.readonly,
  onSelect: (rainbowScheme) => this.commit({ rainbowScheme, rainbowLines: true }),
});
```

`refresh()` 同步隐藏 select、按钮文字、渐变和选择器状态；`destroy()` 销毁选择器。

- [ ] **Step 5: 增加面板样式**

添加 `.ymz-rainbow-picker`、分组标签、两列卡片、选中态、只读态和 `@media(max-width:520px)` 单列规则。配色预览不得在暗色模式被滤镜改色。

- [ ] **Step 6: 运行目标和全量测试**

Run:

```text
npx vitest run tests/specs/styles-themes.test.ts --pool=forks --poolOptions.forks.singleFork=true
npm test
npm run check
```

Expected: 全部 PASS。

- [ ] **Step 7: 提交**

```bash
git add src/ui/rainbowSchemePicker.ts src/ui/projectStylePanel.ts src/editor/editorTemplate.ts src/styles/index.css tests/suites/styles-themes/v0932RainbowSchemePicker.suite.ts tests/specs/styles-themes.test.ts tests/suite-manifest.json
git commit -m "feat: add grouped rainbow palette picker"
```

### Task 4: 运行目录白名单同步

**Files:**
- Create: `scripts/sync-runtime.mjs`
- Create: `tests/suites/diagnostics-release/runtimeSync.suite.ts`
- Modify: `tests/specs/diagnostics-release.test.ts`
- Modify: `tests/suite-manifest.json`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: 写白名单失败测试**

导出纯函数：

```ts
export const RUNTIME_ROOT_FILES = [
  'plugin.json', 'index.js', 'index.css', 'icon.png', 'LICENSE', 'README.md', 'README_zh_CN.md',
] as const;
export const RUNTIME_DIRECTORIES = ['assets', 'i18n'] as const;

export function assertRuntimeTarget(target: string, expected: string): void;
export function runtimeManifest(root: string): Promise<string[]>;
```

测试断言：

```ts
expect(() => assertRuntimeTarget('D:\\wrong', expected)).toThrow(/refusing/i);
expect(RUNTIME_ROOT_FILES).not.toContain('index.js.map');
expect(RUNTIME_DIRECTORIES).toEqual(['assets', 'i18n']);
```

- [ ] **Step 2: 验证红色**

Run: `npx vitest run tests/specs/diagnostics-release.test.ts --pool=forks --poolOptions.forks.singleFork=true`

Expected: FAIL with module not found。

- [ ] **Step 3: 实现同步脚本**

脚本参数：

```text
node scripts/sync-runtime.mjs --target D:\myDatabase\SiYuan\data\plugins\siyuan-yemind
```

流程：

1. 用 `resolve()` 比较 target 与固定/显式 expected target。
2. 检查根目录构建产物和目录都存在。
3. 把白名单复制到 target 的临时同级目录。
4. 读取临时目录清单并拒绝任何非白名单根项。
5. 保留 `data/`（如果存在），再把旧运行目录改名为备份，把临时目录移到目标。
6. 验证成功后删除备份；失败时恢复备份。

不得复制 `maps.json`、`settings.json`、`checkpoints.json`。

- [ ] **Step 4: 增加 npm 脚本和忽略规则**

```json
"sync:runtime": "node scripts/sync-runtime.mjs --target D:\\myDatabase\\SiYuan\\data\\plugins\\siyuan-yemind"
```

`.gitignore` 增加：

```text
.superpowers/
web-dist/
```

- [ ] **Step 5: 运行临时目录集成测试**

测试在 `os.tmpdir()` 下创建 fake source/target，运行同步入口并断言只留下白名单。不得对真实运行路径做测试删除。

Run: `npx vitest run tests/specs/diagnostics-release.test.ts --pool=forks --poolOptions.forks.singleFork=true`

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add scripts/sync-runtime.mjs tests/suites/diagnostics-release/runtimeSync.suite.ts tests/specs/diagnostics-release.test.ts tests/suite-manifest.json package.json .gitignore
git commit -m "build: sync minimal plugin runtime"
```

### Task 5: 构建、同步和运行目录验收

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `plugin.json`
- Modify: `src/plugin/constants.ts`
- Modify: `src/releaseInfo.ts`
- Modify: `CHANGELOG.md`
- Create: `docs/releases/v1.0.0/2026-07-27-1110-v1.0.0-版本-验证记录.md`

- [ ] **Step 1: 版本统一为 1.0.0**

修改 package、manifest、常量和 release 信息，运行：

Run: `npm install --package-lock-only`

Expected: lockfile 根 package version 为 `1.0.0`。

- [ ] **Step 2: 运行完整验证**

Run:

```text
npm test
npm run check
npm run build
node --check index.js
npm run test:offline
npm run verify:assets
```

Expected: 全部 exit 0。

- [ ] **Step 3: 同步真实运行目录**

Run: `npm run sync:runtime`

Expected: 运行目录只含白名单文件和目录，脚本输出已复制文件总数。

- [ ] **Step 4: 核对运行目录**

Run:

```powershell
Get-ChildItem -Force 'D:\myDatabase\SiYuan\data\plugins\siyuan-yemind'
Test-Path 'D:\myDatabase\SiYuan\data\plugins\siyuan-yemind\src'
Test-Path 'D:\myDatabase\SiYuan\data\plugins\siyuan-yemind\index.js.map'
node --check 'D:\myDatabase\SiYuan\data\plugins\siyuan-yemind\index.js'
```

Expected: `src` 和 `index.js.map` 都为 `False`；语法检查 exit 0。

- [ ] **Step 5: 写验证记录并提交**

`docs/releases/v1.0.0/2026-07-27-1110-v1.0.0-版本-验证记录.md` 记录命令、时间、结果、运行目录清单及未自动验证的真实思源交互项。

```bash
git add package.json package-lock.json plugin.json src/plugin/constants.ts src/releaseInfo.ts CHANGELOG.md docs/releases/v1.0.0/2026-07-27-1110-v1.0.0-版本-验证记录.md index.js index.css
git commit -m "release: validate YeMind v1.0.0"
```
