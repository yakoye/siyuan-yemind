# 画布文字编辑内核精简实施计划

> **给执行者的提示：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务执行本计划。步骤用复选框（`- [ ]`）语法追踪进度。

**目标：** 彻底删除画布节点文字编辑过程中"每次按键都重建 SVG 静态文字"的实时渲染链路，把编辑收敛成"打开一次、编辑期间只操作 Quill、关闭时一次性提交"的单向生命周期，同时把永久 `requestAnimationFrame` 补偿循环（编辑器定位、快捷按钮）改为事件驱动，并修正双击全选配置与 Quill/SVG 内边距不一致的问题。

**架构：** 不新增协调器。删除 `RenderLifecycleCoordinator` 中"实时提交"相关的全部状态（`scheduleTextEdit`/`commitTextEdit`/`pending`/防抖定时器），只保留"渲染后富文本溢出修复"这一支，拆成一个新的、更小的类 `RenderedTextGeometryRepair`。`YeMindRichText.ts` 的 `text-change` 监听器不再对外发事件触发渲染，只做内容标记和选区缓存失效。两个永久 rAF 循环（`startPlacementMonitor`、`NodeQuickActionsController.trackRenderedGeometry`）删除自我重新调度，改为依赖已存在的事件订阅（`translate`/`scale`/`resize`/`view_data_change`/`node_tree_render_end`/`node_dragging`/`node_dragend`）按需触发一次。

**技术栈：** TypeScript、Vitest（单元测试）、Playwright（E2E）、Quill 2.x、simple-mind-map（vendor，只读不改）。

---

## 背景与验证依据

本计划基于用户提出的架构诊断，动手前已对每一条关键判断做了源码级核实（均在当前 worktree 内可复现）：

1. `src/core/createMindMap.ts:110` 确认 `openRealtimeRenderOnNodeTextEdit: false`（上游实时渲染已关），而 YeMind 自己在 `text-change` 里发 `node_text_edit_change` → `RenderLifecycleCoordinator.scheduleTextEdit` → `commitTextEdit` 里调用 `node.createTextNode()`/`layout()`/`update()`/`renderLine()`，等于自建了一套更复杂的实时渲染。
2. `src/editor/YeMindRichText.ts:830-843` 的 `startPlacementMonitor` 确认是无条件永久 rAF 循环，只要 `showTextEdit` 为真就每帧执行，和另一套事件驱动的 `bindPlacementTracking()` 同时并存。
3. `src/editor/nodeQuickActions.ts:336-354` 的 `trackRenderedGeometry` 确认同样问题：只要 `renderedActionTargets.size > 0` 就在自己结尾（354 行）无条件重新调度自己，形成永久循环；`RenderLifecycleCoordinator.flushPendingTextEdit` 在全仓库没有任何调用点，是死代码。
4. CSS 内边距叠加问题**确认为真**：`node_modules/quill/dist/quill.core.css` 里 `.ql-editor{padding:12px 15px}` 是 Quill 默认值；YeMind 现有 CSS（`src/styles/index.css:1137-1152`）只清零了画布编辑框的 `border`/`outline`/`box-shadow`/`background`，唯独没有清零 `padding`；外层 `.smm-richtext-node-edit-wrap` 自身的 `padding: 4px 6px` 是 vendor `RichText.js` 用 JS 内联设置的（`textNodePaddingX=6`、`textNodePaddingY=4`），和静态 SVG 测量容器 `.smm-richtext-node-wrap`（`padding-inline:1px`）不对齐。这两层叠加导致编辑框实际可用宽度比静态层窄，边界文字掉行。
5. `selectTextOnEnterEditText: true`（`createMindMap.ts:94`）与 YeMind 自己的 `isPristineNodeTextData`（`src/editor/textEditingPolicy.ts:17-22`）是 **OR 关系**（`YeMindRichText.ts:508`：`const selectAll = start === 0 || isPristineNodeTextData(data);`），不是互相覆盖。把配置改为 `false` 后，`isPristineNodeTextData` 仍能保证"全新/从未编辑节点自动全选"，普通已有节点则回到光标放末尾。
6. 节点宽度拖动结束后的最终校准**已经**通过 `dragModifyNodeWidthEnd` 处理器内部调用 `mindMap.render()` 间接触发 `node_tree_render_end` 覆盖，`bindPlacementTracking()` 已订阅该事件，不需要额外新增监听。
7. `canvasRichTextVisibility.ts` 里的孤儿静态文字层清理逻辑（`removeOrphanedStaticTextLayers`），其存在的唯一原因是"编辑期间 `commitTextEdit` 重建 `_textData`"与"宽度拖动 DOM 复用"竞态；一旦编辑期间不再调用 `createTextNode()`，这个函数永远不会再被触发，可以安全删除。
8. 删除 `NodeQuickActionsController` 的永久几何循环前确认了一个真实风险：节点被结构化拖拽（`Drag.js` 插件）时不会触发任何已订阅的 viewport 事件，只有旧的永久 rAF 循环在跟随移动。vendor 侧确认存在 `node_dragging`（拖拽中持续触发）与 `node_dragend`（结束触发，`Drag.js:122,211`）两个事件，可以用来在拖拽期间隐藏快捷按钮、结束后 `scheduleRefresh()` 重新定位，避免直接删除循环后出现"按钮悬空不跟手"的回归。

## 有意的行为取舍（务必写入 CHANGELOG，不要静默改变）

