import { describe, expect, it, vi } from 'vitest';
import { createMindMap } from '../src/core/createMindMap';
import { OutlineRichTextController } from '../src/editor/OutlineRichTextController';
import { createDefaultTree } from '../src/model/defaultMap';

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
  it('positions the local editor over the node instead of using viewport coordinates inside the editor root', async () => {
    const { root, map } = mountMap({ data: { text: 'AXI 内存事务语义', uid: 'root', yemindTextEdited: true }, children: [] });
    await new Promise((resolve) => setTimeout(resolve, 40));
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 420, clientY: 270 }));
    await nextFrame();

    const host = root.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap')!;
    expect(map.richText.constructor.name).toBe('YeMindRichText');
    expect(host).toBeTruthy();
    expect(host.parentElement).toBe(root);
    expect(host.style.position).toBe('absolute');
    expect(host.style.left).toBe('310px');
    expect(host.style.top).toBe('210px');
    expect(host.querySelector('.ql-editor')?.textContent).toContain('AXI 内存事务语义');

    map.destroy();
    root.remove();
  });

  it('selects all text for a pristine/default node and leaves clipboard shortcuts in the text editor', async () => {
    const { root, map } = mountMap({ data: { text: '新节点', uid: 'root', yemindTextPristine: true }, children: [] });
    await new Promise((resolve) => setTimeout(resolve, 40));
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextFrame();

    const length = map.richText.quill.getLength() - 1;
    expect(map.richText.quill.getSelection()).toMatchObject({ index: 0, length });
    const editor = map.richText.quill.root as HTMLElement;
    for (const key of ['c', 'x', 'v']) {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: true, key });
      editor.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }

    map.destroy();
    root.remove();
  });

  it('places the caret at the end for an existing node and implements Ctrl+A locally', async () => {
    const { root, map } = mountMap({ data: { text: 'AXI 内存事务语义', uid: 'root', yemindTextEdited: true }, children: [] });
    await new Promise((resolve) => setTimeout(resolve, 40));
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextFrame();

    const length = map.richText.quill.getLength() - 1;
    expect(map.richText.quill.getSelection()).toMatchObject({ index: length, length: 0 });
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: true, key: 'a' });
    map.richText.quill.root.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(map.richText.quill.getSelection()).toMatchObject({ index: 0, length });

    map.richText.quill.insertText(length, '!', 'user');
    expect(map.renderer.root.nodeData.data.yemindTextEdited).toBe(true);
    expect(map.renderer.root.nodeData.data.yemindTextPristine).toBe(false);

    map.destroy();
    root.remove();
  });

  it('marks all initial map nodes as pristine text', () => {
    const tree = createDefaultTree('自定义标题');
    expect(tree.data.yemindTextPristine).toBe(true);
    expect(tree.children.every((node) => node.data.yemindTextPristine === true)).toBe(true);
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
