import { describe, expect, it, vi } from 'vitest';
import { applyMapAppearanceTransaction } from '../../../src/core/appearanceTransaction';
import { getThemeColorAppearance } from '../../../src/core/themeColorData';

function createMap() {
  const calls: string[] = [];
  const selected = { getData: (key?: string) => key === 'uid' ? 'selected-1' : { uid: 'selected-1' } };
  const restored = { getData: (key?: string) => key === 'uid' ? 'selected-1' : { uid: 'selected-1' } };
  const renderer = {
    renderTree: { data: {}, children: [] },
    _render: vi.fn(),
    activeNodeList: [selected],
    findNodeByUid: vi.fn(() => restored),
    activeMultiNode: vi.fn((nodes: unknown[]) => calls.push(`restore:${nodes.length}`)),
  };
  const map = {
    opt: { rainbowLinesConfig: { open: false, colorsList: ['#OLD001', '#OLD002'] } },
    emit: vi.fn(),
    renderer,
    setThemeConfig: vi.fn(() => calls.push('theme')),
    updateConfig: vi.fn(() => calls.push('rainbow-fallback')),
    reRender: vi.fn((callback?: () => void, source?: string) => {
      calls.push(`rerender:${source}`);
      callback?.();
    }),
    render: vi.fn(() => calls.push('render')),
  };
  return { map, calls, renderer, restored };
}

describe('v0.9.2 atomic appearance refresh', () => {
  it('updates theme and rainbow configuration before one complete redraw', () => {
    const { map, calls } = createMap();
    const afterRender = vi.fn(() => calls.push('after'));
    const appearance = getThemeColorAppearance('scheme-rainbow', 'light')!;
    const themeConfig = { backgroundColor: appearance.background };
    const rainbowLinesConfig = { open: true, colorsList: ['#111111', '#222222'] };

    applyMapAppearanceTransaction({
      map,
      themeConfig,
      rainbowLinesConfig,
      colorAppearance: appearance,
      useThemeLineColors: false,
      afterRender,
    });

    expect(map.setThemeConfig).toHaveBeenCalledWith(themeConfig, true);
    expect(map.opt.rainbowLinesConfig).toEqual(rainbowLinesConfig);
    expect(map.updateConfig).not.toHaveBeenCalled();
    expect(map.reRender).toHaveBeenCalledOnce();
    expect(map.reRender).toHaveBeenCalledWith(expect.any(Function), 'changeTheme');
    expect(map.render).not.toHaveBeenCalled();
    expect(calls).toEqual(['theme', 'rerender:changeTheme', 'restore:1', 'after']);
  });

  it('preserves selected nodes across the complete redraw', () => {
    const { map, renderer, restored } = createMap();
    const appearance = getThemeColorAppearance('scheme-dawn', 'light')!;

    applyMapAppearanceTransaction({
      map,
      themeConfig: {},
      rainbowLinesConfig: { open: false, colorsList: [] },
      colorAppearance: appearance,
      useThemeLineColors: true,
    });

    expect(renderer.findNodeByUid).toHaveBeenCalledWith('selected-1');
    expect(renderer.activeMultiNode).toHaveBeenCalledWith([restored]);
  });

  it('does not render during initialization-only configuration', () => {
    const { map } = createMap();
    const afterRender = vi.fn();
    const appearance = getThemeColorAppearance('scheme-rose', 'light')!;

    applyMapAppearanceTransaction({
      map,
      themeConfig: {},
      rainbowLinesConfig: { open: true, colorsList: ['#AABBCC'] },
      colorAppearance: appearance,
      useThemeLineColors: false,
      render: false,
      afterRender,
    });

    expect(map.setThemeConfig).toHaveBeenCalledOnce();
    expect(map.opt.rainbowLinesConfig).toEqual({ open: true, colorsList: ['#AABBCC'] });
    expect(map.updateConfig).not.toHaveBeenCalled();
    expect(map.reRender).not.toHaveBeenCalled();
    expect(map.render).not.toHaveBeenCalled();
    expect(afterRender).not.toHaveBeenCalled();
  });

  it('uses a compatibility render only when the renderer lacks reRender', () => {
    const { map } = createMap();
    delete (map as any).reRender;
    delete (map as any).opt;
    const appearance = getThemeColorAppearance('scheme-mint', 'light')!;

    applyMapAppearanceTransaction({
      map,
      themeConfig: {},
      rainbowLinesConfig: { open: true, colorsList: ['#00AA88'] },
      colorAppearance: appearance,
      useThemeLineColors: false,
    });

    expect(map.updateConfig).toHaveBeenCalledWith({ rainbowLinesConfig: { open: true, colorsList: ['#00AA88'] } });
    expect(map.render).toHaveBeenCalledWith(expect.any(Function), 'changeTheme');
  });

  it('keeps only the latest completion when appearance changes are coalesced', () => {
    const callbacks: Array<() => void> = [];
    const { map } = createMap();
    map.reRender.mockImplementation((callback?: () => void) => {
      if (callback) callbacks.push(callback);
    });
    const first = vi.fn();
    const second = vi.fn();
    const appearance = getThemeColorAppearance('scheme-code', 'dark')!;

    applyMapAppearanceTransaction({
      map,
      themeConfig: { backgroundColor: '#111111' },
      rainbowLinesConfig: { open: true, colorsList: ['#111111'] },
      colorAppearance: appearance,
      useThemeLineColors: false,
      afterRender: first,
    });
    // Simulate the renderer clearing activeNodeList while the first full redraw
    // is in flight. The newer transaction must retain the previous selection.
    map.renderer.activeNodeList = [];
    applyMapAppearanceTransaction({
      map,
      themeConfig: { backgroundColor: '#222222' },
      rainbowLinesConfig: { open: true, colorsList: ['#222222'] },
      colorAppearance: appearance,
      useThemeLineColors: false,
      afterRender: second,
    });

    callbacks[0]?.();
    callbacks[1]?.();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(map.renderer.activeMultiNode).toHaveBeenCalledWith([expect.any(Object)]);
  });
});
