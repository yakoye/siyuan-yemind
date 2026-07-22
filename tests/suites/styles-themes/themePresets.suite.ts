import { describe, expect, it } from 'vitest';
import {
  YEMIND_THEME_PRESETS,
  buildThemeConfig,
  detectAppearance,
  normalizeLineStyle,
  normalizeThemePresetId,
  themeOptionsHtml,
} from '../../../src/core/themePresets';

describe('YeMind theme presets', () => {
  it('uses YeMind Default and curved parent-child edges by default', () => {
    expect(normalizeThemePresetId('default')).toBe('yemind-default');
    expect(normalizeThemePresetId(undefined)).toBe('yemind-default');
    expect(normalizeLineStyle(undefined)).toBe('curve');

    const result = buildThemeConfig({
      presetId: 'yemind-default',
      appearance: 'light',
      lineStyle: 'curve',
    });

    expect(result.themeConfig.lineStyle).toBe('curve');
    expect(result.themeConfig.rootLineKeepSameInCurve).toBe(true);
    expect(result.themeConfig.backgroundColor).toBe('#f8fafc');
  });

  it('provides three base themes and nineteen complete named themes', () => {
    const ids = YEMIND_THEME_PRESETS.map((item) => item.id);
    expect(ids).toEqual([
      'yemind-default', 'ink-branch', 'material-3-basic',
      'scheme-dawn', 'scheme-rainbow', 'scheme-vitality', 'scheme-dance', 'scheme-code',
      'scheme-harmony', 'scheme-island', 'scheme-rose', 'scheme-mint', 'scheme-green-tea',
      'scheme-eternity', 'scheme-cream', 'scheme-flower-sea', 'scheme-coral', 'scheme-brilliant',
      'scheme-champagne', 'scheme-perfume', 'scheme-zen-heart', 'scheme-rhythm',
    ]);
    expect(YEMIND_THEME_PRESETS.map((item) => item.label)).toEqual([
      'YeMind 默认', 'Ink Branch', 'Material 3 Basic',
      '晨曦', '彩虹', '活力', '舞动', '代码', '和风', '岛屿', '玫瑰', '薄荷', '绿茶',
      '永恒', '奶油', '花海', '珊瑚', '绚丽', '香槟', '香水', '禅心', '律动',
    ]);
    const options = themeOptionsHtml('scheme-mint');
    expect(options).toContain('<optgroup label="基础">');
    expect(options).toContain('<optgroup label="缤纷">');
    expect(options).toContain('<optgroup label="经典">');
    expect(options).toContain('<option value="scheme-mint" selected>薄荷</option>');

    const light = buildThemeConfig({ presetId: 'yemind-default', appearance: 'light', lineStyle: 'curve' });
    const dark = buildThemeConfig({ presetId: 'yemind-default', appearance: 'dark', lineStyle: 'curve' });
    expect(light.themeConfig.backgroundColor).not.toBe(dark.themeConfig.backgroundColor);
    expect(light.themeConfig.root.fillColor).not.toBe(dark.themeConfig.root.fillColor);
  });

  it('applies scheme background, node colors and rainbow branches together', () => {
    const result = buildThemeConfig({ presetId: 'scheme-rose', appearance: 'light', lineStyle: 'curve' });
    expect(result.themeConfig.backgroundColor).toBe('#fff0f3');
    expect(result.themeConfig.second.fillColor).toMatch(/^#/);
    expect(result.themeConfig.node.fillColor).toMatch(/^#/);
    expect(result.rainbow.open).toBe(true);
    expect(result.rainbow.colorsList).toHaveLength(6);
  });

  it('keeps user spacing settings authoritative over preset spacing', () => {
    const result = buildThemeConfig({
      presetId: 'scheme-rainbow',
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

  it('migrates historical theme identifiers without exposing them in the theme list', () => {
    expect(normalizeThemePresetId('kmind-default')).toBe('yemind-default');
    expect(normalizeThemePresetId('kmind-midnight-neon')).toBe('scheme-code');
    expect(YEMIND_THEME_PRESETS.some((preset) => preset.id.startsWith('kmind-'))).toBe(false);
  });

  it('falls back safely for unknown preset and line style values', () => {
    expect(normalizeThemePresetId('unknown-theme')).toBe('yemind-default');
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