- **编辑过程中节点边框不再实时增长。** 之前"输入文字时节点框跟着变大"的效果，代价是每次按键都要重建 SVG 静态文字（正是抖动根因）。本次改动后，节点的可视大小只在编辑结束提交时更新一次。用户原始方案里提到的"可选 HTML overlay 模拟实时边框"标注为可选项，不在本次范围内。
- **粘贴不再触发单独的即时提交分支。** 之前 `reason: 'paste'` 会绕过其它逻辑立即提交一次；这个分支和它所依赖的 `pasteTransactionPending`/`emitLiveTextEditChange` 一起整体删除，粘贴内容和其它编辑一样，只在关闭编辑时随 `hideEditText()` 的 `SET_NODE_TEXT` 一次性提交。

---

## 文件结构总览

| 文件 | 改动类型 | 职责 |
|---|---|---|
| `src/editor/RenderedTextGeometryRepair.ts` | 新建 | 只负责"渲染后检查富文本是否溢出 SVG foreignObject 并修复一次"，从 `RenderLifecycleCoordinator` 拆出 |
| `src/editor/RenderLifecycleCoordinator.ts` | 删除 | 实时提交部分整体删除，溢出修复部分已迁出 |
| `src/editor/YeMindRichText.ts` | 修改 | 删除 `pasteTransactionPending`/`emitLiveTextEditChange`/`startPlacementMonitor`/`placementMonitorFrame`；`text-change` 监听器不再发事件；打开编辑改为一次同步校准 + 一帧延迟校准 |
| `src/editor/YeMindEditor.ts` | 修改 | 接线改为 `RenderedTextGeometryRepair`；删除 `node_text_edit_change` 监听器；`hide_text_edit` 不再调用 `invalidate()`；给 `nodeQuickActions` 接入文字编辑与节点拖拽的显隐事件 |
| `src/editor/nodeQuickActions.ts` | 修改 | `trackRenderedGeometry` 去掉自我重新调度；新增 `suppress()`/`resume()`；构造时订阅 `node_dragging`/`node_dragend` |
| `src/editor/canvasRichTextVisibility.ts` | 修改 | 删除 `removeOrphanedStaticTextLayers` 及其调用 |
| `src/core/createMindMap.ts` | 修改 | `selectTextOnEnterEditText: true` → `false` |
| `src/styles/index.css` | 修改 | 给画布编辑框内的 `.ql-container`/`.ql-editor` 补齐 `padding:0`/`box-sizing:border-box` |
| `tests/suites/rich-text-editing/v151RenderLifecycle.suite.ts` | 重写 | 删除所有测"实时提交"的用例，改用 `RenderedTextGeometryRepair`，新增"编辑期间不得触碰 SVG"断言 |
| `tests/suites/rich-text-editing/v065CanvasRichTextVisibility.suite.ts` | 修改 | 删除孤儿清理测试 |
| `tests/e2e/web-rich-text-outline.spec.ts` | 修改 | 删除/改写依赖"实时边框增长"的用例；新增真实慢速逐字符输入、换行一致性、单文字层采样测试 |

---

### Task 1：拆出 `RenderedTextGeometryRepair`，删除 `RenderLifecycleCoordinator` 的实时提交部分

**Files:**
- Create: `src/editor/RenderedTextGeometryRepair.ts`
- Delete: `src/editor/RenderLifecycleCoordinator.ts`
- Test: `tests/suites/rich-text-editing/v151RenderLifecycle.suite.ts`

- [ ] **Step 1：读一遍当前 `RenderLifecycleCoordinator.ts` 全文，确认要保留的部分**

保留的公共接口只有：构造函数 `(mindMap, onCommitted, scheduler?)`、`reconcileRenderedTextGeometry(): boolean`、`invalidate(): void`（只用于取消尚未完成的溢出修复 rAF，不再涉及 pending/debounce）、`destroy(): void`。`RenderLifecycleScheduler` 接口和 `browserScheduler` 默认实现原样保留。`RenderLifecycleTimer`/`browserTimer`/`DEFAULT_COMMIT_DEBOUNCE_MS`/`scheduleTextEdit`/`commitTextEdit`/`flushPendingTextEdit`/`pending`/`frame`/`debounceTimer`/`revision`/`RenderTextEditPayload` 全部删除（`revision` 只在实时提交里用于防止提交过期数据，溢出修复不需要它）。

- [ ] **Step 2：新建 `src/editor/RenderedTextGeometryRepair.ts`**

