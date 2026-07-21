export interface YeMindColorScheme {
  id: string;
  label: string;
  colors: readonly string[];
  background: string;
  darkBackground?: string;
  text?: string;
  darkText?: string;
}

export const YEMIND_COLOR_SCHEMES: readonly YeMindColorScheme[] = [
  { id: 'dawn', label: '晨曦', colors: ['#ff6b6b', '#ff9f68', '#a8d4bd', '#8edbd7', '#62c8e5', '#d07ae8'], background: '#ffffff', text: '#172033' },
  { id: 'rainbow', label: '彩虹', colors: ['#f04444', '#f39a43', '#e8c600', '#81c995', '#62d2c9', '#60bde7', '#5261d8', '#d075e4'], background: '#ffffff', text: '#172033' },
  { id: 'vitality', label: '活力', colors: ['#ffffff', '#f4f4f4', '#ff2d1a', '#f5c400', '#2f45dc', '#070707'], background: '#ffffff', text: '#111111' },
  { id: 'dance', label: '舞动', colors: ['#4f5ee6', '#eb4660', '#ffffff', '#fff8e7', '#bd1021', '#3a3123'], background: '#ffffff', text: '#161a2b' },
  { id: 'code', label: '代码', colors: ['#fff0b0', '#c8ffb1', '#ffffff', '#cf7df0', '#84b4f0', '#3e4349'], background: '#2c2d30', darkBackground: '#2c2d30', text: '#17191d', darkText: '#f5f7fa' },
  { id: 'harmony', label: '和风', colors: ['#ffffff', '#ffb3b3', '#ff7a36', '#84a9f6', '#544fd4', '#25217b'], background: '#ffffff', text: '#1f2548' },
  { id: 'island', label: '岛屿', colors: ['#ffe9d8', '#dec2ad', '#c59477', '#c7c5b5', '#abae98', '#737865'], background: '#ffe8d6', text: '#4b463f' },
  { id: 'rose', label: '玫瑰', colors: ['#fff0f3', '#ffd0da', '#ffa8bb', '#ff6d8c', '#d5104d', '#a90b3f'], background: '#fff0f3', text: '#8f2344' },
  { id: 'mint', label: '薄荷', colors: ['#ffffff', '#d8faf7', '#a5edf0', '#76d9de', '#23b6b2', '#007e78'], background: '#ffffff', text: '#086d6b' },
  { id: 'green-tea', label: '绿茶', colors: ['#d9d6c3', '#bfb89a', '#66a272', '#687f59', '#416449', '#203a26'], background: '#1f2b1d', darkBackground: '#1f2b1d', text: '#1d2a1d', darkText: '#f1f2df' },
] as const;

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
