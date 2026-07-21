import { YEMIND_COLOR_SCHEMES, getColorScheme } from './colorSchemes';

export type YeMindAppearance = 'light' | 'dark';
export type YeMindLineStyle = 'curve' | 'straight' | 'direct';

interface NodeLevelStyle {
  fillColor: string;
  color: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  fontSize: number;
  fontWeight: string;
}

interface ThemeVariant {
  backgroundColor: string;
  lineColor: string;
  generalizationLineColor: string;
  associativeLineColor: string;
  root: NodeLevelStyle;
  second: NodeLevelStyle;
  node: NodeLevelStyle;
  rainbow: { open: boolean; colorsList: string[] };
  nodeUseLineStyle?: boolean;
  lineWidth?: number;
  lineRadius?: number;
  lineDasharray?: string;
}

export interface YeMindThemePreset {
  id: string;
  label: string;
  description: string;
  group: '基础' | '配色方案';
  light: ThemeVariant;
  dark: ThemeVariant;
}

const FONT_SANS = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
const RAINBOW = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

function level(fillColor: string, color: string, borderColor: string, borderWidth: number, borderRadius: number, fontSize: number, fontWeight: string): NodeLevelStyle {
  return { fillColor, color, borderColor, borderWidth, borderRadius, fontSize, fontWeight };
}

const defaultLight: ThemeVariant = {
  backgroundColor: '#f8fafc', lineColor: '#94a3b8', generalizationLineColor: '#94a3b8', associativeLineColor: '#f59e0b',
  root: level('#ffffff', '#0f172a', '#cbd5e1', 2, 10, 14, '400'),
  second: level('#ffffff', '#0f172a', '#cbd5e1', 2, 10, 14, '400'),
  node: level('#ffffff', '#0f172a', '#cbd5e1', 2, 10, 14, '400'),
  rainbow: { open: false, colorsList: RAINBOW }, lineWidth: 2, lineRadius: 10,
};
const defaultDark: ThemeVariant = {
  backgroundColor: '#0b1220', lineColor: 'rgba(148,163,184,.62)', generalizationLineColor: 'rgba(148,163,184,.72)', associativeLineColor: '#f59e0b',
  root: level('#0b1220', '#e2e8f0', 'rgba(148,163,184,.45)', 2, 10, 14, '400'),
  second: level('#0b1220', '#e2e8f0', 'rgba(148,163,184,.45)', 2, 10, 14, '400'),
  node: level('#0b1220', '#e2e8f0', 'rgba(148,163,184,.45)', 2, 10, 14, '400'),
  rainbow: { open: false, colorsList: RAINBOW }, lineWidth: 2, lineRadius: 10,
};
const inkLight: ThemeVariant = {
  backgroundColor: '#ffffff', lineColor: '#151515', generalizationLineColor: '#151515', associativeLineColor: '#737373',
  root: level('transparent', '#3749b5', 'transparent', 0, 0, 26, '800'), second: level('transparent', '#111111', 'transparent', 0, 0, 18, '700'), node: level('transparent', '#111111', 'transparent', 0, 0, 14, '600'),
  rainbow: { open: false, colorsList: ['#151515', '#3749b5', '#525252', '#737373'] }, nodeUseLineStyle: true, lineWidth: 4, lineRadius: 0,
};
const inkDark: ThemeVariant = {
  backgroundColor: '#0a0a0a', lineColor: '#f5f5f5', generalizationLineColor: '#f5f5f5', associativeLineColor: '#a3a3a3',
  root: level('transparent', '#93a4ff', 'transparent', 0, 0, 26, '800'), second: level('transparent', '#f5f5f5', 'transparent', 0, 0, 18, '700'), node: level('transparent', '#f5f5f5', 'transparent', 0, 0, 14, '600'),
  rainbow: { open: false, colorsList: ['#f5f5f5', '#93a4ff', '#d4d4d4', '#a3a3a3'] }, nodeUseLineStyle: true, lineWidth: 4, lineRadius: 0,
};
const materialLight: ThemeVariant = {
  backgroundColor: '#fef7ff', lineColor: '#79747e', generalizationLineColor: '#cac4d0', associativeLineColor: '#7d5260',
  root: level('#eaddff', '#21005d', 'transparent', 0, 16, 16, '700'), second: level('#e8def8', '#1d192b', 'transparent', 0, 16, 15, '600'), node: level('#f3edf7', '#1c1b1f', 'transparent', 0, 16, 14, '450'),
  rainbow: { open: false, colorsList: ['#6750a4', '#7d5260', '#00639a', '#386a20', '#984061', '#006a60'] }, lineWidth: 2, lineRadius: 16, lineDasharray: '6,4',
};
const materialDark: ThemeVariant = {
  backgroundColor: '#141218', lineColor: '#938f99', generalizationLineColor: '#49454f', associativeLineColor: '#efb8c8',
  root: level('#4f378b', '#fef7ff', 'transparent', 0, 16, 16, '700'), second: level('#332d41', '#e6e1e5', 'transparent', 0, 16, 15, '600'), node: level('#211f26', '#e6e1e5', 'transparent', 0, 16, 14, '450'),
  rainbow: { open: false, colorsList: ['#d0bcff', '#efb8c8', '#92ccff', '#9bd67d', '#ffb0c8', '#82d5c9'] }, lineWidth: 2, lineRadius: 16, lineDasharray: '6,4',
};