```ts
import { hasActiveNodeWidthDrag } from './liveNodeWidthLayout';

export interface RenderedTextGeometryScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
}

const browserScheduler: RenderedTextGeometryScheduler = {
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (id) => window.cancelAnimationFrame(id),
};

/**
 * Runs after a full render (theme/font change, opening a saved map, structural
 * mutation) to catch a rich-text node whose measured HTML content no longer
 * fits its SVG foreignObject and repaint just that node once. This never runs
 * during an active edit session -- the live-edit commit path that used to
 * share this class was removed because it rebuilt static SVG text on every
 * keystroke (see docs/superpowers/plans/2026-07-31-canvas-text-edit-stabilization.md).
 */
export class RenderedTextGeometryRepair {
  private geometryRepairInFlight = false;
  private geometryRepairFrame: number | null = null;

  constructor(
    private readonly mindMap: any,
    private readonly onCommitted: (uid?: string) => void,
    private readonly scheduler: RenderedTextGeometryScheduler = browserScheduler,
  ) {}

  reconcileRenderedTextGeometry(): boolean {
    if (
      this.geometryRepairInFlight
      || hasActiveNodeWidthDrag(this.mindMap?.renderer?.root)
    ) return false;
    const overflowing: Array<{
      node: any;
      foreignRect: { width: number; height: number };
      textRect: { width: number; height: number };
    }> = [];
    const visit = (node: any): void => {
      if (!node) return;
      const foreignObject = node?._textData?.nodeContent?.node as Element | undefined;
      const wrapper = foreignObject?.querySelector?.('.smm-richtext-node-wrap') as HTMLElement | null;
      const foreignRect = foreignObject?.getBoundingClientRect?.();
      const textRect = wrapper?.getBoundingClientRect?.();
      if (
        foreignRect
        && textRect
        && Number.isFinite(foreignRect.width)
        && Number.isFinite(foreignRect.height)
        && Number.isFinite(textRect.width)
        && Number.isFinite(textRect.height)
        && (textRect.width > foreignRect.width + 0.5 || textRect.height > foreignRect.height + 0.5)
      ) {
        overflowing.push({ node, foreignRect, textRect });
      }
      (Array.isArray(node.children) ? node.children : []).forEach(visit);
    };
    visit(this.mindMap?.renderer?.root);
    if (overflowing.length === 0) return false;
    this.geometryRepairInFlight = true;
    overflowing.forEach(({ node }) => {
      node.reRender?.(['text'], { ignoreUpdateCustomTextWidth: true });
      if (node.nodeData?.data) delete node.nodeData.data.customTextWidth;
      if (node) node.customTextWidth = undefined;
    });
    if (this.geometryRepairFrame !== null) this.scheduler.cancel(this.geometryRepairFrame);
    this.mindMap.render?.(() => {
      this.geometryRepairFrame = this.scheduler.request(() => {
        this.geometryRepairFrame = null;
        this.geometryRepairInFlight = false;
        this.onCommitted();
      });
    }, 'yemind-richtext-geometry-repair');
    return true;
  }

  invalidate(): void {
    if (this.geometryRepairFrame !== null) this.scheduler.cancel(this.geometryRepairFrame);
    this.geometryRepairFrame = null;
  }

  destroy(): void {
    this.invalidate();
    this.geometryRepairInFlight = false;
  }
}
```

（这段代码直接照搬自 `RenderLifecycleCoordinator.ts` 现有的 `reconcileRenderedTextGeometry` 实现，逻辑一字不改，只是搬到新类、去掉了 `revision` 相关的实时提交耦合。执行者动手时请以 `RenderLifecycleCoordinator.ts` 现有代码为准做逐行核对，如有出入以现有代码为准。）

- [ ] **Step 3：删除 `src/editor/RenderLifecycleCoordinator.ts`**

```bash
rm src/editor/RenderLifecycleCoordinator.ts
```

- [ ] **Step 4：重写 `tests/suites/rich-text-editing/v151RenderLifecycle.suite.ts`**

删除以下用例（测的是被删除的实时提交机制，全部移除）：
- `V151-20 renders the newest typed text against the current live node`
- `commits one paste transaction immediately without leaving a duplicate animation-frame render`
- `keeps an open editor on one live SVG node instead of replacing the whole tree`
- `does not cascade renderLine into the edited node's descendants on every keystroke...`
- `coalesces a burst of rapid keystrokes / IME composition updates into one commit...`
- `flushes the latest edit immediately when the editor closes mid-debounce...`
- `reports the committed live UID so every render can restore the single visible edit layer`
- `V151-21/V151-22 discards a queued edit after structure mutation or deletion`
- `V151-20 measures rich text from visible text instead of literal HTML tags`
- `commits the final complete root text when edit close cancels the queued frame`

保留并迁移这三个用例（改 import 和构造函数为 `RenderedTextGeometryRepair`，函数体不变）：
- `repairs a rendered rich-text node when its text overflows the SVG foreignObject`
- `does not redraw when rendered rich text already fits its SVG foreignObject`
- `does not start a competing geometry repair while a width handle is being dragged`

