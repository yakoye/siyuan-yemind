import { describe, expect, it } from 'vitest';
import { calculateDragGuideEndpoints, resolveDragGuideTarget } from '../src/core/YeMindDrag';

describe('YeMindDrag target guide', () => {
  it('uses the upstream overlap node as the target parent', () => {
    const overlap = { uid: 'parent' };
    expect(resolveDragGuideTarget({ overlapNode: overlap, prevNode: null, nextNode: null })).toBe(overlap);
  });

  it('uses the upstream sibling parent for before/after insertion', () => {
    const parent = { uid: 'parent' };
    const sibling = { parent };
    expect(resolveDragGuideTarget({ overlapNode: null, prevNode: sibling, nextNode: null })).toBe(parent);
  });

  it('keeps a guide to the original parent while no nearer upstream target is active', () => {
    const parent = { uid: 'original-parent' };
    expect(resolveDragGuideTarget({
      overlapNode: null,
      prevNode: null,
      nextNode: null,
      mousedownNode: { parent },
    })).toBe(parent);
  });

  it('connects the nearest edges instead of drawing through node centers', () => {
    const result = calculateDragGuideEndpoints(
      { x: 200, y: 100, width: 80, height: 40 },
      { x: 20, y: 90, width: 100, height: 60 },
    );
    expect(result).toEqual({ startX: 200, startY: 120, endX: 120, endY: 120 });
  });
});
