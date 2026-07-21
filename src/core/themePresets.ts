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
  rainbow: {
    open: boolean;
    colorsList: string[];
  };
  nodeUseLineStyle?: boolean;
  lineWidth?: number;
  lineRadius?: number;
  lineDasharray?: string;
}

export interface YeMindThemePreset {
  id: string;
  label: string;
  description: string;
  light: ThemeVariant;
  dark: ThemeVariant;
}

const FONT_SANS = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
const RAINBOW = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

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

const defaultLight: ThemeVariant = {
  backgroundColor: '#f8fafc',
  lineColor: '#94a3b8',
  generalizationLineColor: '#94a3b8',
  associativeLineColor: '#f59e0b',
  root: level('#ffffff', '#0f172a', '#cbd5e1', 2, 10, 14, '400'),
  second: level('#ffffff', '#0f172a', '#cbd5e1', 2, 10, 14, '400'),
  node: level('#ffffff', '#0f172a', '#cbd5e1', 2, 10, 14, '400'),
  rainbow: { open: false, colorsList: RAINBOW },
  lineWidth: 2,
  lineRadius: 10,
};

const defaultDark: ThemeVariant = {
  backgroundColor: '#0b1220',
  lineColor: 'rgba(148, 163, 184, 0.62)',
  generalizationLineColor: 'rgba(148, 163, 184, 0.72)',
  associativeLineColor: '#f59e0b',
  root: level('#0b1220', '#e2e8f0', 'rgba(148,163,184,.45)', 2, 10, 14, '400'),
  second: level('#0b1220', '#e2e8f0', 'rgba(148,163,184,.45)', 2, 10, 14, '400'),
  node: level('#0b1220', '#e2e8f0', 'rgba(148,163,184,.45)', 2, 10, 14, '400'),
  rainbow: { open: false, colorsList: RAINBOW },
  lineWidth: 2,
  lineRadius: 10,
};

function materialVariant(accent: string, rootFill: string, depthFill: string, backgroundColor: string, dark = false): ThemeVariant {
  const text = dark ? '#fef7ff' : '#1d1b20';
  const nodeFill = dark ? '#211f26' : '#fffbfe';
  return {
    backgroundColor,
    lineColor: accent,
    generalizationLineColor: accent,
    associativeLineColor: dark ? '#f2b8b5' : '#ba1a1a',
    root: level(rootFill, dark ? '#fef7ff' : '#ffffff', 'transparent', 0, 16, 24, '700'),
    second: level(depthFill, text, 'transparent', 0, 16, 18, '600'),
    node: level(nodeFill, text, 'transparent', 0, 14, 14, '400'),
    rainbow: { open: false, colorsList: [accent, '#0ea5e9', '#14b8a6', '#22c55e', '#f59e0b', '#fb7185', '#a78bfa'] },
    lineWidth: 2,
    lineRadius: 14,
  };
}

const inkLight: ThemeVariant = {
  backgroundColor: '#ffffff',
  lineColor: '#151515',
  generalizationLineColor: '#151515',
  associativeLineColor: '#737373',
  root: { ...level('transparent', '#3749b5', 'transparent', 0, 0, 26, '800') },
  second: level('transparent', '#111111', 'transparent', 0, 0, 18, '700'),
  node: level('transparent', '#111111', 'transparent', 0, 0, 14, '600'),
  rainbow: { open: false, colorsList: ['#151515', '#3749b5', '#525252', '#737373'] },
  nodeUseLineStyle: true,
  lineWidth: 4,
  lineRadius: 0,
};

const inkDark: ThemeVariant = {
  backgroundColor: '#0a0a0a',
  lineColor: '#f5f5f5',
  generalizationLineColor: '#f5f5f5',
  associativeLineColor: '#a3a3a3',
  root: level('transparent', '#93a4ff', 'transparent', 0, 0, 26, '800'),
  second: level('transparent', '#f5f5f5', 'transparent', 0, 0, 18, '700'),
  node: level('transparent', '#f5f5f5', 'transparent', 0, 0, 14, '600'),
  rainbow: { open: false, colorsList: ['#f5f5f5', '#93a4ff', '#d4d4d4', '#a3a3a3'] },
  nodeUseLineStyle: true,
  lineWidth: 4,
  lineRadius: 0,
};

