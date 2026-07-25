export const RELATION_HIT_WIDTH = 12;

export function resolveRelationHitWidth(activeWidth: unknown): number {
  const width = Number(activeWidth);
  return Math.max(RELATION_HIT_WIDTH, Number.isFinite(width) ? width : 0);
}
