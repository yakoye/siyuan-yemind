import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  YEMIND_THEME_COLOR_APPEARANCES,
  YEMIND_THEME_SOURCE_NAMES,
  getThemeColorAppearance,
} from '../../../src/core/themeColorData';
import {
  configureThemeColorRuntime,
  installThemeColorRuntime,
  normalizeThemeBranchIndex,
  resolveThemeNodeColors,
} from '../../../src/core/themeColorRuntime';
import { YEMIND_THEME_PRESETS, buildThemeConfig, themeOptionsHtml } from '../../../src/core/themePresets';

const EXPECTED_NAMES = [
  '晨曦', '彩虹', '活力', '舞动', '代码', '和风', '岛屿', '玫瑰', '薄荷', '绿茶',
  '永恒', '奶油', '花海', '珊瑚', '绚丽', '香槟', '香水', '禅心', '律动',
];
const COLOR = /^(?:#[0-9A-F]{6}|transparent)$/;

describe('v0.9.2 complete theme color and border definitions', () => {
  it('keeps the original 19-theme JSON as the ordered source of truth', () => {
    const source = JSON.parse(readFileSync(resolve(process.cwd(), 'docs/theme-colors/yemind_theme_colors_with_borders.json'), 'utf8'));
    expect(source.schemaVersion).toBe(2);
    expect(Object.keys(source.themes)).toEqual(EXPECTED_NAMES);
    expect(YEMIND_THEME_SOURCE_NAMES).toEqual(EXPECTED_NAMES);
    for (const [name, theme] of Object.entries<any>(source.themes)) {
      expect(['缤纷', '经典']).toContain(theme.category);
      expect([1, 3, 4, 6]).toContain(theme.cycleLength);
      expect(theme.branches).toHaveLength(6);
      expect([theme.background, theme.centerText, theme.centerBackground, theme.centerBorder].every((value) => COLOR.test(value))).toBe(true);
      for (const branch of theme.branches) {
        expect(branch).toHaveProperty('level1Border');
        expect(branch).toHaveProperty('level2Border');
        expect(branch).toHaveProperty('normalBorder');
        expect(Object.values(branch).every((value) => typeof value === 'string' && COLOR.test(value))).toBe(true);
      }
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('generates six base appearances and nineteen fixed appearances', () => {
    expect(YEMIND_THEME_COLOR_APPEARANCES).toHaveLength(25);
    expect(YEMIND_THEME_COLOR_APPEARANCES.filter((item) => item.category === '基础')).toHaveLength(6);
    expect(YEMIND_THEME_COLOR_APPEARANCES.filter((item) => item.category === '缤纷')).toHaveLength(10);
    expect(YEMIND_THEME_COLOR_APPEARANCES.filter((item) => item.category === '经典')).toHaveLength(9);
    for (const presetId of ['yemind-default', 'ink-branch', 'material-3-basic']) {
      const light = getThemeColorAppearance(presetId, 'light');
      const dark = getThemeColorAppearance(presetId, 'dark');
      expect(light?.appearance).toBe('light');
      expect(dark?.appearance).toBe('dark');
      expect(light?.background).not.toBe(dark?.background);
    }
  });

  it('registers three base, ten vivid and nine classic themes in source order', () => {
    expect(YEMIND_THEME_PRESETS).toHaveLength(22);
    expect(YEMIND_THEME_PRESETS.slice(0, 3).map((item) => item.label)).toEqual([
      'YeMind 默认', 'Ink Branch', 'Material 3 Basic',
    ]);
    expect(YEMIND_THEME_PRESETS.slice(3).map((item) => item.label)).toEqual(EXPECTED_NAMES);
    expect(YEMIND_THEME_PRESETS.filter((item) => item.group === '基础')).toHaveLength(3);
    expect(YEMIND_THEME_PRESETS.filter((item) => item.group === '缤纷')).toHaveLength(10);
    expect(YEMIND_THEME_PRESETS.filter((item) => item.group === '经典')).toHaveLength(9);
    const html = themeOptionsHtml('scheme-rhythm');
    expect(html).toContain('<optgroup label="基础">');
    expect(html).toContain('<optgroup label="缤纷">');
    expect(html).toContain('<optgroup label="经典">');
    expect(html).toContain('<option value="scheme-rhythm" selected>律动</option>');
  });

  it('resolves center, first-level, second-level and normal-node colors independently', () => {
    const appearance = getThemeColorAppearance('scheme-dawn', 'dark')!;
    const branch = appearance.branches[2];
    expect(resolveThemeNodeColors(appearance, 0, 2)).toEqual({
      fillColor: appearance.centerBackground,
      color: appearance.centerText,
      borderColor: appearance.centerBorder,
    });
    expect(resolveThemeNodeColors(appearance, 1, 2)).toEqual({
      fillColor: branch.level1Background,
      color: branch.level1Text,
      borderColor: branch.level1Border,
      lineColor: branch.centerToLevel1Line,
    });
    expect(resolveThemeNodeColors(appearance, 2, 2)).toEqual({
      fillColor: branch.level2Background,
      color: branch.level2Text,
      borderColor: branch.level2Border,
      lineColor: branch.level1ToLevel2Line,
    });
    expect(resolveThemeNodeColors(appearance, 5, 2)).toEqual({
      fillColor: branch.normalBackground,
      color: branch.normalText,
      borderColor: branch.normalBorder,
      lineColor: branch.level2ToNormalLine,
    });
  });

  it('uses the declared 1, 3, 4 and 6 branch cycles', () => {
    expect(normalizeThemeBranchIndex(7, 1)).toBe(0);
    expect(normalizeThemeBranchIndex(7, 3)).toBe(1);
    expect(normalizeThemeBranchIndex(7, 4)).toBe(3);
    expect(normalizeThemeBranchIndex(7, 6)).toBe(1);
    for (const appearance of YEMIND_THEME_COLOR_APPEARANCES) {
      const first = resolveThemeNodeColors(appearance, 1, 0);
      const repeated = resolveThemeNodeColors(appearance, 1, appearance.cycleLength);
      expect(repeated).toEqual(first);
    }
  });

  it('keeps generated theme fallbacks non-persistent and below local node styles', () => {
    const tree: any = {
      data: { text: 'Root' },
      children: [
        {
          data: { text: 'Branch', fillColor: '#123456', color: '#654321', borderColor: '#FEDCBA', lineColor: '#ABCDEF' },
          children: [{ data: { text: 'Child' }, children: [] }],
        },
      ],
    };
    const originalRender = vi.fn();
    const map: any = { renderer: { renderTree: tree, _render: originalRender } };
    installThemeColorRuntime(map);
    configureThemeColorRuntime(map, {
      appearance: getThemeColorAppearance('scheme-rainbow', 'light'),
      useThemeLineColors: true,
    });
    map.renderer._render();

    expect(tree.children[0].data).toMatchObject({
      fillColor: '#123456', color: '#654321', borderColor: '#FEDCBA', lineColor: '#ABCDEF',
    });
    const childColors = resolveThemeNodeColors(getThemeColorAppearance('scheme-rainbow', 'light')!, 2, 0);
    expect(tree.children[0].children[0].data.fillColor).toBe(childColors.fillColor);
    expect(tree.children[0].children[0].data.color).toBe(childColors.color);
    expect(tree.children[0].children[0].data.borderColor).toBe(childColors.borderColor);
    expect(tree.children[0].children[0].data.lineColor).toBe(childColors.lineColor);
    expect(Object.keys(tree.children[0].children[0].data)).toEqual(['text']);
    expect(JSON.stringify(tree)).not.toContain('"fillColor":"' + childColors.fillColor + '"');
    expect(originalRender).toHaveBeenCalledOnce();
  });

  it('lets explicit project rainbow settings own line colors without losing node colors', () => {
    const tree: any = { data: {}, children: [{ data: {}, children: [] }] };
    const map: any = { renderer: { renderTree: tree, _render: vi.fn() } };
    installThemeColorRuntime(map);
    const appearance = getThemeColorAppearance('scheme-rose', 'light')!;
    configureThemeColorRuntime(map, { appearance, useThemeLineColors: true });
    expect(tree.children[0].data.lineColor).toBe(appearance.branches[0].centerToLevel1Line);
    configureThemeColorRuntime(map, { appearance, useThemeLineColors: false });
    expect(tree.children[0].data.lineColor).toBeUndefined();
    expect(tree.children[0].data.fillColor).toBe(appearance.branches[0].level1Background);
  });

  it('returns each complete appearance through the production theme builder', () => {
    for (const preset of YEMIND_THEME_PRESETS) {
      for (const mode of ['light', 'dark'] as const) {
        const result = buildThemeConfig({ presetId: preset.id, appearance: mode, lineStyle: 'curve' });
        expect(result.colorAppearance.presetId).toBe(preset.id);
        expect(result.themeConfig.backgroundColor).toBe(result.colorAppearance.background);
        expect(result.themeConfig.root.color).toBe(result.colorAppearance.centerText);
        expect(result.themeConfig.root.fillColor).toBe(result.colorAppearance.centerBackground);
        expect(result.themeConfig.root.borderColor).toBe(result.colorAppearance.centerBorder);
        expect(result.themeConfig.second.borderColor).toBe(result.colorAppearance.branches[0].level1Border);
        expect(result.themeConfig.node.borderColor).toBe(result.colorAppearance.branches[0].level2Border);
      }
    }
  });
});
