import { describe, expect, it } from 'vitest';
import { getThemeColorAppearance } from '../../../src/core/themeColorData';
import { resolveThemeNodeColors } from '../../../src/core/themeColorRuntime';

const TRANSPARENT_ROOT_THEMES = ['scheme-dawn', 'scheme-rainbow', 'scheme-code', 'scheme-zen'];

describe('v0.9.3 root background coverage', () => {
  it.each(TRANSPARENT_ROOT_THEMES)('fills transparent %s center with its theme background', (presetId) => {
    const appearance = getThemeColorAppearance(presetId, 'light')!;
    expect(appearance.centerBackground).toBe('transparent');
    expect(resolveThemeNodeColors(appearance, 0, 0).fillColor).toBe(appearance.background);
  });

  it('uses the effective project canvas background when one is configured', () => {
    const appearance = getThemeColorAppearance('scheme-rainbow', 'light')!;
    expect(resolveThemeNodeColors(appearance, 0, 0, '#F1E6CC').fillColor).toBe('#F1E6CC');
  });

  it('keeps an explicit center fill instead of replacing it', () => {
    const appearance = getThemeColorAppearance('yemind-default', 'light')!;
    expect(resolveThemeNodeColors(appearance, 0, 0, '#000000').fillColor).toBe(appearance.centerBackground);
  });
});
