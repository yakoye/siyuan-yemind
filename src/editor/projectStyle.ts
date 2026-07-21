export type ProjectDensity = 'compact' | 'default' | 'comfortable';

export interface ProjectStyle {
  density: ProjectDensity;
  rainbowLines: boolean | null;
  backgroundColor: string | null;
}

export const DEFAULT_PROJECT_STYLE: ProjectStyle = {
  density: 'default',
  rainbowLines: null,
  backgroundColor: null,
};

function normalizeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(text) ? text : null;
}

export function normalizeProjectStyle(value: unknown): ProjectStyle {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const density: ProjectDensity = input.density === 'compact' || input.density === 'comfortable'
    ? input.density
    : 'default';
  const rainbowLines = typeof input.rainbowLines === 'boolean' ? input.rainbowLines : null;
  const backgroundColor = normalizeColor(input.backgroundColor);
  return { density, rainbowLines, backgroundColor };
}

export function densitySpacing(density: ProjectDensity): {
  second?: { marginX: number; marginY: number };
  node?: { marginX: number; marginY: number };
} {
  if (density === 'compact') {
    return {
      second: { marginX: 82, marginY: 22 },
      node: { marginX: 42, marginY: 11 },
    };
  }
  if (density === 'comfortable') {
    return {
      second: { marginX: 150, marginY: 54 },
      node: { marginX: 76, marginY: 26 },
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
  const spacing = densitySpacing(style.density);
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
    },
  };
}
