import { readFileSync } from 'node:fs';
import { YEMIND_THEME_PRESETS } from '../../src/core/themePresets';
import { themePaletteColors } from '../../src/editor/themeChoicePresentation';
import { buildThemeChoiceOptions, THEME_CHOICE_GROUPS } from '../../src/editor/themeChoiceGroups';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const panelSource = readFileSync('src/ui/projectChoicePanel.ts', 'utf8');
const editorSource = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
const css = readFileSync('src/styles/index.css', 'utf8');
const favoriteId = YEMIND_THEME_PRESETS[0]?.id ?? '';
const choiceOptions = buildThemeChoiceOptions([favoriteId]);

for (const preset of YEMIND_THEME_PRESETS) {
  const snapshot = JSON.stringify(preset);
  const colors = themePaletteColors(preset);
  assert(colors.length >= 1 && colors.length <= 6, `${preset.id} must expose one to six real preview colors`);
  assert(!colors.includes('transparent'), `${preset.id} must not expose a transparent preview block`);
  if (preset.light.colorAppearance.cycleLength > 1) {
    const expected = preset.light.colorAppearance.branches
      .slice(0, preset.light.colorAppearance.cycleLength)
      .map((branch) => branch.level1Background);
    assert(JSON.stringify(colors) === JSON.stringify(expected), `${preset.id} palette must use the applied branch cycle`);
  }
  assert(JSON.stringify(preset) === snapshot, `${preset.id} was mutated while deriving preview colors`);
}

assert(editorSource.includes("presentation: 'palette'"), 'Theme panel is not opted into palette presentation');
assert(editorSource.includes('buildThemeChoiceOptions'), 'Theme panel is not wired to the shared dynamic theme choices');
assert(JSON.stringify(THEME_CHOICE_GROUPS) === JSON.stringify(['常用', '缤纷', '经典']), 'Theme group order mismatch');
assert(choiceOptions.some((option) => option.group === '常用' && option.value === favoriteId), 'Favorite theme is not projected into 常用');
assert(choiceOptions.filter((option) => option.group === '经典').length === 15, 'Former base themes are not merged before classic themes');
assert(choiceOptions.every((option) => (option.previewColors?.length ?? 0) >= 1), 'Theme preview colors are not wired from current presets');
assert(panelSource.includes('ymz-project-choice-panel__tabs'), 'Theme group tabs are missing');
assert(panelSource.includes('ymz-project-choice-panel__palette-grid'), 'Theme palette grid is missing');
assert(panelSource.includes('ymz-project-choice-panel__palette-block'), 'Theme palette blocks are missing');
assert(panelSource.includes('ymz-project-choice-panel__list'), 'Line-style list renderer was removed');
assert(/\.ymz-project-choice-panel\.is-palette[^}]*width:min\(390px/s.test(css), 'Theme palette panel width contract is missing');
assert(/\.ymz-project-choice-panel__palette-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s.test(css), 'Theme cards must use two columns');
assert(panelSource.includes("'--ymz-palette-count'"), 'Theme palette strip does not expose its actual color count');
assert(/\.ymz-project-choice-panel__palette-strip\{[^}]*grid-template-columns:repeat\(var\(--ymz-palette-count,6\),minmax\(0,1fr\)\)/s.test(css), 'Theme strips must size columns from the actual color count');

export default { presets: YEMIND_THEME_PRESETS.length, actualColorPalettes: true, listPanelPreserved: true };
