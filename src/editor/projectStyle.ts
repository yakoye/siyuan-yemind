import { getColorScheme, normalizeColorSchemeId } from '../core/colorSchemes';

export type ProjectDensity = 'compact' | 'default' | 'comfortable' | 'custom';

export interface ProjectStyle {
  density: ProjectDensity;
  rainbowLines: boolean | null;
  rainbowScheme: string | null;
  backgroundColor: string | null;
  customMarginX?: number;
  customMarginY?: number;
}

export const DEFAULT_PROJECT_STYLE: ProjectStyle = {
  density: 'default',
  rainbowLines: null,
  rainbowScheme: null,
  backgroundColor: null,
};

function normalizeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(text) ? text : null;
}

function normalizeSpacing(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export function normalizeProjectStyle(value: unknown): ProjectStyle {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const density: ProjectDensity = input.density === 'compact'
    || input.density === 'comfortable'
    || input.density === 'custom'
    ? input.density
    : 'default';
  const rainbowLines = typeof input.rainbowLines === 'boolean' ? input.rainbowLines : null;
  const rainbowScheme = normalizeColorSchemeId(input.rainbowScheme);
  const backgroundColor = normalizeColor(input.backgroundColor);
  const base: ProjectStyle = { density, rainbowLines, rainbowScheme, backgroundColor };
  if (density === 'custom') {
    base.customMarginX = normalizeSpacing(input.customMarginX, 42, 12, 240);
    base.customMarginY = normalizeSpacing(input.customMarginY, 11, 2, 100);
  }
  return base;
}

export function densitySpacing(
  density: ProjectDensity,
  customMarginX?: number,
  customMarginY?: number,
): {
  second?: { marginX: number; marginY: number };
  node?: { marginX: number; marginY: number };
} {
  if (density === 'compact') {
    return {
      second: { marginX: 30, marginY: 2 },
      node: { marginX: 30, marginY: 2 },
    };
  }
  if (density === 'default') {
    return {
      second: { marginX: 60, marginY: 14 },
      node: { marginX: 28, marginY: 6 },
    };
  }
  if (density === 'comfortable') {
    return {
      second: { marginX: 82, marginY: 22 },
      node: { marginX: 42, marginY: 11 },
    };
  }
  if (density === 'custom') {
    const marginX = normalizeSpacing(customMarginX, 42, 12, 240);
    const marginY = normalizeSpacing(customMarginY, 11, 2, 100);
    return {
      second: { marginX, marginY },
      node: { marginX, marginY },
    };
  }
  return {};
}


export function resolveProjectAppearance(input: {
  style: ProjectStyle | Record<string, unknown> | null | undefined;
  themeConfig: Record<string, any>;
  rainbow: { open: boolean; colorsList: string[] };
}): { themeConfig: Record<string, any>; rainbow: { open: boolean; colorsList: string[] } } {
  const style = normalizeProjectStyle(input.style);
  const spacing = densitySpacing(style.density, style.customMarginX, style.customMarginY);
  const themeConfig: Record<string, any> = {
    ...input.themeConfig,
    second: { ...(input.themeConfig.second ?? {}), ...(spacing.second ?? {}) },
    node: { ...(input.themeConfig.node ?? {}), ...(spacing.node ?? {}) },
  };
  if (style.backgroundColor) themeConfig.backgroundColor = style.backgroundColor;
  return {
    themeConfig,
    rainbow: {
      ...input.rainbow,
      open: style.rainbowLines ?? input.rainbow.open,
      colorsList: getColorScheme(style.rainbowScheme)?.colors.slice() ?? input.rainbow.colorsList,
    },
  };
}
