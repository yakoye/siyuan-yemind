import { YEMIND_THEME_COLOR_APPEARANCES } from './themeColorData';

export interface YeMindColorScheme {
  id: string;
  label: string;
  category: '缤纷' | '经典';
  colors: readonly string[];
  background: string;
  text: string;
}

export const YEMIND_COLOR_SCHEMES: readonly YeMindColorScheme[] = YEMIND_THEME_COLOR_APPEARANCES
  .filter((item) => item.appearance === 'fixed')
  .map((item) => ({
    id: item.presetId.replace(/^scheme-/, ''),
    label: item.name,
    category: item.category as '缤纷' | '经典',
    colors: item.branches
      .slice(0, item.cycleLength)
      .map((branch) => branch.centerToLevel1Line),
    background: item.background,
    text: item.centerText,
  }));

const SCHEME_MAP = new Map(YEMIND_COLOR_SCHEMES.map((scheme) => [scheme.id, scheme]));

export function normalizeColorSchemeId(value: unknown): string | null {
  return typeof value === 'string' && SCHEME_MAP.has(value) ? value : null;
}

export function getColorScheme(value: unknown): YeMindColorScheme | null {
  const id = normalizeColorSchemeId(value);
  return id ? SCHEME_MAP.get(id) ?? null : null;
}

export function rainbowSchemeOptionsHtml(selected: unknown): string {
  const value = normalizeColorSchemeId(selected) ?? 'rainbow';
  return YEMIND_COLOR_SCHEMES.map((scheme) => `<option value="${scheme.id}"${scheme.id === value ? ' selected' : ''}>${scheme.label}</option>`).join('');
}
