import {
  YEMIND_COLOR_SCHEMES,
  getColorScheme,
  getThemeColorDefinition,
  type YeMindThemeBranchColors,
  type YeMindThemeColorDefinition,
} from './colorSchemes';

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
  branchPalette: readonly YeMindThemeBranchColors[];
  nodeUseLineStyle?: boolean;
  lineWidth?: number;
  lineRadius?: number;
  lineDasharray?: string;
}

export interface YeMindThemePreset {
  id: string;
  colorSchemeId: string;
  label: string;
  description: string;
  group: '基础' | '缤纷' | '经典';
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

function branchAt(definition: YeMindThemeColorDefinition, index: number): YeMindThemeBranchColors {
  return definition.branches[index % Math.max(1, definition.cycleLength)] ?? definition.branches[0];
}

function themeVariant(schemeId: string, appearance: YeMindAppearance): ThemeVariant {
  const scheme = getColorScheme(schemeId)!;
  const definition = getThemeColorDefinition(schemeId, appearance)!;
  const first = branchAt(definition, 0);
  const isInk = schemeId === 'ink-branch';
  const isMaterial = schemeId === 'material-3-basic';
  const isDefault = schemeId === 'yemind-default';
  const radius = isInk ? 0 : isMaterial ? 16 : isDefault ? 10 : 10;
  const lineWidth = isInk ? 4 : isMaterial ? 2 : isDefault ? 2 : 2.4;
  return {
    backgroundColor: definition.background,
    lineColor: first.centerToLevel1Line,
    generalizationLineColor: first.level1ToLevel2Line,
    associativeLineColor: first.level2ToNormalLine,
    root: level(
      definition.centerBackground,
      definition.centerText,
      isDefault ? first.centerToLevel1Line : 'transparent',
      isDefault ? 2 : 0,
      radius,
      isInk ? 26 : isMaterial ? 16 : 25,
      '800',
    ),
    second: level(
      first.level1Background,
      first.level1Text,
      isDefault ? first.centerToLevel1Line : 'transparent',
      isDefault ? 2 : 0,
      radius,
      isInk ? 18 : isMaterial ? 15 : 18,
      '700',
    ),
    node: level(
      first.level2Background,
      first.level2Text,
      isDefault ? first.level1ToLevel2Line : 'transparent',
      isDefault ? 2 : 0,
      isInk ? 0 : isMaterial ? 16 : 8,
      14,
      isInk ? '600' : '400',
    ),
    rainbow: {
      open: scheme.category !== '基础',
      colorsList: definition.branches.map((branch) => branch.centerToLevel1Line),
    },
    branchPalette: definition.branches,
    nodeUseLineStyle: isInk,
    lineWidth,
    lineRadius: isInk ? 0 : isMaterial ? 16 : 16,
    lineDasharray: isMaterial ? '6,4' : 'none',
  };
}

const BASE_THEME_IDS = new Set(['yemind-default', 'ink-branch', 'material-3-basic']);

export const YEMIND_THEME_PRESETS: readonly YeMindThemePreset[] = YEMIND_COLOR_SCHEMES.map((scheme) => {
  const id = BASE_THEME_IDS.has(scheme.id) ? scheme.id : `scheme-${scheme.id}`;
  return {
    id,
    colorSchemeId: scheme.id,
    label: scheme.label,
    description: `${scheme.label}完整配色`,
    group: scheme.category,
    light: themeVariant(scheme.id, 'light'),
    dark: themeVariant(scheme.id, 'dark'),
  };
});

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
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
  colorSchemeId: string;
  themeConfig: Record<string, any>;
  rainbow: { open: boolean; colorsList: string[] };
  branchPalette: readonly YeMindThemeBranchColors[];
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
    colorSchemeId: preset.colorSchemeId,
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
      generalizationLineWidth: Math.max(1, (variant.lineWidth ?? 2) - .5),
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
    branchPalette: variant.branchPalette,
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