function contrastText(color: string): string {
  const hex = color.replace('#', '');
  const r = Number.parseInt(hex.slice(0, 2), 16); const g = Number.parseInt(hex.slice(2, 4), 16); const b = Number.parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#141414' : '#ffffff';
}

function schemeVariant(id: string, appearance: YeMindAppearance): ThemeVariant {
  const scheme = getColorScheme(id)!;
  const background = appearance === 'dark' ? (scheme.darkBackground ?? scheme.background) : scheme.background;
  const colors = [...scheme.colors];
  const strong = colors[Math.min(colors.length - 1, 4)];
  const medium = colors[Math.min(colors.length - 1, 2)];
  const light = colors[Math.min(colors.length - 1, 1)];
  const rootText = appearance === 'dark' ? (scheme.darkText ?? '#f5f5f5') : (scheme.text ?? '#202020');
  return {
    backgroundColor: background,
    lineColor: strong,
    generalizationLineColor: medium,
    associativeLineColor: colors[0],
    root: level('transparent', rootText, 'transparent', 0, 0, 25, '800'),
    second: level(strong, contrastText(strong), 'transparent', 0, 10, 18, '700'),
    node: level(light, contrastText(light), 'transparent', 0, 8, 14, '400'),
    rainbow: { open: true, colorsList: colors },
    lineWidth: 2.4,
    lineRadius: 16,
  };
}

const BASE_PRESETS: YeMindThemePreset[] = [
  { id: 'yemind-default', label: 'YeMind 默认', description: '清晰圆角与中性背景', group: '基础', light: defaultLight, dark: defaultDark },
  { id: 'ink-branch', label: 'Ink Branch', description: '粗线条极简分支', group: '基础', light: inkLight, dark: inkDark },
  { id: 'material-3-basic', label: 'Material 3 Basic', description: '柔和圆角 Material 风格', group: '基础', light: materialLight, dark: materialDark },
];

export const YEMIND_THEME_PRESETS: readonly YeMindThemePreset[] = [
  ...BASE_PRESETS,
  ...YEMIND_COLOR_SCHEMES.map((scheme) => ({
    id: `scheme-${scheme.id}`,
    label: scheme.label,
    description: `${scheme.label}配色方案`,
    group: '配色方案' as const,
    light: schemeVariant(scheme.id, 'light'),
    dark: schemeVariant(scheme.id, 'dark'),
  })),
] as const;

const THEME_IDS = new Set(YEMIND_THEME_PRESETS.map((item) => item.id));
const LEGACY_THEME_ALIASES: Record<string, string> = {
  default: 'yemind-default',
  'kmind-default': 'yemind-default',
  'kmind-baseline-fork-ink': 'ink-branch',
  'kmind-material-3': 'material-3-basic',
  'kmind-material-3-slate': 'yemind-default',
  'kmind-candy-pop': 'scheme-rainbow',
  'kmind-material-3-rounded-orthogonal-ocean': 'scheme-mint',
  'kmind-material-3-rounded-orthogonal-forest': 'scheme-green-tea',
  'kmind-material-3-rounded-orthogonal-citrus': 'scheme-dawn',
  'kmind-material-3-rounded-orthogonal-rose': 'scheme-rose',
  'kmind-material-3-rounded-orthogonal-violet': 'scheme-dance',
  'kmind-material-3-rounded-orthogonal-aqua': 'scheme-mint',
  'kmind-midnight-neon': 'scheme-code',
  'kmind-rainbow-breeze': 'scheme-rainbow',
};
const LINE_STYLES = new Set<YeMindLineStyle>(['curve', 'straight', 'direct']);

