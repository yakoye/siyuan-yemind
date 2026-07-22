import { describe, expect, it } from 'vitest';
import {
  YEMIND_THEME_PRESETS,
  buildThemeConfig,
  detectAppearance,
  normalizeLineStyle,
  normalizeThemePresetId,
  themeOptionsHtml,
} from '../../../src/core/themePresets';

const EXPECTED_SCHEME_IDS = [
  'scheme-dawn', 'scheme-rainbow', 'scheme-vitality', 'scheme-dance', 'scheme-code',
  'scheme-harmony', 'scheme-island', 'scheme-rose', 'scheme-mint', 'scheme-green-tea',
  'scheme-eternity', 'scheme-cream', 'scheme-flower-sea', 'scheme-coral', 'scheme-vivid',
  'scheme-champagne', 'scheme-perfume', 'scheme-zen', 'scheme-rhythm',
];

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
    expect(result.themeConfig.backgroundColor).toBe('#F8FAFC');
  });

  it('provides three base themes and all nineteen named themes', () => {
    expect(YEMIND_THEME_PRESETS.map((item) => item.id)).toEqual([
      'yemind-default', 'ink-branch', 'material-3-basic', ...EXPECTED_SCHEME_IDS,
    ]);
    expect(YEMIND_THEME_PRESETS).toHaveLength(22);
    expect(YEMIND_THEME_PRESETS.filter((item) => item.group === '基础')).toHaveLength(3);
    expect(YEMIND_THEME_PRESETS.filter((item) => item.group === '缤纷')).toHaveLength(10);
    expect(YEMIND_THEME_PRESETS.filter((item) => item.group === '经典')).toHaveLength(9);

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

  it('applies complete theme background, node colors and branch cycle together', () => {
    const result = buildThemeConfig({ presetId: 'scheme-rose', appearance: 'light', lineStyle: 'curve' });
    expect(result.themeConfig.backgroundColor).toBe('#FFF0F3');
    expect(result.themeConfig.second.fillColor).toMatch(/^#/);
    expect(result.themeConfig.node.fillColor).toMatch(/^#/);
    expect(result.rainbow.open).toBe(true);
    expect(result.rainbow.colorsList).toHaveLength(result.colorAppearance.cycleLength);
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
    expect([1, 3, 4, 6]).toContain(result.rainbow.colorsList.length);
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
