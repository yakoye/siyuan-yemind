import { describe, expect, it } from 'vitest';
import { buildThemeConfig } from '../../../src/core/themePresets';

describe('v0.9.13 association-line selection', () => {
  it('uses a visible accent and only a modest width increase while selected', () => {
    const result = buildThemeConfig({ presetId: 'yemind-default', appearance: 'light', lineStyle: 'curve' });
    expect(result.themeConfig.associativeLineActiveColor).toBe('#2563eb');
    expect(result.themeConfig.associativeLineActiveWidth).toBe(3);
    expect(result.themeConfig.associativeLineActiveWidth).toBeLessThan(5);
  });
});
