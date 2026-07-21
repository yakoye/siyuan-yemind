import type { YeMindSettings } from '../settings/SettingsStore';

export interface NativeOuterFrameOptions {
  defaultOuterFrameText: string;
  outerFramePaddingX: number;
  outerFramePaddingY: number;
}

export function normalizeOuterFramePadding(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(80, Math.max(0, Math.round(parsed)));
}

export function buildOuterFrameOptions(settings: YeMindSettings): NativeOuterFrameOptions {
  return {
    defaultOuterFrameText: settings.defaultOuterFrameText,
    outerFramePaddingX: normalizeOuterFramePadding(settings.outerFramePaddingX, 10),
    outerFramePaddingY: normalizeOuterFramePadding(settings.outerFramePaddingY, 10),
  };
}
