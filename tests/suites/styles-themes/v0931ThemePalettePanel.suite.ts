import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { YEMIND_THEME_PRESETS } from '../../../src/core/themePresets';
import { themePaletteColors } from '../../../src/editor/themeChoicePresentation';

const panelSource = readFileSync('src/ui/projectChoicePanel.ts', 'utf8');
const editorSource = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
const css = readFileSync('src/styles/index.css', 'utf8');

describe('v0.9.31 theme palette dropdown presentation', () => {
  it('derives exactly six existing branch colors for every current theme without changing preset data', () => {
    for (const preset of YEMIND_THEME_PRESETS) {
      const before = JSON.stringify(preset);
      const colors = themePaletteColors(preset);
      expect(colors).toHaveLength(6);
      expect(colors).toEqual(preset.light.colorAppearance.branches.slice(0, 6).map((branch) => branch.level1Background));
      expect(JSON.stringify(preset)).toBe(before);
    }
  });

  it('opts only the Theme dropdown into palette presentation and keeps Line Style on list presentation', () => {
    expect(editorSource).toContain("presentation: 'palette'");
    expect(editorSource).toContain('previewColors: themePaletteColors(preset)');
    expect(editorSource).not.toMatch(/lineStyleChoicePanel[\s\S]{0,800}presentation:\s*'palette'/);
  });

  it('renders group tabs and six-block theme cards while retaining the existing list renderer', () => {
    expect(panelSource).toContain("presentation?: 'list' | 'palette'");
    expect(panelSource).toContain('previewColors?: readonly string[]');
    expect(panelSource).toContain('ymz-project-choice-panel__tabs');
    expect(panelSource).toContain('ymz-project-choice-panel__palette-grid');
    expect(panelSource).toContain('ymz-project-choice-panel__palette-block');
    expect(panelSource).toContain('ymz-project-choice-panel__list');
  });

  it('uses a two-column card grid and preserves actual preview colors in dark mode', () => {
    expect(css).toMatch(/\.ymz-project-choice-panel\.is-palette[^}]*width:min\(390px/s);
    expect(css).toMatch(/\.ymz-project-choice-panel__palette-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
    expect(css).toMatch(/\.ymz-project-choice-panel__palette-strip\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/s);
    expect(css).not.toMatch(/data-appearance="dark"[^\n]*ymz-project-choice-panel__palette-block[^\n]*(filter|background)/);
  });
});
