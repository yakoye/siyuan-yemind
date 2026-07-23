import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import YeMindNodeImgAdjust, { calculateImageResizeRect } from '../../../src/core/YeMindNodeImgAdjust';

function createHarness() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const listeners = new Map<string, Function[]>();
  const mindMap = {
    opt: {
      customInnerElsAppendTo: host,
      beforeDeleteNodeImg: vi.fn(async () => false),
      minImgResizeWidth: 12,
      minImgResizeHeight: 12,
      maxImgResizeWidth: 1000,
      maxImgResizeHeight: 1000,
      maxImgResizeWidthInheritTheme: false,
      readonly: false,
    },
    draw: { transform: vi.fn(() => ({ scaleX: 1, scaleY: 1 })) },
    on: vi.fn((name: string, listener: Function) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener]);
    }),
    off: vi.fn(),
    emit: vi.fn((name: string, ...args: unknown[]) => {
      (listeners.get(name) ?? []).forEach((listener) => listener(...args));
    }),
    execCommand: vi.fn(),
    getThemeConfig: vi.fn(() => 1000),
  } as any;
  const adjust = new (YeMindNodeImgAdjust as any)({ mindMap });
  const node = {
    uid: 'image-node',
    getData: vi.fn((key?: string) => {
      const data = {
        image: 'data:image/svg+xml;base64,AAAA',
        imageTitle: 'Clipart',
        imageSize: { width: 48, height: 32, custom: true },
      } as Record<string, unknown>;
      return key ? data[key] : data;
    }),
  } as any;
  const img = {
    rbox: vi.fn(() => ({ x: 100, y: 80, x2: 148, y2: 112, width: 48, height: 32 })),
    hide: vi.fn(),
    show: vi.fn(),
  } as any;
  return { host, mindMap, adjust, node, img };
}

describe('v0.9.16 direct image editing', () => {
  it('shows a border on hover and full controls only after clicking the image', () => {
    const { host, adjust, node, img } = createHarness();
    adjust.onNodeImgMousemove(node, img);
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;
    expect(frame.dataset.mode).toBe('hover');

    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    expect(frame.dataset.mode).toBe('selected');
    expect(frame.querySelectorAll('.ymz-node-image-resize-handle')).toHaveLength(8);
    expect(frame.querySelector('[data-image-action="replace"]')).not.toBeNull();
    host.remove();
  });

  it('routes image double click to preview without entering node text edit', () => {
    const { host, mindMap, adjust, node, img } = createHarness();
    const event = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    const stop = vi.spyOn(event, 'stopPropagation');
    (adjust as any).onImageDoubleClick(node, event, img);
    expect(stop).toHaveBeenCalled();
    expect(mindMap.emit).toHaveBeenCalledWith('yemind_node_image_preview', node);
    host.remove();
  });

  it('intercepts Delete while an image is selected and removes only the image', async () => {
    const { host, mindMap, adjust, node, img } = createHarness();
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
    (adjust as any).onKeydownCapture(event);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(event.defaultPrevented).toBe(true);
    expect(mindMap.execCommand).toHaveBeenCalledWith('SET_NODE_IMAGE', node, { url: null });
    expect(mindMap.execCommand).not.toHaveBeenCalledWith('REMOVE_NODE', expect.anything());
    host.remove();
  });

  it('uses free edge resizing and ratio-locked corner resizing with opposite anchors', () => {
    expect(calculateImageResizeRect(
      { left: 20, top: 30, width: 60, height: 40 },
      'w',
      10,
      100,
      false,
    )).toEqual({ left: 30, top: 30, width: 50, height: 40 });

    expect(calculateImageResizeRect(
      { left: 20, top: 30, width: 60, height: 40 },
      'nw',
      10,
      0,
      false,
    )).toEqual({ left: 30, top: 36.67, width: 50, height: 33.33 });
  });

  it('selects all node text when entering edit mode and uses a 48px clipart box', () => {
    const createSource = readFileSync('src/core/createMindMap.ts', 'utf8');
    const geometrySource = readFileSync('src/core/clipartGeometry.ts', 'utf8');
    expect(createSource).toContain('selectTextOnEnterEditText: true');
    expect(geometrySource).toContain('export const DEFAULT_CLIPART_BOX_SIZE = 48;');
  });

  it('removes the old three-icon image controls from source and styles', () => {
    const adjustSource = readFileSync('src/core/YeMindNodeImgAdjust.ts', 'utf8');
    const css = readFileSync('src/styles/index.css', 'utf8');
    expect(adjustSource).not.toContain('imagePreviewIcon');
    expect(adjustSource).not.toContain('node-image-resize');
    expect(css).not.toContain('.ymz-node-image-preview');
    expect(css).not.toContain('.node-image-remove');
  });
});