文件顶部 import 改为：

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  RenderedTextGeometryRepair,
  type RenderedTextGeometryScheduler,
} from '../../../src/editor/RenderedTextGeometryRepair';
```

三个保留用例里 `new RenderLifecycleCoordinator(...)` 全部替换为 `new RenderedTextGeometryRepair(...)`，`RenderLifecycleScheduler` 类型引用替换为 `RenderedTextGeometryScheduler`，其余断言不变。

- [ ] **Step 5：运行测试确认迁移正确**

```bash
npx vitest run tests/specs/rich-text-editing.test.ts
```

Expected: 3 个迁移后的用例通过；其它删除掉的用例不再出现在输出里。

- [ ] **Step 6：提交**

```bash
git add src/editor/RenderedTextGeometryRepair.ts tests/suites/rich-text-editing/v151RenderLifecycle.suite.ts
git rm src/editor/RenderLifecycleCoordinator.ts
git commit -m "refactor: split overflow repair out of RenderLifecycleCoordinator into RenderedTextGeometryRepair"
```

（此时 `YeMindRichText.ts`/`YeMindEditor.ts` 还引用着旧类型，编译会报错——这是预期的，Task 2/3 会修好。可以先不跑 `npm run check`，等 Task 3 完成后再统一验证。）

---

### Task 2：删除 `YeMindRichText.ts` 里的实时提交事件发出

**Files:**
- Modify: `src/editor/YeMindRichText.ts`
- Test: `tests/suites/rich-text-editing/v084DragRichTextRecovery.suite.ts`（如涉及则一并核对）

- [ ] **Step 1：找到并删除 `pasteTransactionPending` 字段**

```bash
grep -n "pasteTransactionPending" src/editor/YeMindRichText.ts
```

删除该字段声明，以及 `paste` 事件监听器里对它的写入（`this.pasteTransactionPending = true;` 及配套的 `queueMicrotask(() => { this.pasteTransactionPending = false; });`）。`paste` 事件监听器本身（`this.quill.root.addEventListener('paste', ...)`）如果只剩下这两行可以整体删除；如果还处理了 `event.clipboardData?.files?.length` 相关的图片粘贴拦截逻辑，保留那部分，只删掉 `pasteTransactionPending` 相关代码。

- [ ] **Step 2：删除 `emitLiveTextEditChange` 方法及其调用**

```bash
grep -n "emitLiveTextEditChange" src/editor/YeMindRichText.ts
```

删除方法定义：

```ts
private emitLiveTextEditChange(reason: 'paste' | 'input'): void {
  this.mindMap.emit('node_text_edit_change', {
    node: this.node,
    text: this.getEditText(),
    richText: true,
    reason,
  });
}
```

以及 `text-change` 监听器里的调用行 `this.emitLiveTextEditChange(this.pasteTransactionPending ? 'paste' : 'input');`。

- [ ] **Step 3：确认 `text-change` 监听器改后的内容**

删除后，`this.quill.on('text-change', ...)` 监听器应该只保留内容标记、revision 递进、选区缓存失效这三件事，看起来像这样（以现有代码的 `source === Quill.sources.USER` 分支和 `advanceRevision` 调用为准，只删掉最后一行 `emitLiveTextEditChange` 调用）：

```ts
this.quill.on('text-change', (_delta: unknown, _oldDelta: unknown, source: string) => {
  if (source === Quill.sources.USER) {
    markNodeTextEditedData(this.node?.nodeData?.data ?? this.node?.getData?.());
    this.range = null;
    this.lastRange = null;
  }
  this.sessionCoordinator().advanceRevision(quillSessionId);
});
```

不要删除 `markNodeTextEditedData`/`this.range = null`/`this.lastRange = null`/`advanceRevision` 这几行——它们分别是"已编辑"标记、v1.7.2 修的退格误删大段文字的选区缓存失效、以及编辑会话的 revision 追踪，和实时 SVG 提交无关，必须保留。

- [ ] **Step 4：运行相关单元测试，预期出现编译错误或断言失败（红）**

```bash
npx vitest run tests/specs/rich-text-editing.test.ts 2>&1 | tail -40
```

Expected: 出现 `node_text_edit_change` 相关的失败（因为 `YeMindEditor.ts` 还在监听这个事件，Task 3 会处理）。这一步只是确认改动生效，不代表最终验证。

- [ ] **Step 5：提交**

```bash
git add src/editor/YeMindRichText.ts
git commit -m "refactor: stop emitting node_text_edit_change on every keystroke"
```

---

### Task 3：`YeMindEditor.ts` 接线改为 `RenderedTextGeometryRepair`，删除实时提交监听

**Files:**
- Modify: `src/editor/YeMindEditor.ts`

- [ ] **Step 1：替换 import**

```bash
grep -n "RenderLifecycleCoordinator" src/editor/YeMindEditor.ts
```

第 143/145 行左右的 import 改为：

```ts
import { RenderedTextGeometryRepair } from './RenderedTextGeometryRepair';
```

- [ ] **Step 2：替换字段声明（第 275 行附近）**

```ts
private renderLifecycle: RenderedTextGeometryRepair | null = null;
```

字段名保持 `renderLifecycle` 不变（降低改动面；如果执行者认为改名更清晰，可以同步改名为 `textGeometryRepair` 并同步更新以下所有引用点，两种做法都可以，选一种即可，不要混用）。

- [ ] **Step 3：替换构造（第 1100-1104 行附近）**

```ts
this.renderLifecycle = new RenderedTextGeometryRepair(this.map, () => {
  synchronizeCanvasRichTextVisibility(this.map as any);
  this.nodeQuickActions?.scheduleRefresh();
  this.miniMapController?.refresh();
});
```

- [ ] **Step 4：删除 `node_text_edit_change` 监听器（第 2119-2121 行附近）**

```bash
grep -n "node_text_edit_change" src/editor/YeMindEditor.ts
```

整段删除：

```ts
this.map.on('node_text_edit_change', (payload: RenderTextEditPayload) => {
  this.renderLifecycle?.scheduleTextEdit(payload);
});
```

同时删除文件顶部对 `RenderTextEditPayload` 类型的 import（如果这个类型不再被别处引用——用 `grep -n "RenderTextEditPayload" src/editor/YeMindEditor.ts` 确认没有其它引用后再删 import，避免误删仍在用的类型）。

- [ ] **Step 5：修改 `hide_text_edit` 监听器（第 2122-2131 行附近）**

现有代码：

```ts
this.map.on('hide_text_edit', () => {
  this.renderLifecycle?.invalidate();
  synchronizeCanvasRichTextVisibility(this.map as any);
```

改为：

```ts
this.map.on('hide_text_edit', () => {
  // The live-edit commit path (and everything it could leave pending) was
  // removed; hideEditText() already committed the final text authoritatively
  // via SET_NODE_TEXT before this event fired. Nothing to invalidate here.
  synchronizeCanvasRichTextVisibility(this.map as any);
```

即删掉 `this.renderLifecycle?.invalidate();` 这一行，其余（`synchronizeCanvasRichTextVisibility` 调用和后续隐藏快捷按钮相关代码，见 Task 6）保留。

- [ ] **Step 6：确认 `reconcileRenderedTextGeometry`/`destroy` 调用点不用改**

第 1331、2138 行的 `this.renderLifecycle?.reconcileRenderedTextGeometry();`，第 829-830 行的 `this.renderLifecycle?.destroy(); this.renderLifecycle = null;`，第 2142 行 `data_change` 里的 `this.renderLifecycle?.invalidate();`——这四处方法名在新类里原样保留（`reconcileRenderedTextGeometry`/`destroy`/`invalidate`），不需要改动，只是现在调用的是 `RenderedTextGeometryRepair` 的实现。

- [ ] **Step 7：类型检查**

```bash
npm run check
```

Expected: 通过，不再有 `RenderLifecycleCoordinator`/`scheduleTextEdit`/`flushPendingTextEdit`/`RenderTextEditPayload` 相关的类型错误。

- [ ] **Step 8：提交**

```bash
git add src/editor/YeMindEditor.ts
git commit -m "refactor: wire YeMindEditor to RenderedTextGeometryRepair, drop live-edit commit listener"
```

---

### Task 4：删除孤儿静态文字层清理逻辑

**Files:**
- Modify: `src/editor/canvasRichTextVisibility.ts`
- Test: `tests/suites/rich-text-editing/v065CanvasRichTextVisibility.suite.ts`

- [ ] **Step 1：删除 `removeOrphanedStaticTextLayers` 函数定义和调用**

在 `synchronizeCanvasRichTextVisibility()` 函数体开头，删除这一行调用：

```ts
removeOrphanedStaticTextLayers(node, staticTextLayers(node));
```

删除 `removeOrphanedStaticTextLayers` 函数本身的完整定义。同时删除 `RichTextRuntime.node` 接口上专门为这个函数加的 `group?: { node?: Element | null } | null;` 字段——先用 `grep -n "\.group" src/editor/canvasRichTextVisibility.ts` 确认这个字段没有被文件里其它地方使用后再删；如果还有别处用到就保留接口字段，只删函数本身和调用。

- [ ] **Step 2：删除对应测试用例**

打开 `tests/suites/rich-text-editing/v065CanvasRichTextVisibility.suite.ts`，删除整个 `it('removes an orphaned duplicate static text layer left behind by a DOM reconciliation race', ...)` 用例（第 144 行开始到该 `it` 块结束）。

- [ ] **Step 3：运行测试确认**

```bash
npx vitest run tests/specs/rich-text-editing.test.ts
```

Expected: 全部通过，用例总数比删除前少 1。

- [ ] **Step 4：提交**

```bash
git add src/editor/canvasRichTextVisibility.ts tests/suites/rich-text-editing/v065CanvasRichTextVisibility.suite.ts
git commit -m "refactor: remove orphaned-static-text cleanup now that live edit never rebuilds SVG text"
```

---

### Task 5：删除永久 placement RAF，改为一次同步 + 一帧延迟校准

**Files:**
- Modify: `src/editor/YeMindRichText.ts`

- [ ] **Step 1：删除 `startPlacementMonitor` 方法和 `placementMonitorFrame` 字段**

```bash
grep -n "startPlacementMonitor\|placementMonitorFrame" src/editor/YeMindRichText.ts
```

删除字段声明 `private placementMonitorFrame: number | null = null;`（第 261 行附近），删除整个 `startPlacementMonitor(sessionId: number): void { ... }` 方法（第 830-843 行附近）。

- [ ] **Step 2：修改 `unbindPlacementTracking` 里对 `placementMonitorFrame` 的清理**

现有代码（第 887-889 行附近）：

```ts
if (this.placementMonitorFrame !== null) {
  window.cancelAnimationFrame?.(this.placementMonitorFrame);
  this.placementMonitorFrame = null;
}
```

整段删除（字段已经不存在了）。确认 `unbindPlacementTracking` 里仍然保留对 `placementResizeObserver`/事件订阅的清理（这些和 `bindPlacementTracking()` 配对，不受本次改动影响）。

- [ ] **Step 3：修改 `showEditText()` 里的调用**

现有代码（第 393 行附近）：

```ts
this.bindPlacementTracking();
this.reconcileEditorPlacement(sessionId);
this.startPlacementMonitor(sessionId);
```

改为：

```ts
this.bindPlacementTracking();
this.reconcileEditorPlacement(sessionId);
// A newly inserted node can emit node_dblclick before the browser flushes
// its final group transform (see schedulePlacementStabilization's own
// comment). One synchronous pass above plus one more scheduled frame here
// covers that without a permanent per-frame monitor: every other geometry
// change is already covered by bindPlacementTracking's event subscriptions
// (resize/scale/translate/node_tree_render_end/view_data_change) and by the
// width-drag frame loop in liveNodeWidthLayout.ts.
this.schedulePlacementStabilization();
```

- [ ] **Step 4：确认 `schedulePlacementStabilization` 现有实现不用改**

`schedulePlacementStabilization()`（第 852-861 行附近）已经是"取消旧的、排一帧、校验 `editingUid` 没变再调用 `updateTextEditNode()`"的一次性实现，直接复用，不需要修改。

- [ ] **Step 5：类型检查 + 相关单元测试**

```bash
npm run check
npx vitest run tests/specs/rich-text-editing.test.ts
```

Expected: 全部通过。

- [ ] **Step 6：提交**

```bash
git add src/editor/YeMindRichText.ts
git commit -m "refactor: replace permanent placement RAF monitor with one scheduled calibration frame"
```

---

### Task 6：快捷操作按钮永久 RAF 改事件驱动，编辑/拖拽期间隐藏

**Files:**
- Modify: `src/editor/nodeQuickActions.ts`
- Modify: `src/editor/YeMindEditor.ts`

- [ ] **Step 1：`trackRenderedGeometry` 去掉自我重新调度**

现有代码（第 336-354 行）结尾：

```ts
      if (target.element.style.left !== left) target.element.style.left = left;
      if (target.element.style.top !== top) target.element.style.top = top;
    }
    this.startGeometryTracking();
  };
```

删除最后的 `this.startGeometryTracking();` 调用，改为：

```ts
      if (target.element.style.left !== left) target.element.style.left = left;
      if (target.element.style.top !== top) target.element.style.top = top;
    }
  };
