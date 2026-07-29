import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { YEMIND_THEME_PRESETS } from '../../../src/core/themePresets';
import { themePaletteColors } from '../../../src/editor/themeChoicePresentation';
import { buildThemeChoiceOptions } from '../../../src/editor/themeChoiceGroups';
import { ProjectChoicePanel } from '../../../src/ui/projectChoicePanel';

const panelSource = readFileSync('src/ui/projectChoicePanel.ts', 'utf8');
const editorSource = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
const groupSource = readFileSync('src/editor/themeChoiceGroups.ts', 'utf8');
const css = readFileSync('src/styles/index.css', 'utf8');

describe('v0.9.31 theme palette dropdown presentation', () => {
  it('shows only real applied colors for classic themes', () => {
    const classic = YEMIND_THEME_PRESETS.find((preset) => preset.label === '永恒')!;
    const before = JSON.stringify(classic);
    const colors = themePaletteColors(classic);
    expect(colors).toEqual(['#3949AB', '#E53935', '#C0CA33', '#00897B', '#1E88E5', '#8E24AA']);
    expect(colors).not.toContain('transparent');
    expect(JSON.stringify(classic)).toBe(before);
  });

  it('keeps colorful branch cycles in source order', () => {
    const rainbow = YEMIND_THEME_PRESETS.find((preset) => preset.label === '彩虹')!;
    expect(themePaletteColors(rainbow)).toEqual(
      rainbow.light.colorAppearance.branches
        .slice(0, rainbow.light.colorAppearance.cycleLength)
        .map((branch) => branch.level1Background),
    );
  });

  it('opts only the Theme dropdown into palette presentation and keeps Line Style on list presentation', () => {
    expect(editorSource).toContain("presentation: 'palette'");
    expect(groupSource).toContain('previewColors: themePaletteColors(preset)');
    expect(editorSource).not.toMatch(/lineStyleChoicePanel[\s\S]{0,800}presentation:\s*'palette'/);
  });

  it('renders group tabs and real-color theme cards without a secondary apply action', () => {
    expect(panelSource).toContain("presentation?: 'list' | 'palette'");
    expect(panelSource).toContain('previewColors?: readonly string[]');
    expect(panelSource).toContain('ymz-project-choice-panel__tabs');
    expect(panelSource).toContain('ymz-project-choice-panel__palette-grid');
    expect(panelSource).toContain('ymz-project-choice-panel__palette-block');
    expect(editorSource).not.toContain('applyLabel: (option) => `应用主题');
    expect(panelSource).toContain('ymz-project-choice-panel__list');
  });

  it('uses a two-column card grid and preserves actual preview colors in dark mode', () => {
    expect(css).toMatch(/\.ymz-project-choice-panel\.is-palette[^}]*width:min\(390px/s);
    expect(css).toMatch(/\.ymz-project-choice-panel__palette-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
    expect(css).toMatch(/\.ymz-project-choice-panel__palette-strip\{[^}]*grid-template-columns:repeat\(var\(--ymz-palette-count,6\),minmax\(0,1fr\)\)/s);
    expect(css).not.toMatch(/data-appearance="dark"[^\n]*ymz-project-choice-panel__palette-block[^\n]*(filter|background)/);
  });

  it('applies a theme immediately when its palette card is clicked', () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <button data-anchor>主题</button>
      <aside data-role="theme-choice-panel" hidden>
        <button data-project-choice-action="close">×</button>
        <div data-project-choice-body></div>
      </aside>`;
    const applied: string[] = [];
    const panel = new ProjectChoicePanel(host, {
      role: 'theme-choice-panel',
      title: '主题',
      options: [
        { value: 'one', label: '主题一', group: '基础', previewColors: ['#111111'] },
        { value: 'two', label: '主题二', group: '基础', previewColors: ['#222222'] },
      ],
      presentation: 'palette',
      selected: 'one',
      readonly: () => false,
      onSelect: (value) => applied.push(value),
    });
    panel.show(host.querySelector('[data-anchor]')!);
    host.querySelector<HTMLButtonElement>('[data-project-choice-value="two"]')!.click();
    expect(applied).toEqual(['two']);
    expect(host.querySelector('[data-project-choice-apply]')).toBeNull();
    expect(panel.isVisible()).toBe(false);
    panel.destroy();
  });

  it('builds 常用 first and moves the former 基础 themes before the original 经典 themes', () => {
    const options = buildThemeChoiceOptions(['ink-branch']);
    expect([...new Set(options.map((option) => option.group))]).toEqual(['常用', '缤纷', '经典']);
    expect(options.filter((option) => option.group === '常用').map((option) => option.value))
      .toEqual(['ink-branch']);
    const classic = options.filter((option) => option.group === '经典').map((option) => option.value);
    expect(classic.indexOf('yemind-default')).toBeGreaterThanOrEqual(0);
    expect(classic.indexOf('scheme-eternity')).toBeGreaterThanOrEqual(0);
    expect(classic.indexOf('yemind-default')).toBeLessThan(classic.indexOf('scheme-eternity'));
  });

  it('toggles a favorite without applying or closing the theme panel', () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <button data-anchor>主题</button>
      <aside data-role="theme-choice-panel" hidden>
        <button data-project-choice-action="close">×</button>
        <div data-project-choice-body></div>
      </aside>`;
    const applied: string[] = [];
    const favorites: Array<{ value: string; favorite: boolean }> = [];
    const panel = new ProjectChoicePanel(host, {
      role: 'theme-choice-panel',
      title: '主题',
      options: [
        { value: 'one', label: '主题一', group: '常用', previewColors: ['#111111'] },
        { value: 'two', label: '主题二', group: '经典', previewColors: ['#222222'] },
      ],
      presentation: 'palette',
      selected: 'one',
      favoriteValues: ['one'],
      readonly: () => false,
      onFavoriteChange: (value, favorite) => favorites.push({ value, favorite }),
      onSelect: (value) => applied.push(value),
    });
    panel.show(host.querySelector('[data-anchor]')!);
    host.querySelector<HTMLButtonElement>('[data-project-choice-favorite="one"]')!.click();
    expect(favorites).toEqual([{ value: 'one', favorite: false }]);
    expect(applied).toEqual([]);
    expect(panel.isVisible()).toBe(true);
    panel.destroy();
  });

  it('shows guidance when the 常用 group has no favorites', () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <button data-anchor>主题</button>
      <aside data-role="theme-choice-panel" hidden>
        <button data-project-choice-action="close">×</button>
        <div data-project-choice-body></div>
      </aside>`;
    const panel = new ProjectChoicePanel(host, {
      role: 'theme-choice-panel',
      title: '主题',
      options: [
        { value: 'one', label: '主题一', group: '经典', previewColors: ['#111111'] },
      ],
      groups: ['常用', '经典'],
      presentation: 'palette',
      selected: 'one',
      favoriteValues: [],
      emptyGroupMessage: (group) => group === '常用' ? '还没有常用主题' : '',
      readonly: () => false,
      onSelect: () => {},
    });
    panel.show(host.querySelector('[data-anchor]')!);
    host.querySelector<HTMLButtonElement>('[data-project-choice-group="常用"]')!.click();
    expect(host.querySelector('[data-project-choice-empty]')?.textContent).toContain('还没有常用主题');
    panel.destroy();
  });

  it('converges theme typography in a second editor transaction after the first render completes', () => {
    expect(editorSource).toContain('this.applyMapAppearance(true, true);');
    expect(editorSource).toContain('if (convergeThemeGeometry)');
    expect(editorSource).toContain('this.applyMapAppearance(true, false);');
  });
});
