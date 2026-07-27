export type AppearanceMode = 'system' | 'light' | 'dark';
export type ResolvedAppearance = 'light' | 'dark';

export function normalizeAppearanceMode(value: unknown): AppearanceMode {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveAppearance(
  mode: AppearanceMode,
  systemDark: boolean,
): ResolvedAppearance {
  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
}