```

这样 `trackRenderedGeometry` 变成"跑一次就停"，后续只能被外部事件（已有的 `translate`/`scale`/`resize`/`view_data_change`，见 Step 2）重新触发。

- [ ] **Step 2：订阅 `node_dragging`/`node_dragend`，拖拽期间隐藏、结束后刷新**

在构造函数（第 200-211 行附近）的 `this.bindViewportTracking();` 之后，新增：

```ts
this.options.viewportEventSource?.on?.('node_dragging', this.onNodeDraggingStart);
this.options.viewportEventSource?.on?.('node_dragend', this.onNodeDragEnd);
```

新增两个私有只读箭头函数字段（放在 `onViewportChange` 定义附近，第 322-324 行左右）：

```ts
private readonly onNodeDraggingStart = (): void => {
  if (this.layer.style.visibility === 'hidden') return;
  this.layer.style.visibility = 'hidden';
  this.stopGeometryTracking();
};

private readonly onNodeDragEnd = (): void => {
  this.layer.style.visibility = '';
  this.scheduleRefresh();
};
```

在 `unbindViewportTracking()`（第 316-320 行）里同步取消订阅：

```ts
private unbindViewportTracking(): void {
  ['translate', 'scale', 'resize', 'view_data_change'].forEach((name) => {
    this.options.viewportEventSource?.off?.(name, this.onViewportChange);
  });
  this.options.viewportEventSource?.off?.('node_dragging', this.onNodeDraggingStart);
  this.options.viewportEventSource?.off?.('node_dragend', this.onNodeDragEnd);
}
```

- [ ] **Step 3：新增 `suppress()`/`resume()` 供文字编辑期间调用**

在 `scheduleRefresh()` 方法（第 230-236 行）之前新增两个公开方法：

```ts
suppress(): void {
  this.layer.style.visibility = 'hidden';
  this.stopGeometryTracking();
}

