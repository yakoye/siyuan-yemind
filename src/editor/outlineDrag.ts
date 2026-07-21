export type OutlineDropPosition = 'before' | 'inside' | 'after';

export interface OutlineDropIntentInput {
  sourceUid: string;
  targetUid: string;
  clientY: number;
  rect: { top: number; height: number };
}

export interface OutlineDropIntent {
  targetUid: string;
  position: OutlineDropPosition;
}

export function resolveOutlineDropIntent(input: OutlineDropIntentInput): OutlineDropIntent | null {
  if (!input.sourceUid || !input.targetUid || input.sourceUid === input.targetUid || input.rect.height <= 0) return null;
  const ratio = Math.max(0, Math.min(1, (input.clientY - input.rect.top) / input.rect.height));
  const position: OutlineDropPosition = ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside';
  return { targetUid: input.targetUid, position };
}
