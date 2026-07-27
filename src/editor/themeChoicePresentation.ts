import type { YeMindThemePreset } from '../core/themePresets';

const isVisibleColor = (value: unknown): value is string =>
  typeof value === 'string'
  && value.trim() !== ''
  && value.toLowerCase() !== 'transparent';

function uniqueColors(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  return values.filter(isVisibleColor).filter((color) => {
    const key = color.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

/**
 * Returns only colors that the light appearance can actually apply.
 * Multi-branch themes retain their declared cycle order; one-branch classic
 * themes expose the meaningful canvas, root, line, fill and text colors.
 */
export function themePaletteColors(preset: YeMindThemePreset): readonly string[] {
  const appearance = preset.light.colorAppearance;
  const applied = appearance.branches.slice(0, appearance.cycleLength);
  if (appearance.cycleLength > 1) {
    return uniqueColors(applied.map((branch) => branch.level1Background));
  }
  return uniqueColors([
    appearance.background,
    appearance.centerText,
    ...applied.flatMap((branch) => [
      branch.centerToLevel1Line,
      branch.level1Background,
      branch.level1Text,
      branch.level2Background,
      branch.level2Text,
      branch.normalBackground,
      branch.normalText,
    ]),
  ]);
}