resume(): void {
  this.layer.style.visibility = '';
  this.scheduleRefresh();
}
```

- [ ] **Step 4：`YeMindEditor.ts` 接入文字编辑事件**

```bash
grep -n "before_show_text_edit\|hide_text_edit" src/editor/YeMindEditor.ts
```

在 `before_show_text_edit` 监听器（第 2105 行附近）里追加一行：

```ts
this.nodeQuickActions?.suppress();
```

在 `hide_text_edit` 监听器（Task 3 已经改过这段）末尾追加一行：

```ts
this.nodeQuickActions?.resume();
```

- [ ] **Step 5：类型检查 + 相关单元测试**

```bash
npm run check
npx vitest run tests/specs/rich-text-editing.test.ts
```

Expected: 全部通过。这一步没有对应的 E2E 自动化断言"拖拽时按钮隐藏、松手后归位"，Task 9 会补一个真实浏览器用例。

- [ ] **Step 6：提交**

```bash
git add src/editor/nodeQuickActions.ts src/editor/YeMindEditor.ts
git commit -m "refactor: replace permanent quick-actions RAF loop with event-driven refresh, hide during drag/edit"
```

---

### Task 7：双击全选配置改为事件驱动的 pristine 判断

**Files:**
- Modify: `src/core/createMindMap.ts`

- [ ] **Step 1：修改配置**

第 94 行：

```ts
selectTextOnEnterEditText: true,
```

改为：

```ts
selectTextOnEnterEditText: false,
```

- [ ] **Step 2：写一个单元测试锁定新行为**

在 `tests/suites/rich-text-editing/`（或已有覆盖 `isPristineNodeTextData`/`focus` 的测试文件里，先用 `grep -rn "isPristineNodeTextData" tests/` 找到合适的现有文件）新增：

```ts
it('places the caret at the end for an already-edited node and selects all for a pristine one', () => {
  // selectTextOnEnterEditText is now false; isPristineNodeTextData is the
  // only source of "select all on open" for a normal (non-keydown) entry.
  const editedData = { text: '已经编辑过的内容', yemindTextEdited: true };
  const pristineData = { text: '新节点', yemindTextEdited: false };
  expect(isPristineNodeTextData(editedData)).toBe(false);
  expect(isPristineNodeTextData(pristineData)).toBe(true);
});
```

（这个测试只锁定 `isPristineNodeTextData` 的判定结果，真正"双击后光标位置"的端到端行为在 Task 9 用真实 Playwright 双击断言。）

- [ ] **Step 3：运行**

```bash
npx vitest run tests/specs/rich-text-editing.test.ts
```

Expected: 通过。

- [ ] **Step 4：提交**

```bash
git add src/core/createMindMap.ts tests/suites/rich-text-editing/*.suite.ts
git commit -m "fix: stop force-selecting all text on every non-keydown edit entry, rely on pristine-node detection"
```

---

### Task 8：统一 Quill 编辑框与静态 SVG 文字的内边距

**Files:**
- Modify: `src/styles/index.css`

- [ ] **Step 1：在现有的画布编辑框规则块之后补充 padding 清零**

在 `src/styles/index.css` 第 1137-1152 行附近（`/* v0.9.8 canvas drag edge continuity and flat text editing */` 注释块）已有的规则之后，新增：

```css
.ymz-editor .smm-richtext-node-edit-wrap .ql-container,
.ymz-editor .smm-richtext-node-edit-wrap .ql-editor{
  box-sizing:border-box;
  margin:0;
  padding:0;
  line-height:inherit;
}
```

不要修改外层 `.smm-richtext-node-edit-wrap` 自身的 padding——那是 vendor `RichText.js` 用 JS 内联设置的 `padding: 4px 6px`（对应 `textNodePaddingY=4`/`textNodePaddingX=6`），本身就是 `applyEditorGeometry()` 里 `originWidth + this.textNodePaddingX * 2` 这套宽高计算假设的那份内边距，不能动；只清零 Quill 自己在 `.ql-editor`/`.ql-container` 上叠加的默认 `padding:12px 15px`。

- [ ] **Step 2：真实浏览器里验证内边距只剩一层**

```bash
npm run build:web
```

用 preview_start 打开 web-dist，双击一个节点进入编辑，用 `javascript_tool` 读取 `getComputedStyle(document.querySelector('.smm-richtext-node-edit-wrap .ql-editor')).padding`，确认是 `0px`；再读取外层 `.smm-richtext-node-edit-wrap` 的 `getComputedStyle(...).padding`，确认仍是 `4px 6px`。

- [ ] **Step 3：提交**

```bash
git add src/styles/index.css
git commit -m "fix: zero out Quill's default .ql-editor padding so it doesn't stack with the wrap's own inset"
```

---

### Task 9：新增/重写测试——编辑期间不得触碰 SVG、真实慢速输入、换行一致性

**Files:**
- Modify: `tests/e2e/web-rich-text-outline.spec.ts`

- [ ] **Step 1：找到并删除/改写依赖"实时边框增长"的旧用例**

```bash
grep -n "边框立即\|border.*grow\|grows the live node monotonically" tests/e2e/web-rich-text-outline.spec.ts
```

对每个命中：如果用例断言的是"输入过程中节点边框跟着变大"（例如标题含"编辑过程中边框立即增长"这类描述、或直接断言 `node.width`/`getBoundingClientRect()` 在按键之间递增），删除该用例，因为这个行为被有意移除了（见前面"有意的行为取舍"一节）。如果用例断言的是"最终提交后边框正确"（不涉及编辑过程中），保留不动。执行者需要逐个读一遍再决定，不要批量删除。

- [ ] **Step 2：新增"编辑期间从不触碰 SVG"的真实慢速输入用例**

在文件末尾新增：

```ts
test('typing with real pauses between characters never rebuilds the static SVG text mid-edit', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop live-edit isolation regression');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();

  const staticTextGroupCountBefore = await editor.locator('.smm-node').first()
    .locator('.smm-text-node-wrap,.smm-richtext-node-wrap').count();

  // Each character waits longer than the old 160ms debounce window used to.
  // If any code path still rebuilds SVG text mid-edit, this would flicker or
  // change the static group count while the editor stays open.
  await textEditor.pressSequentially('abc', { delay: 250 });

  const staticTextGroupCountDuring = await editor.locator('.smm-node').first()
    .locator('.smm-text-node-wrap,.smm-richtext-node-wrap').count();
  expect(staticTextGroupCountDuring).toBe(staticTextGroupCountBefore);
  await expect(textEditor).toHaveText('abc');
  expect(errors).toEqual([]);

  await textEditor.press('Backspace');
  await page.waitForTimeout(250);
  const staticTextGroupCountAfterDelete = await editor.locator('.smm-node').first()
    .locator('.smm-text-node-wrap,.smm-richtext-node-wrap').count();
  expect(staticTextGroupCountAfterDelete).toBe(staticTextGroupCountBefore);
  await expect(textEditor).toHaveText('ab');
});
```

- [ ] **Step 3：新增换行一致性用例**

```ts
test('the line a character sits on before entering edit matches the line it sits on after', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop line-wrap consistency regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const longText = 'PCIe RAS Reliability Availability Serviceability 可靠性可用性可维护性完整长句测试换行一致性';

  await rootNode.dblclick();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await textEditor.fill(longText);
  await commitCanvasEdit(page);

  const staticLineCount = await rootNode.locator('.smm-text-node-wrap,tspan').count();

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  const editorLineCount = await textEditor.evaluate((el) => el.querySelectorAll(':scope > *').length);

  expect(editorLineCount).toBeGreaterThan(0);
  expect(staticLineCount).toBeGreaterThan(0);
  // Exact equality of DOM node counts between an SVG <text>/<tspan> layout and
  // a Quill <p> layout isn't meaningful line-for-line; what matters is that
  // neither is a single line while the other wraps into several -- a coarse
  // multi-line-vs-single-line mismatch is exactly the "last character drops
  // to the next line" symptom this task's CSS fix (Task 8) targets.
  const staticIsMultiline = staticLineCount > 1;
  const editorIsMultiline = editorLineCount > 1;
  expect(editorIsMultiline).toBe(staticIsMultiline);
  await commitCanvasEdit(page);
});
```

- [ ] **Step 4：新增单文字层采样用例（60 帧）**

```ts
test('exactly one text layer (SVG or Quill) is visible on every sampled frame while typing', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop single-layer regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await expect(textEditor).toBeFocused();

  const samples = await page.evaluate(async () => {
    const host = document.querySelector('.ymw-editor > .ymz-editor .smm-node');
    const results: Array<{ svgVisible: boolean; quillVisible: boolean }> = [];
    for (let i = 0; i < 60; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const svgText = host?.querySelector('.smm-text-node-wrap,.smm-richtext-node-wrap') as HTMLElement | SVGElement | null;
      const quillEditor = document.querySelector('.smm-richtext-node-edit-wrap .ql-editor') as HTMLElement | null;
      const svgVisible = svgText ? getComputedStyle(svgText).visibility !== 'hidden' : false;
      const quillVisible = quillEditor ? getComputedStyle(quillEditor).visibility !== 'hidden' : false;
      results.push({ svgVisible, quillVisible });
    }
    return results;
  });

  const bothVisibleFrames = samples.filter((s) => s.svgVisible && s.quillVisible).length;
  expect(bothVisibleFrames).toBe(0);
  await commitCanvasEdit(page);
});
```

- [ ] **Step 5：新增拖拽期间快捷按钮隐藏用例（对应 Task 6）**

```ts
test('node quick actions hide while a structural drag is in progress and reappear after it ends', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop drag-suppression regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.click();
  const layer = editor.locator('.ymz-node-quick-actions-layer');
  await expect(layer.locator('.ymz-node-quick-action').first()).toBeVisible();

  const box = await rootNode.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + 120, box!.y + 40, { steps: 6 });
  await expect(layer).toHaveCSS('visibility', 'hidden');
  await page.mouse.up();

  await expect(layer.locator('.ymz-node-quick-action').first()).toBeVisible();
});
```

- [ ] **Step 6：运行完整富文本 E2E 文件**

```bash
npx playwright test tests/e2e/web-rich-text-outline.spec.ts --project=chromium-desktop
```

Expected: 全部通过。如果拖拽用例因为具体 DOM 结构/选择器和实际渲染不完全一致而失败，用 `page.pause()`/截图排查实际 DOM，调整选择器，不要跳过或删除断言本身。

- [ ] **Step 7：提交**

```bash
git add tests/e2e/web-rich-text-outline.spec.ts
git commit -m "test: replace live-edit-render assertions with never-touches-SVG-mid-edit, wrap consistency, single-layer and drag-suppression coverage"
```

---

### Task 10：全量验证、trace 对照、CHANGELOG 与打包发布

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `AGENTS.md`
- Create: `docs/regression-runs/<date>-v1.8.0-画布文字编辑内核精简-回归记录.md`

- [ ] **Step 1：全量单元测试**

```bash
npm run check
npx vitest run tests/specs
```

Expected: 全部通过，0 失败。

- [ ] **Step 2：全量构建**

```bash
npm run build:all
```

Expected: 无报错。

- [ ] **Step 3：完整 Playwright E2E（双端）**

```bash
npx playwright test
```

Expected: 通过率不低于此前几轮的基线（93 passed 左右，允许 0-1 个已知与本次改动无关的偶发用例重试后通过）。如果出现新的、与本次改动直接相关的失败，必须先排查修复，不能跳过。

- [ ] **Step 4：版本号升级为 1.8.0（架构级改动，不是补丁）**

```bash
npm run version:set 1.8.0
npm run check:version
```

- [ ] **Step 5：更新 `AGENTS.md` 的版本行、`CHANGELOG.md` 新增条目**

`CHANGELOG.md` 条目需要包含：
1. 本次改动的动机（引用真实 trace 证据：单节点也能复现、`createTextNode`/`measureText` 是 CPU 采样大头）。
2. 明确列出删除的实时提交链路和两个永久 RAF 循环。
3. 明确写出"有意的行为取舍"一节里的两条（节点编辑期间不再实时增长边框、粘贴不再有单独即时提交分支）。
4. 明确写出 CSS padding 修复和双击全选配置调整。

- [ ] **Step 6：写回归记录文档**

按照 `docs/standards/回归验收清单.md` 的格式，新建 `docs/regression-runs/<今天日期>-v1.8.0-画布文字编辑内核精简-回归记录.md`，包含：改动前后的架构对比、每个 Task 的自动化验证结果表格、"需要人工验证"一节（重点：真实思源里连续快速打字、中文输入法组合、大长文本节点换行、编辑期间节点框不再跟涨这一有意变化是否符合预期）。

- [ ] **Step 7：打包并部署到真实思源插件目录**

```bash
npm run release:build
npm run release:verify
npm run sync:runtime
```

Expected: 三步都成功；`D:\myDatabase\SiYuan\data\plugins\siyuan-yemind\VERSION` 确认为 `1.8.0`。

- [ ] **Step 8：建议人工用真实 Chrome DevTools Performance 面板录制一次 trace 对照**

打开真实 SiYuan，双击此前反复复现问题的长文本节点，录制 Performance trace，连续输入若干字符后停止录制，人工确认 trace 里不再出现 `commitTextEdit → createTextNode → getBBox` 这条调用链——这是用户提出的验收基线，本计划不把它做成自动化 CI 门禁（Playwright 驱动 CDP tracing 会显著增加测试基础设施复杂度和脆弱性，收益相对有限），作为发布前人工确认步骤记录在回归文档里。

- [ ] **Step 9：提交并推送**

```bash
git add CHANGELOG.md AGENTS.md docs/regression-runs/*.md VERSION package.json plugin.json web/VERSION
git commit -m "release: finalize v1.8.0 canvas text edit stabilization"
git push -u origin worktree-stabilization+canvas-text-edit
```

（分支名是当前 worktree 自动生成的 `worktree-stabilization+canvas-text-edit`，如果要用用户最初提到的 `stabilization/canvas-text-edit` 这个名字发 PR，在这一步之前先 `git branch -m stabilization/canvas-text-edit` 重命名本地分支再 push，避免用带 `+` 号的自动生成分支名对外发布。）

---

## 自查清单（写完计划后过一遍，不是给执行者的任务）

- **规格覆盖**：用户原文八条改动点——① 删实时提交链路对应 Task 1-3；② 两套文字层重影对应 Task 1-4（根因删除后重影不再发生，孤儿清理对应删除）；③ 永久 placement RAF 对应 Task 5；④ SVG/Quill 排版差异对应 Task 8；⑤ 防抖治标不治本——本计划直接删除整条实时提交链路而不是调防抖参数，从根上解决；⑥ 测试体系"证明错误架构"——Task 1/9 删除并重写；⑦ quick-actions 永久 RAF——Task 6；⑧ 双击全选配置——Task 7。全部覆盖，无遗漏。
- **占位符扫描**：全文没有 TODO/待补充/"类似上面"这类占位表述,所有代码步骤都给了完整代码或明确的"以现有代码为准逐行核对"提示（仅在搬运长段既有代码时使用，且指明了原始出处方便核对）。
- **类型一致性**：`RenderedTextGeometryRepair` 的方法名（`reconcileRenderedTextGeometry`/`invalidate`/`destroy`）在 Task 1、3、10 之间保持一致；`NodeQuickActionsController` 新增的 `suppress`/`resume` 方法名在 Task 6 内部定义和调用处一致。