import { describe, expect, it, vi } from 'vitest';
import { createMindMap } from '../../../src/core/createMindMap';

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
    if (map.renderer.root) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('mind-map render did not finish');
}

/** Lets a single test flip the SVG text group between an unusable and a usable rect. */
function prepareMutableSvgRect(initial: DOMRect): { set: (value: DOMRect) => void } {
  let current = initial;
  const proto: any = (globalThis as any).SVGElement?.prototype;
  proto.getBBox = () => ({ x: 0, y: 0, width: current.width, height: current.height });
  proto.getBoundingClientRect = () => current;
  proto.getScreenCTM ??= () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } });
  return { set: (value: DOMRect) => { current = value; } };
}

function prepareSvgRect(value: DOMRect): void {
  const proto: any = (globalThis as any).SVGElement?.prototype;
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

describe('v1.8.1 atomic canvas editor opening', () => {
  it('sets an explicit, deterministic width on the editor host instead of relying on shrink-to-fit', async () => {
    const { root, map } = mountMap({ data: { text: 'AXI 内存事务语义', uid: 'root', yemindTextEdited: true }, children: [] });
    await waitForMapRender(map);
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextFrame();

    const host = root.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap')!;
    expect(host.style.width).not.toBe('');
    expect(host.style.width).toBe(host.style.minWidth);

    map.destroy();
    root.remove();
  });

  it('reaches the active editing phase and is focused even when the browser has not yet painted a matching editor rect', async () => {
    const { root, map } = mountMap({ data: { text: 'AXI 内存事务语义', uid: 'root', yemindTextEdited: true }, children: [] });
    await waitForMapRender(map);
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextFrame();
    await nextFrame();

    const snapshot = map.richText.getEditSessionSnapshot();
    expect(snapshot.phase).toBe('active');
    expect(snapshot.geometryReady).toBe(true);
    expect(document.activeElement).toBe(map.richText.quill.root);

    map.destroy();
    root.remove();
  });

  it('recovers from a stuck half-open session on a second double-click of the same node, without touching node text or history', async () => {
    const { root, map } = mountMap({ data: { text: 'AXI 内存事务语义', uid: 'root', yemindTextEdited: true }, children: [] });
    await waitForMapRender(map);
    const target = map.renderer.root.group.node;
    const group = map.renderer.root._textData.node;
    const execSpy = vi.spyOn(map, 'execCommand');

    // Simulate the first geometry resolution genuinely failing (e.g. a race
    // with a not-yet-flushed transform): no usable rect anywhere, so
    // applyEditorGeometry/commitOpeningPlacement never run and the session
    // can never leave 'opening'.
    const mutable = prepareMutableSvgRect(rect(0, 0, 0, 0));
    const originalWidth = group.node.getAttribute('data-width');
    const originalHeight = group.node.getAttribute('data-height');
    group.node.removeAttribute('data-width');
    group.node.removeAttribute('data-height');

    target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextFrame();
    await nextFrame();
    const stuck = map.richText.getEditSessionSnapshot();
    expect(stuck.phase).not.toBe('active');
    const stuckId = stuck.id;

    // The next real geometry resolution succeeds (the race resolved itself).
    mutable.set(rect(410, 260, 120, 32));
    if (originalWidth !== null) group.node.setAttribute('data-width', originalWidth);
    if (originalHeight !== null) group.node.setAttribute('data-height', originalHeight);

    target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextFrame();
    await nextFrame();

    const recovered = map.richText.getEditSessionSnapshot();
    expect(recovered.id).not.toBe(stuckId);
    expect(recovered.phase).toBe('active');
    expect(recovered.geometryReady).toBe(true);
    expect(execSpy.mock.calls.some((call) => call[0] === 'SET_NODE_TEXT')).toBe(false);

    map.destroy();
    root.remove();
  });

  it('uses the isInserting flag rather than a numeric start position to decide select-all', async () => {
    const { root, map } = mountMap({ data: { text: '已经编辑过的内容', uid: 'root', yemindTextEdited: true }, children: [] });
    await waitForMapRender(map);
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextFrame();
    await nextFrame();

    // This node is not pristine/inserting; even if something calls focus(0),
    // it must place the caret at the end, not select the whole node.
    map.richText.focus(0);
    await nextFrame();

    const length = map.richText.quill.getLength() - 1;
    expect(map.richText.quill.getSelection()).toMatchObject({ index: length, length: 0 });

    map.destroy();
    root.remove();
  });
});
