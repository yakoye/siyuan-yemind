import {
  YEMIND_THEME_COLOR_APPEARANCES,
  getThemeColorAppearance,
  type ThemeColorAppearance,
  type ThemeColorCategory,
} from './themeColorData';

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
  colorAppearance: ThemeColorAppearance;
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
  group: ThemeColorCategory;
  light: ThemeVariant;
  dark: ThemeVariant;
}

const FONT_SANS = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

function level(
  fillColor: string,
  color: string,
  borderColor: string,
  borderWidth: number,
  borderRadius: number,
  fontSize: number,
  fontWeight: string,
): NodeLevelStyle {
  return { fillColor, color, borderColor, borderWidth, borderRadius, fontSize, fontWeight };
}

function requiredAppearance(presetId: string, appearance: YeMindAppearance): ThemeColorAppearance {
  const item = getThemeColorAppearance(presetId, appearance);
  if (!item) throw new Error(`Missing theme color appearance: ${presetId}/${appearance}`);
  return item;
}

function buildVariant(
  colors: ThemeColorAppearance,
  visual: 'default' | 'ink' | 'material' | 'scheme',
): ThemeVariant {
  const branch = colors.branches[0];
  const colorList = colors.branches
    .slice(0, colors.cycleLength)
    .map((item) => item.centerToLevel1Line);
  if (visual === 'default') {
    return {
      colorAppearance: colors,
      backgroundColor: colors.background,
      lineColor: branch.centerToLevel1Line,
      generalizationLineColor: branch.level1ToLevel2Line,
      associativeLineColor: '#F59E0B',
      root: level(colors.centerBackground, colors.centerText, colors.appearance === 'dark' ? '#64748B' : '#CBD5E1', 2, 10, 14, '400'),
      second: level(branch.level1Background, branch.level1Text, colors.appearance === 'dark' ? '#64748B' : '#CBD5E1', 2, 10, 14, '400'),
      node: level(branch.level2Background, branch.level2Text, colors.appearance === 'dark' ? '#64748B' : '#CBD5E1', 2, 10, 14, '400'),
      rainbow: { open: false, colorsList: colorList },
      lineWidth: 2,
      lineRadius: 10,
    };
  }
  if (visual === 'ink') {
    return {
      colorAppearance: colors,
      backgroundColor: colors.background,
      lineColor: branch.centerToLevel1Line,
      generalizationLineColor: branch.level1ToLevel2Line,
      associativeLineColor: colors.appearance === 'dark' ? '#A3A3A3' : '#737373',
      root: level(colors.centerBackground, colors.centerText, 'transparent', 0, 0, 26, '800'),
      second: level(branch.level1Background, branch.level1Text, 'transparent', 0, 0, 18, '700'),
      node: level(branch.level2Background, branch.level2Text, 'transparent', 0, 0, 14, '600'),
      rainbow: { open: false, colorsList: colorList },
      nodeUseLineStyle: true,
      lineWidth: 4,
      lineRadius: 0,
    };
  }
  if (visual === 'material') {
    return {
      colorAppearance: colors,
      backgroundColor: colors.background,
      lineColor: branch.centerToLevel1Line,
      generalizationLineColor: branch.level1ToLevel2Line,
      associativeLineColor: colors.appearance === 'dark' ? '#EFB8C8' : '#7D5260',
      root: level(colors.centerBackground, colors.centerText, 'transparent', 0, 16, 16, '700'),
      second: level(branch.level1Background, branch.level1Text, 'transparent', 0, 16, 15, '600'),
      node: level(branch.level2Background, branch.level2Text, 'transparent', 0, 16, 14, '450'),
      rainbow: { open: false, colorsList: colorList },
      lineWidth: 2,
      lineRadius: 16,
      lineDasharray: '6,4',
    };
  }
  return {
    colorAppearance: colors,
    backgroundColor: colors.background,
    lineColor: branch.centerToLevel1Line,
    generalizationLineColor: branch.level1ToLevel2Line,
    associativeLineColor: branch.centerToLevel1Line,
    root: level(colors.centerBackground, colors.centerText, 'transparent', 0, 0, 25, '800'),
    second: level(branch.level1Background, branch.level1Text, 'transparent', 0, 10, 18, '700'),
    node: level(branch.level2Background, branch.level2Text, 'transparent', 0, 8, 14, '400'),
    rainbow: { open: true, colorsList: colorList },
    lineWidth: 2.4,
    lineRadius: 16,
  };
}

const BASE_PRESETS: YeMindThemePreset[] = [
  {
    id: 'yemind-default',
    label: 'YeMind 默认',
    description: '清晰圆角与中性背景',
    group: '基础',
    light: buildVariant(requiredAppearance('yemind-default', 'light'), 'default'),
    dark: buildVariant(requiredAppearance('yemind-default', 'dark'), 'default'),
  },
  {
    id: 'ink-branch',
    label: 'Ink Branch',
    description: '粗线条极简分支',
    group: '基础',
    light: buildVariant(requiredAppearance('ink-branch', 'light'), 'ink'),
    dark: buildVariant(requiredAppearance('ink-branch', 'dark'), 'ink'),
  },
  {
    id: 'material-3-basic',
    label: 'Material 3 Basic',
    description: '柔和圆角 Material 风格',
    group: '基础',
    light: buildVariant(requiredAppearance('material-3-basic', 'light'), 'material'),
    dark: buildVariant(requiredAppearance('material-3-basic', 'dark'), 'material'),
  },
];

