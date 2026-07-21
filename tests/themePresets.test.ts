import { describe, expect, it } from 'vitest';
import {
  YEMIND_THEME_PRESETS,
  buildThemeConfig,
  detectAppearance,
  normalizeLineStyle,
  normalizeThemePresetId,
} from '../src/core/themePresets';

describe('official-inspired theme presets', () => {
  it('uses KMind Default and curved parent-child edges by default', () => {
    expect(normalizeThemePresetId('default')).toBe('kmind-default');
    expect(normalizeThemePresetId(undefined)).toBe('kmind-default');
    expect(normalizeLineStyle(undefined)).toBe('curve');

    const result = buildThemeConfig({
      presetId: 'kmind-default',
      appearance: 'light',
      lineStyle: 'curve',
    });

    expect(result.themeConfig.lineStyle).toBe('curve');
    expect(result.themeConfig.rootLineKeepSameInCurve).toBe(true);
    expect(result.themeConfig.backgroundColor).toBe('#f8fafc');
  });

  it('provides official theme families with light and dark variants', () => {
    const ids = YEMIND_THEME_PRESETS.map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining([
      'kmind-default',
      'kmind-material-3-slate',
      'kmind-material-3',
      'kmind-candy-pop',
      'kmind-midnight-neon',
      'kmind-rainbow-breeze',
      'kmind-baseline-fork-ink',
      'kmind-material-3-rounded-orthogonal-ocean',
      'kmind-material-3-rounded-orthogonal-forest',
      'kmind-material-3-rounded-orthogonal-citrus',
      'kmind-material-3-rounded-orthogonal-rose',
      'kmind-material-3-rounded-orthogonal-violet',
      'kmind-material-3-rounded-orthogonal-aqua',
    ]));

    const light = buildThemeConfig({ presetId: 'kmind-default', appearance: 'light', lineStyle: 'curve' });
    const dark = buildThemeConfig({ presetId: 'kmind-default', appearance: 'dark', lineStyle: 'curve' });
    expect(light.themeConfig.backgroundColor).not.toBe(dark.themeConfig.backgroundColor);
    expect(light.themeConfig.root.fillColor).not.toBe(dark.themeConfig.root.fillColor);
  });

  it('keeps user spacing settings authoritative over preset spacing', () => {
    const result = buildThemeConfig({
      presetId: 'kmind-rainbow-breeze',
      appearance: 'light',
      lineStyle: 'straight',
      spacingConfig: {
        second: { marginX: 132, marginY: 44 },
        node: { marginX: 66, marginY: 18 },
      },
    });

    expect(result.themeConfig.lineStyle).toBe('straight');
    expect(result.themeConfig.second).toMatchObject({ marginX: 132, marginY: 44 });
    expect(result.themeConfig.node).toMatchObject({ marginX: 66, marginY: 18 });
    expect(result.rainbow.open).toBe(true);
    expect(result.rainbow.colorsList.length).toBeGreaterThanOrEqual(6);
  });

  it('falls back safely for unknown preset and line style values', () => {
    expect(normalizeThemePresetId('unknown-theme')).toBe('kmind-default');
    expect(normalizeLineStyle('unknown-style')).toBe('curve');
  });

  it('follows the host light and dark appearance markers', () => {
    const root = document.documentElement;
    const body = document.body;
    root.removeAttribute('data-theme-mode');
    root.className = '';
    body.className = 'layout--dark';
    expect(detectAppearance()).toBe('dark');
    body.className = '';
    root.dataset.themeMode = 'light';
    expect(detectAppearance()).toBe('light');
    root.removeAttribute('data-theme-mode');
  });
});