const slateLight: ThemeVariant = {
  backgroundColor: '#f5f7fb',
  lineColor: '#475569',
  generalizationLineColor: '#64748b',
  associativeLineColor: '#2563eb',
  root: level('#303745', '#f8fafc', 'transparent', 0, 16, 24, '700'),
  second: level('#e8ecf3', '#1e293b', 'transparent', 0, 16, 18, '600'),
  node: level('#ffffff', '#334155', '#d8dee9', 1, 14, 14, '400'),
  rainbow: { open: false, colorsList: ['#303745', '#1b5fa7', '#0ea5e9', '#14b8a6', '#22c55e', '#f59e0b', '#fb7185', '#a78bfa'] },
  lineWidth: 2,
  lineRadius: 14,
};

const slateDark: ThemeVariant = {
  backgroundColor: '#0e1219',
  lineColor: '#c5cad4',
  generalizationLineColor: '#9aa3b2',
  associativeLineColor: '#8bb4ff',
  root: level('#303745', '#f6f7fb', 'transparent', 0, 16, 24, '700'),
  second: level('#242b37', '#e6e9ef', 'transparent', 0, 16, 18, '600'),
  node: level('#1a2435', '#dce3f3', '#303745', 1, 14, 14, '400'),
  rainbow: { open: false, colorsList: ['#303745', '#1b5fa7', '#0ea5e9', '#14b8a6', '#22c55e', '#f59e0b', '#fb7185', '#a78bfa'] },
  lineWidth: 2,
  lineRadius: 14,
};

const materialBasicLight: ThemeVariant = {
  backgroundColor: '#fef7ff',
  lineColor: '#79747e',
  generalizationLineColor: '#cac4d0',
  associativeLineColor: '#7d5260',
  root: level('#eaddff', '#21005d', 'transparent', 0, 16, 16, '700'),
  second: level('#e8def8', '#1d192b', 'transparent', 0, 16, 15, '600'),
  node: level('#f3edf7', '#1c1b1f', 'transparent', 0, 16, 14, '450'),
  rainbow: { open: false, colorsList: ['#6750a4', '#7d5260', '#00639a', '#386a20', '#984061', '#006a60'] },
  lineWidth: 2,
  lineRadius: 16,
  lineDasharray: '6,4',
};

const materialBasicDark: ThemeVariant = {
  backgroundColor: '#141218',
  lineColor: '#938f99',
  generalizationLineColor: '#49454f',
  associativeLineColor: '#efb8c8',
  root: level('#4f378b', '#fef7ff', 'transparent', 0, 16, 16, '700'),
  second: level('#332d41', '#e6e1e5', 'transparent', 0, 16, 15, '600'),
  node: level('#211f26', '#e6e1e5', 'transparent', 0, 16, 14, '450'),
  rainbow: { open: false, colorsList: ['#d0bcff', '#efb8c8', '#92ccff', '#9bd67d', '#ffb0c8', '#82d5c9'] },
  lineWidth: 2,
  lineRadius: 16,
  lineDasharray: '6,4',
};

const candyLight: ThemeVariant = {
  backgroundColor: '#fff1f2',
  lineColor: '#7c3aed',
  generalizationLineColor: 'rgba(124, 58, 237, 0.55)',
  associativeLineColor: '#0ea5e9',
  root: level('#ffffff', '#111827', '#ec4899', 2.5, 999, 22, '800'),
  second: level('#ffffff', '#111827', '#ec4899', 2.5, 999, 17, '650'),
  node: level('#ffffff', '#111827', '#f9a8d4', 2, 999, 14, '450'),
  rainbow: { open: false, colorsList: ['#ec4899', '#7c3aed', '#0ea5e9', '#14b8a6', '#f97316', '#eab308'] },
  lineWidth: 2.5,
  lineRadius: 18,
};

