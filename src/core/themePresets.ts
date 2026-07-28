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


function borderWidth(color: string): number {
  return color === 'transparent' ? 0 : 2;
}

function requiredAppearance(presetId: string, appearance: YeMindAppearance): ThemeColorAppearance {
  const item = getThemeColorAppearance(presetId, appearance);
  if (!item) throw new Error(`Missing theme color appearance: ${presetId}/${appearance}`);
  return item;
}

function mixHex(background: string, foreground: string, ratio: number): string {
  const channel = (value: string, offset: number) => Number.parseInt(value.slice(offset, offset + 2), 16);
  const mixed = [1, 3, 5].map((offset) => Math.round(
    channel(background, offset) * (1 - ratio) + channel(foreground, offset) * ratio,
  ));
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

const DARK_CANVAS = '#111318';

function darkFixedAppearance(input: ThemeColorAppearance): ThemeColorAppearance {
  const primary = input.branches[0]?.centerToLevel1Line ?? '#22C9A0';
  const centerSource = input.centerBackground === 'transparent' ? primary : input.centerBackground;
  return {
    ...input,
    id: `${input.presetId}-dark`,
    appearance: 'dark',
    background: DARK_CANVAS,
    centerText: '#F8FAFC',
    centerBackground: mixHex(DARK_CANVAS, centerSource, 0.55),
    centerBorder: input.centerBorder === 'transparent' ? primary : input.centerBorder,
    branches: input.branches.map((branch) => {
      const color = branch.centerToLevel1Line;
      return {
        ...branch,
        level1Text: '#F8FAFC',
        level1Background: mixHex(DARK_CANVAS, color, 0.28),
        level1Border: color,
        level2Text: '#E8EDF5',
        level2Background: mixHex(DARK_CANVAS, color, 0.18),
        level2Border: mixHex(DARK_CANVAS, color, 0.62),
        normalText: '#D8DFEA',
        normalBackground: mixHex(DARK_CANVAS, color, 0.09),
        normalBorder: mixHex(DARK_CANVAS, color, 0.4),
      };
    }),
  };
}

function baseColorAppearance(input: {
  presetId: string;
  name: string;
  appearance: YeMindAppearance;
  background: string;
  centerBackground: string;
  centerText: string;
  colors: readonly string[];
}): ThemeColorAppearance {
  const dark = input.appearance === 'dark';
  return {
    id: `${input.presetId}-${input.appearance}`,
    presetId: input.presetId,
    name: input.name,
    category: '基础',
    appearance: input.appearance,
    background: input.background,
    centerText: input.centerText,
    centerBackground: input.centerBackground,
    centerBorder: mixHex(input.centerBackground, input.colors[0], dark ? 0.72 : 0.5),
    cycleLength: 6,
    branches: input.colors.map((color) => ({
      centerToLevel1Line: color,
      level1Text: dark ? '#F8FAFC' : '#172033',
      level1Background: mixHex(input.background, color, dark ? 0.28 : 0.16),
      level1Border: color,
      level1ToLevel2Line: color,
      level2Text: dark ? '#E8EDF5' : '#263248',
      level2Background: mixHex(input.background, color, dark ? 0.2 : 0.1),
      level2Border: mixHex(input.background, color, dark ? 0.65 : 0.52),
      level2ToNormalLine: mixHex(input.background, color, dark ? 0.72 : 0.62),
      normalText: dark ? '#D8DFEA' : '#344158',
      normalBackground: mixHex(input.background, color, dark ? 0.13 : 0.055),
      normalBorder: mixHex(input.background, color, dark ? 0.48 : 0.35),
    })),
  };
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
      root: level(colors.centerBackground, colors.centerText, colors.centerBorder, borderWidth(colors.centerBorder), 10, 14, '400'),
      second: level(branch.level1Background, branch.level1Text, branch.level1Border, borderWidth(branch.level1Border), 10, 14, '400'),
      node: level(branch.level2Background, branch.level2Text, branch.level2Border, borderWidth(branch.level2Border), 10, 14, '400'),
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
      root: level(colors.centerBackground, colors.centerText, colors.centerBorder, borderWidth(colors.centerBorder), 0, 26, '800'),
      second: level(branch.level1Background, branch.level1Text, branch.level1Border, borderWidth(branch.level1Border), 0, 18, '700'),
      node: level(branch.level2Background, branch.level2Text, branch.level2Border, borderWidth(branch.level2Border), 0, 14, '600'),
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
      root: level(colors.centerBackground, colors.centerText, colors.centerBorder, borderWidth(colors.centerBorder), 16, 16, '700'),
      second: level(branch.level1Background, branch.level1Text, branch.level1Border, borderWidth(branch.level1Border), 16, 15, '600'),
      node: level(branch.level2Background, branch.level2Text, branch.level2Border, borderWidth(branch.level2Border), 16, 14, '450'),
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
    root: level(colors.centerBackground, colors.centerText, colors.centerBorder, borderWidth(colors.centerBorder), 0, 25, '800'),
    second: level(branch.level1Background, branch.level1Text, branch.level1Border, borderWidth(branch.level1Border), 10, 18, '700'),
    node: level(branch.level2Background, branch.level2Text, branch.level2Border, borderWidth(branch.level2Border), 8, 14, '400'),
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
    label: '墨枝',
    description: '粗线条极简分支',
    group: '基础',
    light: buildVariant(requiredAppearance('ink-branch', 'light'), 'ink'),
    dark: buildVariant(requiredAppearance('ink-branch', 'dark'), 'ink'),
  },
  {
    id: 'material-3-basic',
    label: '质感',
    description: '柔和圆角 Material 风格',
    group: '基础',
    light: buildVariant(requiredAppearance('material-3-basic', 'light'), 'material'),
    dark: buildVariant(requiredAppearance('material-3-basic', 'dark'), 'material'),
  },
  {
    id: 'aurora',
    label: '极光',
    description: '深空底色与极光渐变分支',
    group: '基础',
    light: buildVariant(baseColorAppearance({
      presetId: 'aurora', name: '极光', appearance: 'light',
      background: '#F2F5FF', centerBackground: '#18213B', centerText: '#F8FAFF',
      colors: ['#5B6CFF', '#7C4DFF', '#C34DFF', '#00A8E8', '#00C9A7', '#4FD1C5'],
    }), 'scheme'),
    dark: buildVariant(baseColorAppearance({
      presetId: 'aurora', name: '极光', appearance: 'dark',
      background: '#0E1220', centerBackground: '#19213A', centerText: '#F8FAFF',
      colors: ['#7D8CFF', '#9B73FF', '#D56AFF', '#35C4FF', '#26E0B4', '#6FE7DA'],
    }), 'scheme'),
  },
  {
    id: 'morning-mist',
    label: '晨雾',
    description: '低饱和雾蓝与清晨柔光',
    group: '基础',
    light: buildVariant(baseColorAppearance({
      presetId: 'morning-mist', name: '晨雾', appearance: 'light',
      background: '#F4F7F8', centerBackground: '#E6EEF0', centerText: '#263B42',
      colors: ['#6D9FA8', '#7BA6B2', '#91AAA6', '#A3A99B', '#8B96AC', '#A88F9E'],
    }), 'scheme'),
    dark: buildVariant(baseColorAppearance({
      presetId: 'morning-mist', name: '晨雾', appearance: 'dark',
      background: '#151B1D', centerBackground: '#273337', centerText: '#E8F1F3',
      colors: ['#79B5C0', '#83B8C6', '#9ABCB6', '#B5B9A9', '#9DA9C1', '#BAA0AE'],
    }), 'scheme'),
  },
  {
    id: 'dunes',
    label: '沙丘',
    description: '温暖砂岩与大地色分支',
    group: '基础',
    light: buildVariant(baseColorAppearance({
      presetId: 'dunes', name: '沙丘', appearance: 'light',
      background: '#FBF5E9', centerBackground: '#8A6042', centerText: '#FFF9EF',
      colors: ['#B77948', '#D39B5E', '#C4A66A', '#9F8C5D', '#B86F52', '#8A7356'],
    }), 'scheme'),
    dark: buildVariant(baseColorAppearance({
      presetId: 'dunes', name: '沙丘', appearance: 'dark',
      background: '#211A15', centerBackground: '#725039', centerText: '#FFF3DF',
      colors: ['#D4935F', '#E2AD70', '#D0B474', '#B4A06D', '#D18466', '#A88B69'],
    }), 'scheme'),
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
    dark: buildVariant(darkFixedAppearance(item), 'scheme'),
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
      associativeLineActiveWidth: 3,
      associativeLineActiveColor: '#2563eb',
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
