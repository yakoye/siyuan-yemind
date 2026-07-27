import type { YeMindThemePreset } from '../core/themePresets';

const THEME_PREVIEW_COLOR_COUNT = 6;

/**
 * Returns the six existing first-level branch colors used by the theme picker.
 * The preset is never mutated. Current YeMind themes already provide six branch
 * entries; the fallback only protects future partial custom presets.
 */
export function themePaletteColors(preset: YeMindThemePreset): readonly string[] {
  const source = preset.light.colorAppearance.branches
    .slice(0, THEME_PREVIEW_COLOR_COUNT)
    .map((branch) => branch.level1Background);
  const fallback = source[source.length - 1]
    ?? preset.light.colorAppearance.centerBackground
    ?? preset.light.colorAppearance.background;
  while (source.length < THEME_PREVIEW_COLOR_COUNT) source.push(fallback);
  return source;
}