const candyDark: ThemeVariant = {
  backgroundColor: '#0b1020',
  lineColor: '#a78bfa',
  generalizationLineColor: 'rgba(167, 139, 250, 0.55)',
  associativeLineColor: '#38bdf8',
  root: level('#0f172a', '#e5e7eb', '#fb7185', 2.5, 999, 22, '800'),
  second: level('#0f172a', '#e5e7eb', '#a78bfa', 2.5, 999, 17, '650'),
  node: level('#111827', '#e5e7eb', '#64748b', 2, 999, 14, '450'),
  rainbow: { open: false, colorsList: ['#fb7185', '#a78bfa', '#38bdf8', '#2dd4bf', '#fb923c', '#facc15'] },
  lineWidth: 2.5,
  lineRadius: 18,
};

const neon: ThemeVariant = {
  backgroundColor: '#070a14',
  lineColor: '#a855f7',
  generalizationLineColor: 'rgba(168,85,247,.72)',
  associativeLineColor: '#f59e0b',
  root: level('#0b1020', '#e2e8f0', '#22c55e', 3, 14, 24, '800'),
  second: level('#0b1020', '#e2e8f0', '#a855f7', 2.5, 14, 18, '600'),
  node: level('#0b1020', '#e2e8f0', '#38bdf8', 1.5, 12, 14, '400'),
  rainbow: { open: true, colorsList: RAINBOW },
  lineWidth: 4,
  lineRadius: 16,
};

