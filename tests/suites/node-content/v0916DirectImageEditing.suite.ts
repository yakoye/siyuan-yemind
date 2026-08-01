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
  it('exposes the selected canvas image as one stable clipboard resource', () => {
    const { host, adjust, node, img } = createHarness();
    img.node = document.createElement('img');
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));

    expect(adjust.getSelectedClipboardResource()).toEqual({
      kind: 'image',
      source: 'data:image/svg+xml;base64,AAAA',
      title: 'Clipart',
    });
    expect(adjust.getClipboardResourceForTarget(img.node)).toEqual(
      adjust.getSelectedClipboardResource(),
    );

    (adjust as any).closeImageSelection();
    expect(adjust.getSelectedClipboardResource()).toBeNull();
    host.remove();
  });

  it('only treats the rendered node image as a direct resource target', () => {
    const { host, adjust, node, img } = createHarness();
    const renderedImage = document.createElement('img');
    const unrelated = document.createElement('span');
    img.node = renderedImage;
    host.append(renderedImage, unrelated);
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));

    expect(adjust.getClipboardResourceForTarget(renderedImage)).toEqual({
      kind: 'image',
      source: 'data:image/svg+xml;base64,AAAA',
      title: 'Clipart',
    });
    expect(adjust.getClipboardResourceForTarget(unrelated)).toBeNull();
    host.remove();
  });

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

  it('keeps the selected image frame attached while the canvas is dragged', async () => {
    const { host, mindMap, adjust, node, img } = createHarness();
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;
    expect(frame.style.left).toBe('100px');

    img.rbox.mockReturnValue({ x: 100, y: 145, x2: 148, y2: 177, width: 48, height: 32 });
    mindMap.emit('view_data_change', {});
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(frame.dataset.mode).toBe('selected');
    expect(frame.style.left).toBe('100px');
    expect(frame.style.top).toBe('145px');
    host.remove();
  });

  it('refreshes the selected image frame during live canvas pointer movement', async () => {
    const { host, mindMap, adjust, node, img } = createHarness();
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;

    img.rbox.mockReturnValue({ x: 180, y: 120, x2: 228, y2: 152, width: 48, height: 32 });
    mindMap.emit('mousemove', new MouseEvent('mousemove'));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(frame.style.left).toBe('180px');
    expect(frame.style.top).toBe('120px');
    host.remove();
  });

  it('prefers the live SVG image client rect over a stale svg.js rbox cache', () => {
    const { host, adjust, node, img } = createHarness();
    img.node = {
      getBoundingClientRect: vi.fn(() => ({
        x: 260,
        y: 190,
        left: 260,
        top: 190,
        right: 308,
        bottom: 222,
        width: 48,
        height: 32,
      })),
    };

    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;

    expect(frame.style.left).toBe('260px');
    expect(frame.style.top).toBe('190px');
    host.remove();
  });

  it('keeps following a selected image when the host moves without emitting layout events', async () => {
    const { host, adjust, node, img } = createHarness();
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;

    img.rbox.mockReturnValue({ x: 320, y: 210, x2: 368, y2: 242, width: 48, height: 32 });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(frame.style.left).toBe('320px');
    expect(frame.style.top).toBe('210px');
    (adjust as any).closeImageSelection();
    host.remove();
  });

  it('positions the image frame in editor-local coordinates so editor overflow clips it', () => {
    const { host, adjust, node, img } = createHarness();
    host.getBoundingClientRect = vi.fn(() => ({
      x: 40,
      y: 60,
      left: 40,
      top: 60,
      right: 840,
      bottom: 660,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    }));
    img.node = {
      getBoundingClientRect: vi.fn(() => ({
        x: 100,
        y: 80,
        left: 100,
        top: 80,
        right: 148,
        bottom: 112,
        width: 48,
        height: 32,
      })),
    };

    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;

    expect(frame.style.position).toBe('absolute');
    expect(frame.style.left).toBe('60px');
    expect(frame.style.top).toBe('20px');
    host.remove();
  });

  it('places the image action toolbar below an image that is near the editor top edge', () => {
    const { host, adjust, node, img } = createHarness();
    host.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 70,
      left: 0,
      top: 70,
      right: 800,
      bottom: 670,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    }));
    img.node = {
      getBoundingClientRect: vi.fn(() => ({
        x: 200,
        y: 76,
        left: 200,
        top: 76,
        right: 500,
        bottom: 276,
        width: 300,
        height: 200,
      })),
    };

    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;

    expect(frame.dataset.toolbarPlacement).toBe('bottom');
    host.remove();
  });

  it('mounts image controls in a dedicated clipped overlay over the map canvas', () => {
    const { host, adjust, node, img } = createHarness();
    host.className = 'ymz-editor';
    const canvas = document.createElement('div');
    canvas.className = 'ymz-canvas';
    canvas.dataset.role = 'canvas';
    host.appendChild(canvas);

    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;
    const overlay = frame.parentElement!;

    expect(overlay.classList.contains('ymz-node-image-overlay-layer')).toBe(true);
    expect(overlay.parentElement).toBe(canvas);
    expect(overlay.style.overflow).toBe('hidden');
    host.remove();
  });

  it('keeps the image toolbar inside every edge of the map viewport', () => {
    const { host, adjust, node, img } = createHarness();
    host.getBoundingClientRect = vi.fn(() => ({
      x: 100,
      y: 50,
      left: 100,
      top: 50,
      right: 600,
      bottom: 450,
      width: 500,
      height: 400,
      toJSON: () => ({}),
    }));
    img.node = {
      getBoundingClientRect: vi.fn(),
    };
    const imageRects = [
      { x: 20, y: 180, left: 20, top: 180, right: 220, bottom: 300, width: 200, height: 120 },
      { x: 480, y: 180, left: 480, top: 180, right: 680, bottom: 300, width: 200, height: 120 },
      { x: 250, y: 10, left: 250, top: 10, right: 450, bottom: 130, width: 200, height: 120 },
      { x: 250, y: 390, left: 250, top: 390, right: 450, bottom: 510, width: 200, height: 120 },
    ];

    for (const imageRect of imageRects) {
      img.node.getBoundingClientRect.mockReturnValue(imageRect);
      (adjust as any).onImageClick(node, img, new MouseEvent('click'));
      const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;
      const toolbar = frame.querySelector<HTMLElement>('.ymz-node-image-toolbar')!;
      toolbar.getBoundingClientRect = vi.fn(() => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 128,
        bottom: 44,
        width: 128,
        height: 44,
        toJSON: () => ({}),
      }));
      (adjust as any).refreshRect();

      const toolbarLeft = Number.parseFloat(frame.style.left) + Number.parseFloat(toolbar.style.left);
      const toolbarTop = Number.parseFloat(frame.style.top) + Number.parseFloat(toolbar.style.top);
      expect(toolbarLeft).toBeGreaterThanOrEqual(8);
      expect(toolbarLeft + 128).toBeLessThanOrEqual(492);
      expect(toolbarTop).toBeGreaterThanOrEqual(8);
      expect(toolbarTop + 44).toBeLessThanOrEqual(392);
    }
    host.remove();
  });

  it('realigns the selected image frame after the editor viewport is resized', async () => {
    const { host, adjust, node, img } = createHarness();
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;

    window.dispatchEvent(new Event('resize'));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    img.rbox.mockReturnValue({ x: 72, y: 56, x2: 120, y2: 88, width: 48, height: 32 });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(frame.style.left).toBe('72px');
    expect(frame.style.top).toBe('56px');
    host.remove();
  });

  it('observes the actual editor host so dock and split-layout changes realign the frame', async () => {
    let resizeCallback: ResizeObserverCallback | null = null;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe = observe;
      disconnect = disconnect;
    });
    const { host, adjust, node, img } = createHarness();
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;
    expect(observe).toHaveBeenCalledWith(host);

    img.rbox.mockReturnValue({ x: 240, y: 180, x2: 288, y2: 212, width: 48, height: 32 });
    resizeCallback?.([], {} as ResizeObserver);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(frame.style.left).toBe('240px');
    expect(frame.style.top).toBe('180px');
    (adjust as any).beforePluginDestroy();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
    host.remove();
  });

  it('does not discard image selection at drag start before draw_click decides it was a click', () => {
    const { host, mindMap, adjust, node, img } = createHarness();
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;

    mindMap.emit('svg_mousedown');

    expect(frame.dataset.mode).toBe('selected');
    expect(frame.style.display).toBe('block');
    host.remove();
  });

  it('keeps image selection when canvas dragging temporarily clears the active node', () => {
    const { host, mindMap, adjust, node, img } = createHarness();
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;

    mindMap.emit('node_active', null, []);

    expect(frame.dataset.mode).toBe('selected');
    expect(frame.style.display).toBe('block');
    host.remove();
  });

  it('closes image selection when another node becomes active', () => {
    const { host, mindMap, adjust, node, img } = createHarness();
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const frame = host.querySelector<HTMLElement>('.ymz-node-image-frame')!;

    mindMap.emit('node_active', { uid: 'other-node' }, []);

    expect(frame.dataset.mode).toBe('hidden');
    expect(frame.style.display).toBe('none');
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

  it('does not intercept Delete from a different tab while its editor is hidden', () => {
    const { host, mindMap, adjust, node, img } = createHarness();
    const hiddenEditor = document.createElement('div');
    hiddenEditor.className = 'ymz-editor';
    hiddenEditor.getClientRects = vi.fn(() => [] as any);
    hiddenEditor.appendChild(host);
    document.body.appendChild(hiddenEditor);
    (adjust as any).onImageClick(node, img, new MouseEvent('click'));
    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });

    (adjust as any).onKeydownCapture(event);

    expect(event.defaultPrevented).toBe(false);
    expect(mindMap.execCommand).not.toHaveBeenCalled();
    hiddenEditor.remove();
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

  it('uses a 48px clipart box', () => {
    const geometrySource = readFileSync('src/core/clipartGeometry.ts', 'utf8');
    expect(geometrySource).toContain('export const DEFAULT_CLIPART_BOX_SIZE = 48;');
  });

  it.skip('removes the old three-icon image controls from source and styles', () => {
    const adjustSource = readFileSync('src/core/YeMindNodeImgAdjust.ts', 'utf8');
    const css = readFileSync('src/styles/index.css', 'utf8');
    expect(adjustSource).not.toContain('imagePreviewIcon');
    expect(adjustSource).not.toContain('node-image-resize');
    expect(css).not.toContain('.ymz-node-image-preview');
    expect(css).not.toContain('.node-image-remove');
  });
});
