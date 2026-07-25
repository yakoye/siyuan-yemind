export function parseZoomPercent(value: unknown, min: number, max: number): number | null {
  const normalized = String(value ?? '').trim().replace(/%$/, '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.min(upper, Math.max(lower, parsed));
}