const COLOR_PRESETS: YeMindThemePreset[] = YEMIND_THEME_COLOR_APPEARANCES
  .filter((item) => item.appearance === 'fixed')
  .map((item) => ({
    id: item.presetId,
    label: item.name,
    description: `${item.name}主题`,
    group: item.category,
    light: buildVariant(item, 'scheme'),
    dark: buildVariant(item, 'scheme'),
  }));

export const YEMIND_THEME_PRESETS: readonly YeMindThemePreset[] = [
  ...BASE_PRESETS,
  ...COLOR_PRESETS,
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

export function normalizeLineStyle(value: unknown): YeMindLineStyle {
  return typeof value === 'string' && LINE_STYLES.has(value as YeMindLineStyle)
    ? value as YeMindLineStyle
    : 'curve';
}

export function detectAppearance(
  root: Element | null = typeof document === 'undefined' ? null : document.documentElement,
): YeMindAppearance {
  const candidates = root
    ? [root, ...(typeof document !== 'undefined' && root === document.documentElement && document.body ? [document.body] : [])]
    : [];
  for (const candidate of candidates) {
    const element = candidate as HTMLElement;
    const values = [
      element.dataset.themeMode,
      element.dataset.theme,
      element.getAttribute('data-color-mode'),
      element.getAttribute('data-theme-mode'),
      element.className,
    ].filter(Boolean).join(' ').toLowerCase();
    if (/(^|\s|[-_])(dark|midnight)(\s|$|[-_])/.test(` ${values} `)) return 'dark';
    if (/(^|\s|[-_])light(\s|$|[-_])/.test(` ${values} `)) return 'light';
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function cloneLevel(style: NodeLevelStyle, marginX: number, marginY: number): Record<string, unknown> {
  return {
    shape: 'rectangle',
    fillColor: style.fillColor,
    fontFamily: FONT_SANS,
    color: style.color,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: 'normal',
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    borderDasharray: 'none',
    borderRadius: style.borderRadius,
    textDecoration: 'none',
    textAlign: 'left',
    marginX,
    marginY,
  };
}

export function buildThemeConfig(options: {
  presetId: unknown;
  appearance: YeMindAppearance;
  lineStyle: unknown;
  spacingConfig?: Record<string, any>;
}): {
  presetId: string;
  themeConfig: Record<string, any>;
  rainbow: { open: boolean; colorsList: string[] };
  colorAppearance: ThemeColorAppearance;
} {
  const presetId = normalizeThemePresetId(options.presetId);
  const preset = YEMIND_THEME_PRESETS.find((item) => item.id === presetId) ?? YEMIND_THEME_PRESETS[0];
  const variant = options.appearance === 'dark' ? preset.dark : preset.light;
  const spacing = options.spacingConfig ?? {};
  const lineStyle = normalizeLineStyle(options.lineStyle);
  const root = { ...cloneLevel(variant.root, 0, 0), ...(spacing.root ?? {}) };
  if (presetId === 'ink-branch') root.fontFamily = FONT_MONO;
  const second = { ...cloneLevel(variant.second, 100, 38), ...(spacing.second ?? {}) };
  const node = { ...cloneLevel(variant.node, 54, 12), ...(spacing.node ?? {}) };
  const generalization = {
    ...cloneLevel(variant.second, 80, 30),
    fillColor: variant.second.fillColor,
    ...(spacing.generalization ?? {}),
  };
  return {
    presetId,
    colorAppearance: variant.colorAppearance,
    themeConfig: {
      paddingX: 12,
      paddingY: 7,
      lineWidth: variant.lineWidth ?? 2,
      lineColor: variant.lineColor,
      lineDasharray: variant.lineDasharray ?? 'none',
      lineStyle,
      rootLineKeepSameInCurve: true,
      rootLineStartPositionKeepSameInCurve: false,
      lineRadius: variant.lineRadius ?? 10,
      generalizationLineWidth: Math.max(1, (variant.lineWidth ?? 2) - 0.5),
      generalizationLineColor: variant.generalizationLineColor,
      associativeLineWidth: 2,
      associativeLineColor: variant.associativeLineColor,
      associativeLineActiveWidth: 6,
      associativeLineActiveColor: variant.root.color,
      associativeLineTextColor: variant.node.color,
      backgroundColor: variant.backgroundColor,
      nodeUseLineStyle: Boolean(variant.nodeUseLineStyle),
      root,
      second,
      node,
      generalization,
    },
    rainbow: { open: variant.rainbow.open, colorsList: [...variant.rainbow.colorsList] },
  };
}

export function themeOptionsHtml(selected: unknown): string {
  const value = normalizeThemePresetId(selected);
  return (['基础', '缤纷', '经典'] as const)
    .map((group) => `<optgroup label="${group}">${YEMIND_THEME_PRESETS
      .filter((preset) => preset.group === group)
      .map((preset) => `<option value="${preset.id}"${preset.id === value ? ' selected' : ''}>${preset.label}</option>`)
      .join('')}</optgroup>`)
    .join('');
}
