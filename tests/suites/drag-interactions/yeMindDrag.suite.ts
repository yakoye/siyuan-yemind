import { describe, expect, it } from 'vitest';
import {
  calculateDragGuidePath,
  calculateOriginalParentGuideStyle,
  createDragCandidateState,
  resolveDragGuideTarget,
  updateStableDragCandidate,
  captureIncomingDragLines,
  restoreIncomingDragLines,
} from '../../../src/core/YeMindDrag';
import { emptyOfficialDragCandidate, type OfficialDragCandidate } from '../../../src/core/officialDragIntent';

function child(uid: string): OfficialDragCandidate {
  const target = { uid };
  return {
    key: `child:${uid}:0`, kind: 'child', target, parent: target, index: 0,
    overlapNode: target, prevNode: null, nextNode: null,
    targetNode: target, parentNode: target, score: 0,
  };
}

describe('YeMindDrag pointer target guide', () => {
  it('uses the target parent for child and sibling candidates', () => {
    const overlap = { uid: 'parent' };
    expect(resolveDragGuideTarget({ overlapNode: overlap, prevNode: null, nextNode: null })).toBe(overlap);
    const parent = { uid: 'parent' };
    const sibling = { parent };
    expect(resolveDragGuideTarget({ overlapNode: null, prevNode: sibling, nextNode: null })).toBe(parent);
  });

  it('clears a stale stable target immediately when the pointer enters NONE', () => {
    let state = createDragCandidateState(child('parent'));
    state = updateStableDragCandidate(state, emptyOfficialDragCandidate(), 20);
    expect(state.stable.kind).toBe('none');
    expect(state.pending).toBeNull();
  });

  it('requires deliberate dwell before changing hierarchy to a child', () => {
    const none = emptyOfficialDragCandidate();
    const next = child('parent');
    let state = createDragCandidateState(none);
    state = updateStableDragCandidate(state, next, 0);
    state = updateStableDragCandidate(state, next, 80);
    expect(state.stable.kind).toBe('none');
    state = updateStableDragCandidate(state, next, 151);
    expect(state.stable.key).toBe(next.key);
  });

  it('allows sibling slots to stabilise faster than hierarchy changes', () => {
    const target = { uid: 'target', parent: { uid: 'parent' } };
    const sibling: OfficialDragCandidate = {
      key: 'before:parent:0', kind: 'before', target, parent: target.parent, index: 0,
      overlapNode: null, prevNode: null, nextNode: target,
      targetNode: target, parentNode: target.parent, score: 0,
    };
    let state = createDragCandidateState(emptyOfficialDragCandidate());
    state = updateStableDragCandidate(state, sibling, 0);
    state = updateStableDragCandidate(state, sibling, 25);
    expect(state.stable.key).toBe(sibling.key);
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

  it('keeps a readable neutral original-parent guide at every distance', () => {
    const near = calculateOriginalParentGuideStyle(0);
    const far = calculateOriginalParentGuideStyle(140);
    expect(near.width).toBeCloseTo(2);
    expect(far.width).toBeCloseTo(0.9);
    expect(near.opacity).toBeCloseTo(0.3);
    expect(far.opacity).toBeCloseTo(0.9);
  });
});
