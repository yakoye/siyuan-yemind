import { describe, expect, it } from 'vitest';
import { buildOuterFrameOptions, normalizeOuterFramePadding } from '../../../src/core/outerFrameConfig';
import { DEFAULT_SETTINGS } from '../../../src/settings/SettingsStore';

describe('native outer-frame configuration', () => {
  it('maps YeMind settings directly to upstream option names', () => {
    expect(buildOuterFrameOptions({
      ...DEFAULT_SETTINGS,
      defaultOuterFrameText: '重点',
      outerFramePaddingX: 24,
      outerFramePaddingY: 18,
    })).toEqual({
      defaultOuterFrameText: '重点',
      outerFramePaddingX: 24,
      outerFramePaddingY: 18,
    });
  });

  it('normalizes padding to finite integers in the upstream-safe 0-80 range', () => {
    expect(normalizeOuterFramePadding(-10, 10)).toBe(0);
    expect(normalizeOuterFramePadding(120, 10)).toBe(80);
    expect(normalizeOuterFramePadding(12.8, 10)).toBe(13);
    expect(normalizeOuterFramePadding(Number.NaN, 10)).toBe(10);
    expect(normalizeOuterFramePadding(null, 10)).toBe(10);
  });
});
