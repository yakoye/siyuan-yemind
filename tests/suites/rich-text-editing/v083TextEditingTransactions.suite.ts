import { describe, expect, it, vi } from 'vitest';
import { createMindMap } from '../../../src/core/createMindMap';
import { OutlineRichTextController } from '../../../src/editor/OutlineRichTextController';
import { createDefaultTree } from '../../../src/model/defaultMap';
import { isPristineNodeTextData } from '../../../src/editor/textEditingPolicy';

function rect(left = 0, top = 0, width = 100, height = 30) {
  return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON() {} } as DOMRect;
}

Object.defineProperty(window, 'scrollBy', { value: vi.fn(), configurable: true });

const rangeProto: any = Range.prototype;
rangeProto.getBoundingClientRect ??= () => rect(0, 0, 0, 18);
rangeProto.getClientRects ??= () => [];

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function waitForMapRender(map: any): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (map.renderer.root && map.renderer.isRendering === false) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (map.renderer.isRendering === false) return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('mind-map render did not finish');
}

function prepareSvgRect(value: DOMRect): void {
  const proto: any = (globalThis as any).SVGElement?.prototype;
  if (!proto) return;
  proto.getBBox ??= () => ({ x: 0, y: 0, width: value.width, height: value.height });
  proto.getBoundingClientRect = () => value;
  proto.getScreenCTM ??= () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } });
}

function mountMap(data: any) {
  const root = document.createElement('div');
  root.className = 'ymz-editor';
  const canvas = document.createElement('div');
  root.appendChild(canvas);
  document.body.appendChild(root);
  Object.defineProperty(canvas, 'clientWidth', { value: 800 });
  Object.defineProperty(canvas, 'clientHeight', { value: 600 });
  root.getBoundingClientRect = () => rect(100, 50, 800, 600);
  canvas.getBoundingClientRect = () => rect(100, 50, 800, 600);
  prepareSvgRect(rect(410, 260, 120, 32));
  const map: any = createMindMap({ el: canvas, data, settings: undefined });
  return { root, canvas, map };
}

