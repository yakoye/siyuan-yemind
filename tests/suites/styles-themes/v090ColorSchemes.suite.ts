import { describe, expect, it, vi } from 'vitest';
import { YEMIND_COLOR_SCHEMES, getColorScheme, rainbowSchemeOptionsHtml } from '../../../src/core/colorSchemes';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import { normalizeProjectStyle, resolveProjectAppearance } from '../../../src/editor/projectStyle';
import { ProjectStylePanel } from '../../../src/ui/projectStylePanel';

const EXPECTED_NAMES = [
  '晨曦', '彩虹', '活力', '舞动', '代码', '和风', '岛屿', '玫瑰', '薄荷', '绿茶',
  '永恒', '奶油', '花海', '珊瑚', '绚丽', '香槟', '香水', '禅心', '律动',
];

describe('v0.9.0+ named color schemes and rainbow branches', () => {
  it('defines nineteen named palettes with declared cycle lengths and valid colors', () => {
    expect(YEMIND_COLOR_SCHEMES.map((scheme) => scheme.label)).toEqual(EXPECTED_NAMES);
    expect(YEMIND_COLOR_SCHEMES.filter((scheme) => scheme.category === '缤纷')).toHaveLength(10);
    expect(YEMIND_COLOR_SCHEMES.filter((scheme) => scheme.category === '经典')).toHaveLength(9);
    for (const scheme of YEMIND_COLOR_SCHEMES) {
      expect([1, 3, 4, 6]).toContain(scheme.colors.length);
      expect(scheme.colors.every((color) => /^#[0-9A-F]{6}$/.test(color))).toBe(true);
      expect(scheme.background).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('renders every named palette in the whole-map style selector', () => {
    const html = createEditorTemplate('Demo');
    expect(html).toContain('data-project-style="rainbowScheme"');
    for (const scheme of YEMIND_COLOR_SCHEMES) expect(html).toContain(`>${scheme.label}</option>`);
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