const rainbowLight: ThemeVariant = {
  backgroundColor: '#f8fafc',
  lineColor: '#0ea5e9',
  generalizationLineColor: 'rgba(14,165,233,.55)',
  associativeLineColor: '#fb7185',
  root: level('#e53935', '#ffffff', 'transparent', 0, 16, 24, '800'),
  second: level('#ffffff', '#0f172a', '#0ea5e9', 2.5, 16, 18, '700'),
  node: level('#ffffff', '#0f172a', '#bae6fd', 1.5, 14, 14, '400'),
  rainbow: { open: true, colorsList: ['#fb7185', '#f97316', '#fbbf24', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'] },
  lineWidth: 3,
  lineRadius: 16,
};

const rainbowDark: ThemeVariant = {
  backgroundColor: '#0b1020',
  lineColor: '#38bdf8',
  generalizationLineColor: 'rgba(56,189,248,.62)',
  associativeLineColor: '#fb7185',
  root: level('#b91c1c', '#ffffff', 'transparent', 0, 16, 24, '800'),
  second: level('#0f172a', '#e2e8f0', '#38bdf8', 2.5, 16, 18, '700'),
  node: level('#0f172a', '#e2e8f0', '#1e3a5f', 1.5, 14, 14, '400'),
  rainbow: { open: true, colorsList: ['#fb7185', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'] },
  lineWidth: 3,
  lineRadius: 16,
};

export const YEMIND_THEME_PRESETS: readonly YeMindThemePreset[] = [
  { id: 'kmind-default', label: 'KMind 默认', description: '官方默认的清晰圆角风格', light: defaultLight, dark: defaultDark },
  { id: 'kmind-material-3-slate', label: 'KMind Slate', description: '克制的石板灰专业风格', light: slateLight, dark: slateDark },
  { id: 'kmind-material-3', label: 'Material 3 Basic', description: '官方 Material 3 基础主题', light: materialBasicLight, dark: materialBasicDark },
  { id: 'kmind-candy-pop', label: 'Candy Pop', description: '糖果色胶囊节点和彩虹分支', light: candyLight, dark: candyDark },
  { id: 'kmind-material-3-rounded-orthogonal-ocean', label: 'Material Ocean', description: '海洋蓝 Material 3', light: materialVariant('#00639a', '#00639a', '#d0e4ff', '#f8f9ff'), dark: materialVariant('#92ccff', '#004a75', '#12344c', '#0d141b', true) },
  { id: 'kmind-material-3-rounded-orthogonal-forest', label: 'Material Forest', description: '森林绿 Material 3', light: materialVariant('#386a20', '#386a20', '#d6e8c9', '#f8fbf4'), dark: materialVariant('#9bd67d', '#205107', '#263d22', '#10170f', true) },
  { id: 'kmind-material-3-rounded-orthogonal-citrus', label: 'Material Citrus', description: '柑橘色 Material 3', light: materialVariant('#8f4c00', '#8f4c00', '#ffddb5', '#fff8f1'), dark: materialVariant('#ffb86c', '#6b3b00', '#4a2a00', '#1a120b', true) },
  { id: 'kmind-material-3-rounded-orthogonal-rose', label: 'Material Rose', description: '玫瑰色 Material 3', light: materialVariant('#984061', '#984061', '#ffd9e2', '#fff8f8'), dark: materialVariant('#ffb0c8', '#7b2949', '#492532', '#1a1115', true) },
  { id: 'kmind-material-3-rounded-orthogonal-violet', label: 'Material Violet', description: '紫罗兰 Material 3', light: materialVariant('#6750a4', '#6750a4', '#eaddff', '#fffbfe'), dark: materialVariant('#d0bcff', '#4f378b', '#332d41', '#141218', true) },
  { id: 'kmind-material-3-rounded-orthogonal-aqua', label: 'Material Aqua', description: '青绿色 Material 3', light: materialVariant('#006a60', '#006a60', '#9ef2e5', '#f4fbf9'), dark: materialVariant('#82d5c9', '#005047', '#173936', '#0d1514', true) },
  { id: 'kmind-midnight-neon', label: 'Midnight Neon', description: '深色霓虹与彩虹分支', light: neon, dark: neon },
  { id: 'kmind-rainbow-breeze', label: 'Rainbow Breeze', description: '轻盈彩虹分支', light: rainbowLight, dark: rainbowDark },
  { id: 'kmind-baseline-fork-ink', label: 'Ink Branch', description: '粗墨枝干式极简主题', light: inkLight, dark: inkDark },
] as const;

const THEME_IDS = new Set(YEMIND_THEME_PRESETS.map((item) => item.id));
const LINE_STYLES = new Set<YeMindLineStyle>(['curve', 'straight', 'direct']);

export function normalizeThemePresetId(value: unknown): string {
  if (value === 'default' || typeof value !== 'string' || !THEME_IDS.has(value)) return 'kmind-default';
  return value;
}

export function normalizeLineStyle(value: unknown): YeMindLineStyle {
  return typeof value === 'string' && LINE_STYLES.has(value as YeMindLineStyle)
    ? value as YeMindLineStyle
    : 'curve';
}

export function detectAppearance(root: Element | null = typeof document === 'undefined' ? null : document.documentElement): YeMindAppearance {
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
  themeConfig: Record<string, any>;
  rainbow: { open: boolean; colorsList: string[] };
} {
  const presetId = normalizeThemePresetId(options.presetId);
  const preset = YEMIND_THEME_PRESETS.find((item) => item.id === presetId) ?? YEMIND_THEME_PRESETS[0];
  const variant = options.appearance === 'dark' ? preset.dark : preset.light;
  const spacing = options.spacingConfig ?? {};
  const lineStyle = normalizeLineStyle(options.lineStyle);
  const root = { ...cloneLevel(variant.root, 0, 0), ...(spacing.root ?? {}) };
  if (presetId === 'kmind-baseline-fork-ink') root.fontFamily = FONT_MONO;
  const second = { ...cloneLevel(variant.second, 100, 38), ...(spacing.second ?? {}) };
  const node = { ...cloneLevel(variant.node, 54, 12), ...(spacing.node ?? {}) };
  const generalization = {
    ...cloneLevel(variant.second, 80, 30),
    fillColor: variant.second.fillColor,
    ...(spacing.generalization ?? {}),
  };

  return {
    presetId,
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
    rainbow: {
      open: variant.rainbow.open,
      colorsList: [...variant.rainbow.colorsList],
    },
  };
}

export function themeOptionsHtml(selected: unknown): string {
  const value = normalizeThemePresetId(selected);
  return YEMIND_THEME_PRESETS.map((preset) => (
    `<option value="${preset.id}"${preset.id === value ? ' selected' : ''}>${preset.label}</option>`
  )).join('');
}
