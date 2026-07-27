import { readFileSync } from 'node:fs';
import { YEMIND_THEME_PRESETS } from '../../src/core/themePresets';
import { themePaletteColors } from '../../src/editor/themeChoicePresentation';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const panelSource = readFileSync('src/ui/projectChoicePanel.ts', 'utf8');
const editorSource = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
const css = readFileSync('src/styles/index.css', 'utf8');

for (const preset of YEMIND_THEME_PRESETS) {
  const snapshot = JSON.stringify(preset);
  const colors = themePaletteColors(preset);
  assert(colors.length === 6, `${preset.id} must expose exactly six preview colors`);
  const expected = preset.light.colorAppearance.branches.slice(0, 6).map((branch) => branch.level1Background);
  assert(JSON.stringify(colors) === JSON.stringify(expected), `${preset.id} palette must use existing level-1 branch colors`);
  assert(JSON.stringify(preset) === snapshot, `${preset.id} was mutated while deriving preview colors`);
}

assert(editorSource.includes("presentation: 'palette'"), 'Theme panel is not opted into palette presentation');
assert(editorSource.includes('previewColors: themePaletteColors(preset)'), 'Theme preview colors are not wired from current presets');
assert(panelSource.includes('ymz-project-choice-panel__tabs'), 'Theme group tabs are missing');
assert(panelSource.includes('ymz-project-choice-panel__palette-grid'), 'Theme palette grid is missing');
assert(panelSource.includes('ymz-project-choice-panel__palette-block'), 'Six-color palette blocks are missing');
assert(panelSource.includes('ymz-project-choice-panel__list'), 'Line-style list renderer was removed');
assert(/\.ymz-project-choice-panel\.is-palette[^}]*width:min\(390px/s.test(css), 'Theme palette panel width contract is missing');
assert(/\.ymz-project-choice-panel__palette-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s.test(css), 'Theme cards must use two columns');
assert(/\.ymz-project-choice-panel__palette-strip\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/s.test(css), 'Every theme strip must have six equal blocks');

export default { presets: YEMIND_THEME_PRESETS.length, sixColorPalettes: true, listPanelPreserved: true };
