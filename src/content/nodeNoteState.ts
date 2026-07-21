import { sanitizeRichHtml } from './sanitizeRichHtml';

export interface NodeNote {
  html: string;
  createdAt: number;
  updatedAt: number;
  width?: number;
  height?: number;
}

function cleanDimension(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : undefined;
}

export function normalizeNodeNote(value: unknown, now = Date.now()): NodeNote | null {
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    const html = sanitizeRichHtml(value).trim();
    if (!html) return null;
    return { html, createdAt: now, updatedAt: now };
  }
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const html = sanitizeRichHtml(String(source.html ?? '')).trim();
  if (!html) return null;
  const createdAt = Number(source.createdAt);
  const updatedAt = Number(source.updatedAt);
  return {
    html,
    createdAt: Number.isFinite(createdAt) ? createdAt : now,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : now,
    ...(cleanDimension(source.width) ? { width: cleanDimension(source.width) } : {}),
    ...(cleanDimension(source.height) ? { height: cleanDimension(source.height) } : {}),
  };
}

export function updateNodeNote(
  previous: NodeNote | string | null | undefined,
  html: string,
  now = Date.now(),
  size: { width?: number; height?: number } = {},
): NodeNote | null {
  const value = sanitizeRichHtml(html).trim();
  if (!value) return null;
  const current = normalizeNodeNote(previous, now);
  return {
    html: value,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    ...(cleanDimension(size.width ?? current?.width) ? { width: cleanDimension(size.width ?? current?.width) } : {}),
    ...(cleanDimension(size.height ?? current?.height) ? { height: cleanDimension(size.height ?? current?.height) } : {}),
  };
}
