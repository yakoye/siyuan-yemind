import { describe, expect, it, vi } from 'vitest';
import { applyMapAppearanceTransaction } from '../../../src/core/appearanceTransaction';
import { getThemeColorAppearance } from '../../../src/core/themeColorData';

describe('v0.9.24 appearance view stability', () => {
  it('restores the exact transform after a theme redraw', () => {
    const saved = { scaleX: 1.25, scaleY: 1.25, translateX: 117, translateY: -33 };
    const setTransformData = vi.fn();
    const map: any = {
      opt: {}, renderer: { activeNodeList: [] },
      view: { getTransformData: vi.fn(() => ({ ...saved })), setTransformData },
      setThemeConfig: vi.fn(), updateConfig: vi.fn(),
      reRender(callback: () => void) { callback(); },
    };
    const appearance = getThemeColorAppearance('scheme-code', 'dark')!;
    applyMapAppearanceTransaction({ map, themeConfig: {}, rainbowLinesConfig: {}, colorAppearance: appearance, useThemeLineColors: true });
    expect(setTransformData).toHaveBeenCalledWith(saved);
  });
});
