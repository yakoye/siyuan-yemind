import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stabilizeMindMapMeasurementHost } from '../../../src/core/measurementHost';

describe('v0.9.14 stable node measurement geometry', () => {
  afterEach(() => {
    document.querySelectorAll('[data-yemind-measurement-host]').forEach((node) => node.remove());
    vi.restoreAllMocks();
  });

  it('moves caches into a visible off-screen editor context and performs one full repair render', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
    const editor = document.createElement('div');
    editor.className = 'ymz-editor custom-theme';
    editor.style.setProperty('--ymz-test-color', '#123456');
    const canvas = document.createElement('div');
    canvas.style.display = 'none';
    const rich = document.createElement('div');
    const custom = document.createElement('div');
    canvas.append(rich, custom);
    editor.append(canvas);
    document.body.append(editor);
    const render = vi.fn();
    let beforeDestroy: (() => void) | null = null;
    const map = {
      commonCaches: { measureRichtextNodeTextSizeEl: rich, measureCustomNodeContentSizeEl: custom },
      render,
      on: vi.fn((name: string, callback: () => void) => { if (name === 'beforeDestroy') beforeDestroy = callback; }),
    };

    expect(stabilizeMindMapMeasurementHost(map, editor)).toBe(true);
    const host = rich.parentElement as HTMLElement;
    expect(host).toBe(custom.parentElement);
    expect(host.dataset.yemindMeasurementHost).toBe('true');
    expect(host.classList.contains('ymz-editor')).toBe(true);
    expect(host.style.visibility).toBe('hidden');
    expect(render).toHaveBeenCalledWith(null, 'yemind-measurement-host');
    beforeDestroy?.();
    expect(host.isConnected).toBe(false);
    editor.remove();
  });

  it('does not trigger another render when caches are already in the stable host', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
    const editor = document.createElement('div');
    editor.className = 'ymz-editor';
    document.body.append(editor);
    const rich = document.createElement('div');
    editor.append(rich);
    const map = { commonCaches: { measureRichtextNodeTextSizeEl: rich }, render: vi.fn(), on: vi.fn() };
    expect(stabilizeMindMapMeasurementHost(map, editor)).toBe(true);
    map.render.mockClear();
    expect(stabilizeMindMapMeasurementHost(map, editor)).toBe(false);
    expect(map.render).not.toHaveBeenCalled();
    editor.remove();
  });

  it('passes the editor root both after creation and before visible-canvas resize', () => {
    const factorySource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');
    const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
    expect(factorySource).toContain('stabilizeMindMapMeasurementHost(mindMap as any, editorRoot)');
    expect(editorSource).toContain('stabilizeMindMapMeasurementHost(this.map as any, this.rootEl)');
    expect(editorSource.indexOf('stabilizeMindMapMeasurementHost(this.map as any, this.rootEl)'))
      .toBeLessThan(editorSource.indexOf('this.map.resize()', editorSource.indexOf('stabilizeMindMapMeasurementHost(this.map as any, this.rootEl)')));
  });
});
