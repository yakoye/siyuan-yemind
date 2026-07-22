import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { YEMIND_COLOR_SCHEMES, getColorScheme, rainbowSchemeOptionsHtml } from '../../../src/core/colorSchemes';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import { normalizeProjectStyle, resolveProjectAppearance } from '../../../src/editor/projectStyle';
import { ProjectStylePanel } from '../../../src/ui/projectStylePanel';

describe('v0.9.1 complete theme color catalog and rainbow branches', () => {
  it('defines three base palettes and nineteen named palettes with complete branch-level fields', () => {
    expect(YEMIND_COLOR_SCHEMES.map((scheme) => scheme.label)).toEqual([
      'YeMind 默认', 'Ink Branch', 'Material 3 Basic',
      '晨曦', '彩虹', '活力', '舞动', '代码', '和风', '岛屿', '玫瑰', '薄荷', '绿茶',
      '永恒', '奶油', '花海', '珊瑚', '绚丽', '香槟', '香水', '禅心', '律动',
    ]);
    for (const scheme of YEMIND_COLOR_SCHEMES) {
      expect(scheme.colors.length).toBeGreaterThanOrEqual(1);
      expect(scheme.colors.every((color) => /^#[0-9a-f]{6}$/i.test(color))).toBe(true);
      expect(scheme.background).toMatch(/^#[0-9a-f]{6}$/i);
      expect(scheme.theme.branches.length).toBeGreaterThanOrEqual(1);
      expect(scheme.theme.cycleLength).toBeGreaterThanOrEqual(1);
      for (const branch of scheme.theme.branches) {
        expect(branch).toEqual(expect.objectContaining({
          centerToLevel1Line: expect.any(String), level1Text: expect.any(String), level1Background: expect.any(String),
          level1ToLevel2Line: expect.any(String), level2Text: expect.any(String), level2Background: expect.any(String),
          level2ToNormalLine: expect.any(String), normalText: expect.any(String), normalBackground: expect.any(String),
        }));
      }
    }
  });

  it('matches the checked-in theme color source exactly for all nineteen named themes', () => {
    const source = JSON.parse(readFileSync(resolve(process.cwd(), 'docs/theme-colors/yemind_theme_colors.json'), 'utf8')) as { themes: Record<string, any> };
    const names = ['晨曦','彩虹','活力','舞动','代码','和风','岛屿','玫瑰','薄荷','绿茶','永恒','奶油','花海','珊瑚','绚丽','香槟','香水','禅心','律动'];
    for (const name of names) {
      const scheme = YEMIND_COLOR_SCHEMES.find((item) => item.label === name)!;
      const expected = source.themes[name];
      expect({
        background: scheme.theme.background, centerText: scheme.theme.centerText,
        centerBackground: scheme.theme.centerBackground, cycleLength: scheme.theme.cycleLength,
        branches: scheme.theme.branches,
      }).toEqual({
        background: expected.background, centerText: expected.centerText,
        centerBackground: expected.centerBackground, cycleLength: expected.cycleLength,
        branches: expected.branches,
      });
    }
  });

  it('renders every named palette in the whole-map style selector', () => {
    const html = createEditorTemplate('Demo');
    expect(html).toContain('data-project-style="rainbowScheme"');
    for (const scheme of YEMIND_COLOR_SCHEMES) expect(html).toContain(`>${scheme.label}</option>`);
    expect(rainbowSchemeOptionsHtml('yemind-default')).toContain('<optgroup label="基础">');
    expect(rainbowSchemeOptionsHtml('eternity')).toContain('<option value="eternity" selected>永恒</option>');
    expect(rainbowSchemeOptionsHtml('rose')).toContain('<option value="rose" selected>玫瑰</option>');
  });

  it('normalizes and applies the selected branch palette without changing theme spacing', () => {
    expect(normalizeProjectStyle({ density: 'default', rainbowLines: true, rainbowScheme: 'mint' })).toMatchObject({
      density: 'default', rainbowLines: true, rainbowScheme: 'mint',
    });
    expect(normalizeProjectStyle({ rainbowScheme: 'missing' }).rainbowScheme).toBeNull();
    const result = resolveProjectAppearance({
      style: { density: 'default', rainbowLines: true, rainbowScheme: 'mint', backgroundColor: null },
      themeConfig: { second: { marginX: 100 }, node: { marginX: 54 } },
      rainbow: { open: false, colorsList: ['#000000'] },
    });
    expect(result.rainbow.open).toBe(true);
    expect(result.rainbow.colorsList).toEqual([...getColorScheme('mint')!.colors]);
    expect(result.themeConfig.second.marginX).toBe(60);
  });

  it('updates the palette preview and enables rainbow branches in one transaction', () => {
    const root = document.createElement('div');
    root.innerHTML = createEditorTemplate('Demo');
    const changes = vi.fn();
    const panel = new ProjectStylePanel(
      root,
      { density: 'default', rainbowLines: null, rainbowScheme: null, backgroundColor: null },
      () => false,
      changes,
    );
    const select = root.querySelector<HTMLSelectElement>('[data-project-style="rainbowScheme"]')!;
    select.value = 'green-tea';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(changes).toHaveBeenLastCalledWith(expect.objectContaining({
      rainbowLines: true,
      rainbowScheme: 'green-tea',
    }));
    const preview = root.querySelector<HTMLElement>('[data-project-rainbow-preview]')!;
    expect(preview.style.backgroundImage).toContain('linear-gradient');
    panel.destroy();
  });
});
