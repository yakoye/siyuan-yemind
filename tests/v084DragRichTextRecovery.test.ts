import { describe, expect, it, vi } from 'vitest';
import { createMindMap } from '../src/core/createMindMap';
import { resolveRenderedTextRect } from '../src/editor/richTextGeometry';

function rect(left = 0, top = 0, width = 100, height = 30): DOMRect {
  return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON() {} } as DOMRect;
}

Object.defineProperty(window, 'scrollBy', { value: vi.fn(), configurable: true });
const rangeProto: any = Range.prototype;
rangeProto.getBoundingClientRect ??= () => rect(0, 0, 0, 18);
rangeProto.getClientRects ??= () => [];

async function settle(ms = 50): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function prepareSvgRect(value: DOMRect): void {
  const proto: any = (globalThis as any).SVGElement?.prototype;
  if (!proto) return;
  proto.getBBox = () => ({ x: 0, y: 0, width: value.width, height: value.height });
  proto.getBoundingClientRect = () => value;
  proto.getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: value.left, f: value.top, inverse() { return this; } });
}

function mountMap() {
  const root = document.createElement('div');
  root.className = 'ymz-editor';
  const canvas = document.createElement('div');
  root.appendChild(canvas);
  document.body.appendChild(root);
  Object.defineProperty(canvas, 'clientWidth', { value: 800 });
  Object.defineProperty(canvas, 'clientHeight', { value: 600 });
  Object.defineProperty(canvas, 'offsetWidth', { value: 800 });
  Object.defineProperty(canvas, 'offsetHeight', { value: 600 });
  root.getBoundingClientRect = () => rect(100, 50, 800, 600);
  canvas.getBoundingClientRect = () => rect(100, 50, 800, 600);
  prepareSvgRect(rect(410, 260, 120, 32));
  const map: any = createMindMap({
    el: canvas,
    data: { data: { text: 'AXI 内存事务语义', uid: 'root', yemindTextEdited: true }, children: [] },
    settings: undefined,
  });
  return { root, map };
}

function zeroRect(): DOMRect {
  return rect(0, 0, 0, 0);
}

describe('v0.8.4 drag-safe canvas rich-text geometry', () => {
  it('never replaces the valid edit anchor with the zero rectangle of a hidden post-drag SVG text node', async () => {
    const { root, map } = mountMap();
    await settle();
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 420, clientY: 270 }));
    await settle();

    const host = root.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap')!;
    expect(host.style.left).toBe('310px');
    expect(host.style.top).toBe('210px');

    const live = map.renderer.findNodeByUid('root');
    const textElement = live._textData.node.node as SVGGraphicsElement;
    textElement.getBoundingClientRect = () => zeroRect();
    textElement.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 } as DOMRect);
    textElement.getScreenCTM = () => null;

    // A no-op structured drag can leave a stale render reference while the
    // original text SVG is hidden. This used to move the editor to -6/-4.
    const detached = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const stale = {
      getData: (key: string) => key === 'uid' ? 'root' : live.getData(key),
      nodeData: live.nodeData,
      _textData: {
        node: {
          node: detached,
          attr: (name: string) => live._textData.node.attr(name),
        },
      },
    };
    map.richText.node = stale;
    map.richText.updateTextEditNode();

    expect(map.richText.node).toBe(live);
    expect(host.style.left).toBe('310px');
    expect(host.style.top).toBe('210px');
    expect(host.style.left).not.toBe('-6px');
    expect(host.style.top).not.toBe('-4px');

    map.destroy();
    root.remove();
  });

  it('reconstructs a moved hidden text rectangle from its SVG screen matrix', async () => {
    const { root, map } = mountMap();
    await settle();
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();

    const live = map.richText.node;
    vi.spyOn(map.renderer, 'findNodeByUid').mockReturnValue(live);
    const group = live._textData.node;
    const textElement = group.node as SVGGraphicsElement;
    const originalAttr = group.attr.bind(group);
    vi.spyOn(group, 'attr').mockImplementation((name: string, ...args: unknown[]) => {
      if (args.length > 0) return originalAttr(name, ...args);
      if (name === 'data-width') return 120;
      if (name === 'data-height') return 32;
      return originalAttr(name);
    });
    textElement.getBoundingClientRect = () => zeroRect();
    textElement.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 } as DOMRect);
    textElement.getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 500, f: 300, inverse() { return this; } } as any);

    map.richText.updateTextEditNode();
    const host = root.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap')!;
    expect(host.style.left).toBe('400px');
    expect(host.style.top).toBe('250px');

    map.destroy();
    root.remove();
  });

  it('commits edited text to the renderer current node instead of a stale pre-drag instance', async () => {
    const { root, map } = mountMap();
    await settle();
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();

    const live = map.renderer.findNodeByUid('root');
    const detached = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    map.richText.node = {
      getData: (key: string) => key === 'uid' ? 'root' : live.getData(key),
      nodeData: live.nodeData,
      _textData: { node: { node: detached, attr: (name: string) => live._textData.node.attr(name) } },
    };
    const exec = vi.spyOn(map, 'execCommand');
    map.richText.hideEditText();

    const setText = exec.mock.calls.find((call: any[]) => call[0] === 'SET_NODE_TEXT');
    expect(setText?.[1]).toBe(live);

    map.destroy();
    root.remove();
  });
});

describe('v0.8.4 rich-text rectangle validation', () => {
  it('rejects detached or zero rectangles and uses the SVG matrix only for live geometry', () => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGraphicsElement;
    const group = {
      node: element,
      attr: (name: string) => name === 'data-width' ? 120 : name === 'data-height' ? 32 : undefined,
    };
    const node = { _textData: { node: group } };
    element.getBoundingClientRect = () => zeroRect();
    element.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 } as DOMRect);
    element.getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 410, f: 260, inverse() { return this; } } as any);

    expect(resolveRenderedTextRect(node)).toBeNull();
    document.body.appendChild(element);
    expect(resolveRenderedTextRect(node)).toMatchObject({
      source: 'screen-ctm',
      rect: { left: 410, top: 260, width: 120, height: 32 },
    });
    element.remove();
  });
});
