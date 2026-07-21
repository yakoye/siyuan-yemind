import { describe, expect, it } from 'vitest';
import {
  calculateDragGuidePath,
  calculateOriginalParentGuideStyle,
  createDragCandidateState,
  resolveDragGuideTarget,
  updateStableDragCandidate,
  captureIncomingDragLines,
  restoreIncomingDragLines,
} from '../src/core/YeMindDrag';

describe('YeMindDrag official-style target guide', () => {
  it('uses the upstream overlap node or sibling parent as the target parent', () => {
    const overlap = { uid: 'parent' };
    expect(resolveDragGuideTarget({ overlapNode: overlap, prevNode: null, nextNode: null })).toBe(overlap);
    const parent = { uid: 'parent' };
    const sibling = { parent };
    expect(resolveDragGuideTarget({ overlapNode: null, prevNode: sibling, nextNode: null })).toBe(parent);
  });

  it('keeps the original parent while no stable nearer target exists', () => {
    const parent = { uid: 'original-parent' };
    expect(resolveDragGuideTarget({ overlapNode: null, prevNode: null, nextNode: null, mousedownNode: { parent } })).toBe(parent);
  });

  it('requires both 60ms and three matching frames before changing the stable candidate', () => {
    const none = { key: 'none', overlapNode: null, prevNode: null, nextNode: null };
    const next = { key: 'child:parent', overlapNode: { uid: 'parent' }, prevNode: null, nextNode: null };
    let state = createDragCandidateState(none);
    state = updateStableDragCandidate(state, next, 0);
    expect(state.stable.key).toBe('none');
    state = updateStableDragCandidate(state, next, 30);
    expect(state.stable.key).toBe('none');
    state = updateStableDragCandidate(state, next, 61);
    expect(state.stable.key).toBe('child:parent');
  });

  it('resets pending frames when the candidate changes', () => {
    const none = { key: 'none', overlapNode: null, prevNode: null, nextNode: null };
    const a = { key: 'child:a', overlapNode: { uid: 'a' }, prevNode: null, nextNode: null };
    const b = { key: 'child:b', overlapNode: { uid: 'b' }, prevNode: null, nextNode: null };
    let state = createDragCandidateState(none);
    state = updateStableDragCandidate(state, a, 0);
    state = updateStableDragCandidate(state, a, 40);
    state = updateStableDragCandidate(state, b, 70);
    expect(state.stable.key).toBe('none');
    expect(state.pending?.candidate.key).toBe('child:b');
    expect(state.pending?.frames).toBe(1);
  });


  it('hides incoming parent lines during drag and restores their original visibility', () => {
    const visibleLine = {
      shown: true,
      visible() { return this.shown; },
      hide() { this.shown = false; },
      show() { this.shown = true; },
    };
    const hiddenLine = {
      shown: false,
      visible() { return this.shown; },
      hide() { this.shown = false; },
      show() { this.shown = true; },
    };
    const parent = { children: [] as any[], _lines: [visibleLine, hiddenLine] };
    const first = { uid: 'first', parent };
    const second = { uid: 'second', parent };
    parent.children = [first, second];

    const snapshots = captureIncomingDragLines([first, second]);
    expect(visibleLine.shown).toBe(false);
    expect(hiddenLine.shown).toBe(false);

    restoreIncomingDragLines(snapshots);
    expect(visibleLine.shown).toBe(true);
    expect(hiddenLine.shown).toBe(false);
  });

  it('draws cubic guides for horizontal and vertical layouts', () => {
    const parent = { x: 20, y: 90, width: 100, height: 60 };
    const ghost = { x: 200, y: 100, width: 80, height: 40 };
    expect(calculateDragGuidePath(parent, ghost, 'horizontal')).toBe('M 120 120 C 160 120, 160 120, 200 120');
    expect(calculateDragGuidePath(parent, ghost, 'vertical')).toBe('M 70 150 C 70 190, 240 60, 240 100');
  });

  it('fades and thins the original-parent guide as the ghost approaches its parent', () => {
    const near = calculateOriginalParentGuideStyle(0);
    const far = calculateOriginalParentGuideStyle(140);
    expect(near.width).toBeCloseTo(2);
    expect(far.width).toBeCloseTo(0.9);
    expect(near.opacity).toBeCloseTo(0.3);
    expect(far.opacity).toBeCloseTo(0.9);
  });
});