describe('v0.8.3 canvas text editing transactions', () => {
  it('keeps the canonical source unchanged while the runtime uses upstream rich-text blocks', async () => {
    const multiline = 'Detect\n↓\nPolling\n↓\nConfiguration\n↓\nRecovery\n↓\nL0';
    const source = {
      data: {
        text: multiline,
        uid: 'root',
        richText: false,
        yemindTextEdited: true,
      },
      children: [],
    };
    const { root, map } = mountMap(source);
    await waitForMapRender(map);

    expect(map.getData(false).data).toMatchObject({
      uid: 'root',
      text: '<p>Detect</p><p>↓</p><p>Polling</p><p>↓</p><p>Configuration</p><p>↓</p><p>Recovery</p><p>↓</p><p>L0</p>',
      richText: true,
    });
    expect(source.data).toMatchObject({ text: multiline, richText: false });

    map.destroy();
    root.remove();
  });

  it('normalizes a newly installed canonical tree without losing hard line breaks', async () => {
    const { root, map } = mountMap({
      data: { text: 'Root', uid: 'root', richText: false },
      children: [],
    });
    const multiline = '配置空间读写\n↓\nBAR 寄存器读写\n↓\nDMA 双向传输';

    map.setData({
      data: { text: 'Next', uid: 'next-root', richText: false },
      children: [{
        data: { text: multiline, uid: 'flow', richText: false },
        children: [],
      }],
    });
    await waitForMapRender(map);

    expect(map.getData(false).children[0].data).toMatchObject({
      uid: 'flow',
      text: '<p>配置空间读写</p><p>↓</p><p>BAR 寄存器读写</p><p>↓</p><p>DMA 双向传输</p>',
      richText: true,
    });

    map.destroy();
    root.remove();
  });

  it('uses customTextWidth on the shared upstream HTML text box', async () => {
    const { root, map } = mountMap({
      data: {
        text: 'LTSSM 状态读取及历史记录；当前 Link Speed、Link Width；Lane 状态和 PHY PLL/CDR 状态',
        uid: 'plain-width',
        richText: false,
        customTextWidth: 45,
      },
      children: [],
    });

    await waitForMapRender(map);

    expect(map.renderer.root.customTextWidth).toBe(45);
    expect(map.renderer.root.getData('richText')).toBe(true);

    const rendered = new Promise<void>((resolve) => {
      const onRenderEnd = () => {
        map.off('node_tree_render_end', onRenderEnd);
        resolve();
      };
      map.on('node_tree_render_end', onRenderEnd);
    });
    map.renderer.root.setData({ customTextWidth: 90 });
    map.render();
    await rendered;

    expect(map.renderer.root.nodeData.data.customTextWidth).toBe(90);
    expect(map.renderer.root.customTextWidth).toBe(90);

    map.destroy();
    root.remove();
  });

  it('uses the upstream fixed-position editor in the document body portal', async () => {
    const { root, map } = mountMap({ data: { text: 'AXI 内存事务语义', uid: 'root', yemindTextEdited: true }, children: [] });
    await waitForMapRender(map);
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 420, clientY: 270 }));
    await nextFrame();

    const host = document.body.querySelector<HTMLElement>(':scope > .smm-richtext-node-edit-wrap')!;
    expect(map.richText.constructor.name).toBe('YeMindRichText');
    expect(host).toBeTruthy();
    expect(host.parentElement).toBe(document.body);
    expect(host.style.position).toBe('fixed');
    expect(host.style.left).toBe('410px');
    expect(host.style.top).toBe('260px');
    expect(host.querySelector('.ql-editor')?.textContent).toContain('AXI 内存事务语义');

    map.destroy();
    root.remove();
  });

  it('keeps the static SVG text available beneath the opaque editor when realtime rendering is disabled', async () => {
    const { root, map } = mountMap({
      data: { text: '新节点', uid: 'root', yemindTextPristine: true },
      children: [],
    });
    await waitForMapRender(map);

    const node = map.renderer.root;
    const staticText = node._textData.node;
    expect(map.opt.openRealtimeRenderOnNodeTextEdit).toBe(false);
    expect(staticText.visible()).toBe(true);

    node.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    const host = document.body.querySelector<HTMLElement>(':scope > .smm-richtext-node-edit-wrap')!;
    expect(host.style.display).not.toBe('none');
    expect(host.querySelector('.ql-editor')?.textContent).toContain('新节点');
    // This is the upstream non-realtime contract: the opaque HTML editor
    // covers a still-valid SVG fallback. Hiding the SVG here creates a frame
    // in which a newly inserted node can be mounted with no painted glyphs.
    expect(staticText.visible()).toBe(true);

    map.destroy();
    root.remove();
  });

  it('opens a newly inserted node editor only after its final tree layout has committed', async () => {
    const { root, map } = mountMap({
      data: { text: 'Root', uid: 'root', richText: false },
      children: [
        { data: { text: 'First branch', uid: 'first', richText: false }, children: [] },
        { data: { text: 'Later branch', uid: 'later', richText: false }, children: [] },
      ],
    });
    try {
      await waitForMapRender(map);
      const insertionParent = map.renderer.root.children[0];
      insertionParent.active();
      expect(map.renderer.activeNodeList).toContain(insertionParent);

      const events: string[] = [];
      const rendered = new Promise<void>((resolve) => {
        const onRenderEnd = () => {
          events.push('render-end');
          map.off('node_tree_render_end', onRenderEnd);
          resolve();
        };
        map.on('node_tree_render_end', onRenderEnd);
      });
      map.on('before_show_text_edit', () => events.push('editor-open'));

      map.execCommand('INSERT_CHILD_NODE', true, [], {
        richText: false,
        yemindTextPristine: true,
        yemindTextEdited: false,
      });
      await rendered;
      await nextFrame();

      expect(events.slice(0, 2)).toEqual(['render-end', 'editor-open']);
      expect(map.richText.showTextEdit).toBe(true);
      expect(map.richText.quill.root.textContent).toContain('新节点');
    } finally {
      map.destroy();
      root.remove();
    }
  });

  it('uses the upstream caret placement and leaves clipboard shortcuts in the text editor', async () => {
    const { root, map } = mountMap({ data: { text: '新节点', uid: 'root', yemindTextPristine: true }, children: [] });
    await waitForMapRender(map);
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextFrame();

    const length = map.richText.quill.getLength() - 1;
    expect(map.richText.quill.getSelection()).toMatchObject({ index: length, length: 0 });
    const editor = map.richText.quill.root as HTMLElement;
    for (const key of ['c', 'x', 'v']) {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: true, key });
      editor.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }

    map.destroy();
    root.remove();
  });

  it('places the caret at the end and commits direct text edits without rebuilding SVG while typing', async () => {
    const { root, map } = mountMap({ data: { text: 'AXI 内存事务语义', uid: 'root', yemindTextEdited: true }, children: [] });
    await waitForMapRender(map);
    const editedData = map.renderer.root.nodeData.data;
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextFrame();

    const length = map.richText.quill.getLength() - 1;
    expect(map.richText.quill.getSelection()).toMatchObject({ index: length, length: 0 });
    let renderCount = 0;
    const onRenderEnd = () => { renderCount += 1; };
    map.on('node_tree_render_end', onRenderEnd);
    map.richText.quill.insertText(length, '!', 'user');
    expect(editedData.yemindTextEdited).toBe(true);
    expect(editedData.yemindTextPristine).toBe(false);
    await nextFrame();
    expect(renderCount).toBe(0);

    const rendered = new Promise<void>((resolve) => {
      const onCommittedRender = () => {
        map.off('node_tree_render_end', onCommittedRender);
        resolve();
      };
      map.on('node_tree_render_end', onCommittedRender);
    });
    map.richText.hideEditText();
    await rendered;
    expect(renderCount).toBe(1);
    expect(map.renderer.root.nodeData.data.text).toContain('!');
    map.off('node_tree_render_end', onRenderEnd);

    map.destroy();
    root.remove();
  });

  it('keeps the opaque editor visible until the committed static node has finished layout', async () => {
    const { root, map } = mountMap({
      data: { text: '提交前文字', uid: 'root', yemindTextEdited: true },
      children: [],
    });
    await waitForMapRender(map);
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextFrame();

    const host = document.body.querySelector<HTMLElement>(':scope > .smm-richtext-node-edit-wrap')!;
    const length = map.richText.quill.getLength() - 1;
    map.richText.quill.insertText(
      length,
      '已修改并显著扩展节点宽度以强制执行异步布局提交',
      'user',
    );

    let displayDuringCommit = '';
    const originalExecCommand = map.execCommand.bind(map);
    map.execCommand = (name: string, ...args: unknown[]) => {
      if (name === 'SET_NODE_TEXT') displayDuringCommit = host.style.display;
      return originalExecCommand(name, ...args);
    };
    const rendered = new Promise<void>((resolve) => {
      const onRenderEnd = () => {
        map.off('node_tree_render_end', onRenderEnd);
        resolve();
      };
      map.on('node_tree_render_end', onRenderEnd);
    });

    map.richText.hideEditText();
    await rendered;

    // Render.render() can be asynchronous. Hiding the editor before the
    // SET_NODE_TEXT transaction exposes the freshly re-rendered text at its
    // temporary local origin for one paint, which is the upper-left jump.
    expect(displayDuringCommit).not.toBe('');
    expect(displayDuringCommit).not.toBe('none');
    expect(host.style.display).toBe('none');
    expect(map.renderer.root._textData.node.visible()).toBe(true);
    expect(map.renderer.root.nodeData.data.text).toContain('已修改');

    map.destroy();
    root.remove();
  });

  it('marks all initial map nodes as pristine text', () => {
    const tree = createDefaultTree('自定义标题');
    expect(tree.data.yemindTextPristine).toBe(true);
    expect(tree.children.every((node) => node.data.yemindTextPristine === true)).toBe(true);
  });

  it('places the caret at the end for an already-edited node and selects all for a pristine one', () => {
    // selectTextOnEnterEditText is now false; isPristineNodeTextData is the
    // only source of "select all on open" for a normal (non-keydown) entry.
    const editedData = { text: '已经编辑过的内容', yemindTextEdited: true };
    const pristineData = { text: '新节点', yemindTextEdited: false };
    expect(isPristineNodeTextData(editedData)).toBe(false);
    expect(isPristineNodeTextData(pristineData)).toBe(true);
  });
});

