export const DEFAULT_SPLIT_OUTLINE_RATIO = 0.42;
export const MIN_SPLIT_OUTLINE_RATIO = 0.25;
export const MAX_SPLIT_OUTLINE_RATIO = 0.7;

export function normalizeSplitOutlineRatio(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_SPLIT_OUTLINE_RATIO;
  return Math.min(MAX_SPLIT_OUTLINE_RATIO, Math.max(MIN_SPLIT_OUTLINE_RATIO, number));
}

export function ratioFromPointer(rect: { left: number; width: number }, clientX: number): number {
  if (!Number.isFinite(rect.width) || rect.width <= 0) return DEFAULT_SPLIT_OUTLINE_RATIO;
  return normalizeSplitOutlineRatio((rect.left + rect.width - clientX) / rect.width);
}
