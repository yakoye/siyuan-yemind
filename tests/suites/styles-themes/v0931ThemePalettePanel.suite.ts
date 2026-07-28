import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { YEMIND_THEME_PRESETS } from '../../../src/core/themePresets';
import { themePaletteColors } from '../../../src/editor/themeChoicePresentation';
import { ProjectChoicePanel } from '../../../src/ui/projectChoicePanel';

const panelSource = readFileSync('src/ui/projectChoicePanel.ts', 'utf8');
const editorSource = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
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
    expect(editorSource).toContain('previewColors: themePaletteColors(preset)');
    expect(editorSource).not.toMatch(/lineStyleChoicePanel[\s\S]{0,800}presentation:\s*'palette'/);
  });

  it('renders group tabs and real-color theme cards while retaining the existing list renderer', () => {
    expect(panelSource).toContain("presentation?: 'list' | 'palette'");
    expect(panelSource).toContain('previewColors?: readonly string[]');
    expect(panelSource).toContain('ymz-project-choice-panel__tabs');
    expect(panelSource).toContain('ymz-project-choice-panel__palette-grid');
    expect(panelSource).toContain('ymz-project-choice-panel__palette-block');
    expect(panelSource).toContain('data-project-choice-apply');
    expect(panelSource).toContain('this.config.onSelect(this.selected)');
    expect(panelSource).toContain('ymz-project-choice-panel__list');
  });

  it('uses a two-column card grid and preserves actual preview colors in dark mode', () => {
    expect(css).toMatch(/\.ymz-project-choice-panel\.is-palette[^}]*width:min\(390px/s);
    expect(css).toMatch(/\.ymz-project-choice-panel__palette-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
    expect(css).toMatch(/\.ymz-project-choice-panel__palette-strip\{[^}]*grid-template-columns:repeat\(var\(--ymz-palette-count,6\),minmax\(0,1fr\)\)/s);
    expect(css).not.toMatch(/data-appearance="dark"[^\n]*ymz-project-choice-panel__palette-block[^\n]*(filter|background)/);
  });

  it('previews a theme choice and applies it only from the explicit action', () => {
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
      applyLabel: (option) => `应用主题 · ${option.label}`,
      readonly: () => false,
      onSelect: (value) => applied.push(value),
    });
    panel.show(host.querySelector('[data-anchor]')!);
    host.querySelector<HTMLButtonElement>('[data-project-choice-value="two"]')!.click();
    expect(applied).toEqual([]);
    expect(host.querySelector('[data-project-choice-apply]')?.textContent).toBe('应用主题 · 主题二');
    host.querySelector<HTMLButtonElement>('[data-project-choice-apply]')!.click();
    expect(applied).toEqual(['two']);
    expect(panel.isVisible()).toBe(false);
    panel.destroy();
  });
});
