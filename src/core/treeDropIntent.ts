export type TreeDropKind = 'none' | 'before' | 'after' | 'child';

export interface TreeDropIntent<T = unknown> {
  key: string;
  kind: TreeDropKind;
  target: T | null;
  parent: T | null;
  index: number;
}

export interface StableTreeDropState<T = unknown> {
  stable: TreeDropIntent<T>;
  pending: {
    candidate: TreeDropIntent<T>;
    since: number;
    frames: number;
  } | null;
}

export interface TreeDropStabilityOptions {
  siblingDurationMs?: number;
  siblingFrames?: number;
  childDurationMs?: number;
  childFrames?: number;
}

export const NONE_TREE_DROP: TreeDropIntent<unknown> = Object.freeze({
  key: 'none',
  kind: 'none',
  target: null,
  parent: null,
  index: -1,
});

export function createStableTreeDropState<T>(
  stable: TreeDropIntent<T>,
): StableTreeDropState<T> {
  return { stable, pending: null };
}

/**
 * A shared drop-intent stabiliser for both the outline and the SVG canvas.
 * NONE is immediate so releasing in a neutral gap can never reuse a stale
 * target. Sibling slots react quickly; becoming a child requires a deliberate
 * short dwell because it changes hierarchy rather than only order.
 */
export function updateStableTreeDropIntent<T>(
  state: StableTreeDropState<T>,
  candidate: TreeDropIntent<T>,
  now: number,
  options: TreeDropStabilityOptions = {},
): StableTreeDropState<T> {
  if (candidate.kind === 'none') {
    return { stable: candidate, pending: null };
  }
  if (candidate.key === state.stable.key) {
    return { stable: state.stable, pending: null };
  }

  const child = candidate.kind === 'child';
  const minimumDurationMs = child
    ? options.childDurationMs ?? 150
    : options.siblingDurationMs ?? 24;
  const minimumFrames = child
    ? options.childFrames ?? 3
    : options.siblingFrames ?? 2;

  if (state.pending?.candidate.key === candidate.key) {
    const pending = { ...state.pending, frames: state.pending.frames + 1 };
    if (
      now - pending.since >= minimumDurationMs &&
      pending.frames >= minimumFrames
    ) {
      return { stable: candidate, pending: null };
    }
    return { stable: state.stable, pending };
  }

  return {
    stable: state.stable,
    pending: { candidate, since: now, frames: 1 },
  };
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function distanceToRange(
  value: number,
  start: number,
  end: number,
): number {
  if (value < start) return start - value;
  if (value > end) return value - end;
  return 0;
}
