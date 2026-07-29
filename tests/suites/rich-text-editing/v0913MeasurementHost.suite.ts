import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stabilizeMindMapMeasurementHost } from '../../../src/core/measurementHost';

describe('v0.9.13 hidden-tab rich-text measurement', () => {
  afterEach(() => {
    document.querySelectorAll('[data-yemind-measurement-host]').forEach((node) => node.remove());
  });

  it('moves measurement nodes out of a hidden canvas and removes the stable host before destroy', () => {
    const canvas = document.createElement('div');
    canvas.style.display = 'none';
    const rich = document.createElement('div');
    const custom = document.createElement('div');
    canvas.append(rich, custom);
    document.body.append(canvas);
    const render = vi.fn();
    const reRender = vi.fn();
    let beforeDestroy: (() => void) | null = null;
    const map = {
      commonCaches: {
        measureRichtextNodeTextSizeEl: rich,
        measureCustomNodeContentSizeEl: custom,
      },
      render,
      reRender,
      on: vi.fn((name: string, callback: () => void) => {
        if (name === 'beforeDestroy') beforeDestroy = callback;
      }),
    };

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
    expect(stabilizeMindMapMeasurementHost(map, canvas)).toBe(true);
    expect(rich.parentElement?.dataset.yemindMeasurementHost).toBe('true');
    expect(custom.parentElement).toBe(rich.parentElement);
    expect(reRender).toHaveBeenCalledWith(null, 'yemind-measurement-host');
    expect(render).not.toHaveBeenCalled();
    beforeDestroy?.();
    expect(rich.isConnected).toBe(false);
    expect(custom.isConnected).toBe(false);
    canvas.remove();
  });

  it('relocates cache elements that appear only after the first render', async () => {
    const canvas = document.createElement('div');
    document.body.append(canvas);
    const callbacks = new Map<string, () => void>();
    const map = {
      commonCaches: {},
      render: vi.fn(),
      reRender: vi.fn(),
      on: vi.fn((name: string, callback: () => void) => callbacks.set(name, callback)),
    };

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
    expect(stabilizeMindMapMeasurementHost(map, canvas)).toBe(false);
    const rich = document.createElement('div');
    canvas.append(rich);
    map.commonCaches.measureRichtextNodeTextSizeEl = rich;
    callbacks.get('node_tree_render_end')?.();

    expect(rich.parentElement?.dataset.yemindMeasurementHost).toBe('true');
    expect(rich.dataset.yemindMeasurementOwner).toBe('true');
    expect(map.reRender).toHaveBeenCalledWith(null, 'yemind-measurement-host');
    expect(map.render).not.toHaveBeenCalled();
    callbacks.get('beforeDestroy')?.();
    expect(rich.isConnected).toBe(false);
    canvas.remove();
  });

  it('remeasures node geometry after web fonts finish loading', async () => {
    let resolveFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => { resolveFonts = resolve; });
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: fontsReady },
    });
    const canvas = document.createElement('div');
    document.body.append(canvas);
    const callbacks = new Map<string, () => void>();
    const render = vi.fn();
    const reRender = vi.fn();
    const map = {
      commonCaches: {},
      render,
      reRender,
      on: vi.fn((name: string, callback: () => void) => callbacks.set(name, callback)),
    };

    stabilizeMindMapMeasurementHost(map, canvas);
    callbacks.get('node_tree_render_end')?.();
    resolveFonts();
    await fontsReady;
    await Promise.resolve();

    expect(reRender).toHaveBeenCalledWith(null, 'yemind-fonts-ready');
    expect(render).not.toHaveBeenCalled();
    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
    else delete (document as Document & { fonts?: FontFaceSet }).fonts;
    canvas.remove();
  });

  it('waits for the first node render before repairing already-ready web fonts', async () => {
    let resolveFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => { resolveFonts = resolve; });
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: fontsReady },
    });
    const callbacks = new Map<string, () => void>();
    const reRender = vi.fn();
    const map = {
      commonCaches: {},
      render: vi.fn(),
      reRender,
      on: vi.fn((name: string, callback: () => void) => callbacks.set(name, callback)),
    };
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    stabilizeMindMapMeasurementHost(map, document.body);
    resolveFonts();
    await fontsReady;
    await Promise.resolve();

    expect(reRender).not.toHaveBeenCalled();
    callbacks.get('node_tree_render_end')?.();
    expect(reRender).toHaveBeenCalledWith(null, 'yemind-fonts-ready');

    callbacks.get('beforeDestroy')?.();
    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
    else delete (document as Document & { fonts?: FontFaceSet }).fonts;
  });

  it('does not remeasure a map destroyed before web fonts finish loading', async () => {
    let resolveFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => { resolveFonts = resolve; });
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: fontsReady },
    });
    const callbacks = new Map<string, () => void>();
    const render = vi.fn();
    const map = {
      commonCaches: {},
      render,
      on: vi.fn((name: string, callback: () => void) => callbacks.set(name, callback)),
    };

    stabilizeMindMapMeasurementHost(map, document.body);
    callbacks.get('beforeDestroy')?.();
    resolveFonts();
    await fontsReady;
    await Promise.resolve();

    expect(render).not.toHaveBeenCalled();
    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
    else delete (document as Document & { fonts?: FontFaceSet }).fonts;
  });

  it('stabilizes the measurement host after map creation and before visible-canvas resize', () => {
    const factorySource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');
    const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
    expect(factorySource).toContain('stabilizeMindMapMeasurementHost(mindMap as any, editorRoot)');
    expect(editorSource).toContain('stabilizeMindMapMeasurementHost(this.map as any, this.rootEl)');
    expect(editorSource.indexOf('stabilizeMindMapMeasurementHost(this.map as any, this.rootEl)'))
      .toBeLessThan(editorSource.indexOf('this.map.resize()', editorSource.indexOf('stabilizeMindMapMeasurementHost(this.map as any, this.rootEl)')));
  });

});