describe('v0.8.3 outline text editing transactions', () => {
  function controllerFor(host: HTMLElement) {
    const root = document.createElement('div');
    root.appendChild(host);
    document.body.appendChild(root);
    const controller = new OutlineRichTextController({
      root,
      isReadonly: () => false,
      onCommit: () => true,
      onSelectionChange: vi.fn(),
    });
    return { root, controller };
  }

  it('selects a pristine row completely and supports Ctrl+A after caret editing', async () => {
    const host = document.createElement('div');
    host.dataset.outlineEditor = '';
    host.dataset.outlineOriginal = encodeURIComponent('新节点');
    host.dataset.outlinePristine = 'true';
    host.textContent = '新节点';
    const { root, controller } = controllerFor(host);

    controller.activate(host, 'node-1', { placement: 'select-all' });
    await nextFrame();
    expect(controller.getSelectionState()).toMatchObject({ start: 0, end: 3, length: 3 });

    controller.focus({ placement: 'end' });
    await nextFrame();
    expect(controller.getSelectionState()).toMatchObject({ start: 3, end: 3 });
    const editor = host.querySelector<HTMLElement>('.ql-editor')!;
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: true, key: 'a' });
    editor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(controller.getSelectionState()).toMatchObject({ start: 0, end: 3 });

    controller.destroy();
    root.remove();
  });
});