export function normalizeThemePresetId(value: unknown): string {
  if (typeof value === 'string' && LEGACY_THEME_ALIASES[value]) return LEGACY_THEME_ALIASES[value];
  return typeof value === 'string' && THEME_IDS.has(value) ? value : 'yemind-default';
}
export function normalizeLineStyle(value: unknown): YeMindLineStyle { return typeof value === 'string' && LINE_STYLES.has(value as YeMindLineStyle) ? value as YeMindLineStyle : 'curve'; }
export function detectAppearance(root: Element | null = typeof document === 'undefined' ? null : document.documentElement): YeMindAppearance {
  const candidates = root ? [root, ...(typeof document !== 'undefined' && root === document.documentElement && document.body ? [document.body] : [])] : [];
  for (const candidate of candidates) {
    const element = candidate as HTMLElement;
    const values = [element.dataset.themeMode, element.dataset.theme, element.getAttribute('data-color-mode'), element.getAttribute('data-theme-mode'), element.className].filter(Boolean).join(' ').toLowerCase();
    if (/(^|\s|[-_])(dark|midnight)(\s|$|[-_])/.test(` ${values} `)) return 'dark';
    if (/(^|\s|[-_])light(\s|$|[-_])/.test(` ${values} `)) return 'light';
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function cloneLevel(style: NodeLevelStyle, marginX: number, marginY: number): Record<string, unknown> {
  return { shape: 'rectangle', fillColor: style.fillColor, fontFamily: FONT_SANS, color: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight, fontStyle: 'normal', borderColor: style.borderColor, borderWidth: style.borderWidth, borderDasharray: 'none', borderRadius: style.borderRadius, textDecoration: 'none', textAlign: 'left', marginX, marginY };
}
export function buildThemeConfig(options: { presetId: unknown; appearance: YeMindAppearance; lineStyle: unknown; spacingConfig?: Record<string, any> }): { presetId: string; themeConfig: Record<string, any>; rainbow: { open: boolean; colorsList: string[] } } {
  const presetId = normalizeThemePresetId(options.presetId);
  const preset = YEMIND_THEME_PRESETS.find((item) => item.id === presetId) ?? YEMIND_THEME_PRESETS[0];
  const variant = options.appearance === 'dark' ? preset.dark : preset.light;
  const spacing = options.spacingConfig ?? {}; const lineStyle = normalizeLineStyle(options.lineStyle);
  const root = { ...cloneLevel(variant.root, 0, 0), ...(spacing.root ?? {}) };
  if (presetId === 'ink-branch') root.fontFamily = FONT_MONO;
  const second = { ...cloneLevel(variant.second, 100, 38), ...(spacing.second ?? {}) };
  const node = { ...cloneLevel(variant.node, 54, 12), ...(spacing.node ?? {}) };
  const generalization = { ...cloneLevel(variant.second, 80, 30), fillColor: variant.second.fillColor, ...(spacing.generalization ?? {}) };
  return { presetId, themeConfig: { paddingX: 12, paddingY: 7, lineWidth: variant.lineWidth ?? 2, lineColor: variant.lineColor, lineDasharray: variant.lineDasharray ?? 'none', lineStyle, rootLineKeepSameInCurve: true, rootLineStartPositionKeepSameInCurve: false, lineRadius: variant.lineRadius ?? 10, generalizationLineWidth: Math.max(1, (variant.lineWidth ?? 2) - .5), generalizationLineColor: variant.generalizationLineColor, associativeLineWidth: 2, associativeLineColor: variant.associativeLineColor, associativeLineActiveWidth: 6, associativeLineActiveColor: variant.root.color, associativeLineTextColor: variant.node.color, backgroundColor: variant.backgroundColor, nodeUseLineStyle: Boolean(variant.nodeUseLineStyle), root, second, node, generalization }, rainbow: { open: variant.rainbow.open, colorsList: [...variant.rainbow.colorsList] } };
}
export function themeOptionsHtml(selected: unknown): string {
  const value = normalizeThemePresetId(selected);
  return (['基础', '配色方案'] as const).map((group) => `<optgroup label="${group}">${YEMIND_THEME_PRESETS.filter((preset) => preset.group === group).map((preset) => `<option value="${preset.id}"${preset.id === value ? ' selected' : ''}>${preset.label}</option>`).join('')}</optgroup>`).join('');
}
