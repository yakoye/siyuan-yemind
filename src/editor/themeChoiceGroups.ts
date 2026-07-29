import { YEMIND_THEME_PRESETS } from '../core/themePresets';
import type { ProjectChoiceOption } from '../ui/projectChoicePanel';
import { themePaletteColors } from './themeChoicePresentation';

export const THEME_CHOICE_GROUPS = ['常用', '缤纷', '经典'] as const;

function toOption(preset: (typeof YEMIND_THEME_PRESETS)[number], group: string): ProjectChoiceOption {
  return {
    value: preset.id,
    label: preset.label,
    group,
    description: preset.description,
    previewColor: preset.light.colorAppearance.centerBackground,
    previewColors: themePaletteColors(preset),
  };
}

export function buildThemeChoiceOptions(favoriteThemeIds: readonly string[]): ProjectChoiceOption[] {
  const byId = new Map(YEMIND_THEME_PRESETS.map((preset) => [preset.id, preset]));
  const favorites = favoriteThemeIds
    .map((id) => byId.get(id))
    .filter((preset): preset is (typeof YEMIND_THEME_PRESETS)[number] => Boolean(preset))
    .map((preset) => toOption(preset, '常用'));
  const colorful = YEMIND_THEME_PRESETS
    .filter((preset) => preset.group === '缤纷')
    .map((preset) => toOption(preset, '缤纷'));
  const classic = [
    ...YEMIND_THEME_PRESETS.filter((preset) => preset.group === '基础'),
    ...YEMIND_THEME_PRESETS.filter((preset) => preset.group === '经典'),
  ].map((preset) => toOption(preset, '经典'));
  return [...favorites, ...colorful, ...classic];
}
