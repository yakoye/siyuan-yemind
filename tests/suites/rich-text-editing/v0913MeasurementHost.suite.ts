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
    let beforeDestroy: (() => void) | null = null;
    const map = {
      commonCaches: {
        measureRichtextNodeTextSizeEl: rich,
        measureCustomNodeContentSizeEl: custom,
      },
      render,
      on: vi.fn((name: string, callback: () => void) => {
        if (name === 'beforeDestroy') beforeDestroy = callback;
      }),
    };

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
    expect(stabilizeMindMapMeasurementHost(map, canvas)).toBe(true);
    expect(rich.parentElement?.dataset.yemindMeasurementHost).toBe('true');
    expect(custom.parentElement).toBe(rich.parentElement);
    expect(render).toHaveBeenCalledOnce();
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
    expect(map.render).toHaveBeenCalledOnce();
    callbacks.get('beforeDestroy')?.();
    expect(rich.isConnected).toBe(false);
    canvas.remove();
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
