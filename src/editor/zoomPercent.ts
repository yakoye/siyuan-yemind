export function parseZoomPercent(value: unknown, min: number, max: number): number | null {
  const normalized = String(value ?? '').trim().replace(/%$/, '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.min(upper, Math.max(lower, parsed));
}

export function steppedZoomPercent(
  current: number,
  direction: 'in' | 'out',
  min: number,
  max: number,
  step = 20,
): number {
  const safeStep = Number.isFinite(step) && step > 0 ? step : 20;
  const safeCurrent = Number.isFinite(current) ? current : 100;
  const lower = Number.isFinite(min) ? min : 20;
  const upper = Number.isFinite(max) && max >= 0 ? Math.max(lower, max) : Number.POSITIVE_INFINITY;
  const cleanLevel = Math.round(safeCurrent / safeStep) * safeStep;
  const target = cleanLevel + (direction === 'in' ? safeStep : -safeStep);
  return Math.min(upper, Math.max(lower, target));
}
