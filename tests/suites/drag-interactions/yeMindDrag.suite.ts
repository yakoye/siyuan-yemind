import { describe, expect, it, vi } from 'vitest';
import Drag from 'simple-mind-map/src/plugins/Drag';
import YeMindDrag from '../../../src/core/YeMindDrag';
import {
  calculateDragGuidePath,
  calculateOriginalParentGuideStyle,
  createDragCandidateState,
  resolveDragGuideTarget,
  updateStableDragCandidate,
  captureIncomingDragLines,
  restoreIncomingDragLines,
  replaceSingleNodeCloneWithSubtree,
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

  it('builds one coherent drag preview for a parent and all visible descendants', () => {
    const makeElement = (name: string, x: number, y: number) => ({
      name,
      removed: false,
      clone() {
        return {
          name: `${name}-clone`,
          addClass: vi.fn(),
          transform: () => ({ translateX: x, translateY: y }),
          translate: vi.fn(),
        };
      },
      remove() { this.removed = true; },
    });
    const line = makeElement('line', 0, 0);
    const child = {
      left: 180,
      top: 90,
      group: makeElement('child', 180, 90),
      children: [],
      _lines: [],
    };
    const parent = {
      left: 100,
      top: 60,
      group: makeElement('parent', 100, 60),
      children: [child],
      _lines: [line],
    };
    const added: any[] = [];
    const wrapper = {
      add: (element: any) => added.push(element),
      translate: vi.fn(),
      opacity: vi.fn(),
      css: vi.fn(),
    };
    const oldClone = makeElement('old', 100, 60);
    const plugin = {
      beingDragNodeList: [parent],
      clone: oldClone,
      mindMap: {
        otherDraw: {
          group: () => wrapper,
        },
        opt: {
          dragOpacityConfig: { cloneNodeOpacity: 0.82 },
        },
      },
    };

    expect(replaceSingleNodeCloneWithSubtree(plugin)).toBe(true);
    expect(oldClone.removed).toBe(true);
    expect(plugin.clone).toBe(wrapper);
    expect(added.map((element) => element.name)).toEqual([
      'line-clone',
      'parent-clone',
      'child-clone',
    ]);
    expect(added[1].addClass).toHaveBeenCalledWith('ymz-drag-subtree-root');
    expect(added[2].addClass).not.toHaveBeenCalledWith('ymz-drag-subtree-root');
    expect(wrapper.translate).toHaveBeenCalledWith(100, 60);
  });

  it('does not reveal hidden child lines below a collapsed node in a larger preview subtree', () => {
    const lineClone = { show: vi.fn(), translate: vi.fn() };
    const visibleLineClone = { show: vi.fn(), translate: vi.fn() };
    const parentClone = { show: vi.fn(), translate: vi.fn() };
    const collapsedClone = { show: vi.fn(), translate: vi.fn() };
    const siblingClone = { show: vi.fn(), translate: vi.fn() };
    const hiddenLine = { clone: () => lineClone };
    const visibleLine = { clone: () => visibleLineClone };
    const collapsed = {
      left: 180,
      top: 90,
      getData: (key: string) => key === 'expand' ? false : undefined,
      group: { clone: () => collapsedClone },
      children: [{ left: 260, top: 90, children: [], _lines: [] }],
      _lines: [hiddenLine],
    };
    const sibling = {
      left: 180,
      top: 140,
      getData: () => true,
      group: { clone: () => siblingClone },
      children: [],
      _lines: [],
    };
    const parent = {
      left: 100,
      top: 60,
      getData: () => true,
      group: { clone: () => parentClone },
      children: [collapsed, sibling],
      _lines: [visibleLine, visibleLine],
    };
    const added: any[] = [];
    const wrapper = {
      add: (element: any) => added.push(element),
      translate: vi.fn(),
      opacity: vi.fn(),
      css: vi.fn(),
      addClass: vi.fn(),
      attr: vi.fn(),
    };
    const plugin = {
      beingDragNodeList: [parent],
      clone: { remove: vi.fn() },
      mindMap: {
        otherDraw: { group: () => wrapper },
        opt: { dragOpacityConfig: { cloneNodeOpacity: 0.82 } },
      },
    };

    expect(replaceSingleNodeCloneWithSubtree(plugin)).toBe(true);
    expect(lineClone.show).not.toHaveBeenCalled();
    expect(added).not.toContain(lineClone);
    expect(added).toContain(visibleLineClone);
    expect(added).toEqual(expect.arrayContaining([parentClone, collapsedClone, siblingClone]));
  });

  it('does not paint a target guide before the first pointer move positions the drag clone', () => {
    const upstreamCreateClone = vi
      .spyOn(Drag.prototype as any, 'createCloneNode')
      .mockImplementation(function createInitialClone(this: any) {
        this.clone = {};
      });
    const drag = Object.create(YeMindDrag.prototype) as any;
    const updateOfficialGuideLines = vi.fn();
    Object.assign(drag, {
      clone: null,
      beingDragNodeList: [],
      ensureGuideLines: vi.fn(),
      clearUpstreamPlaceholder: vi.fn(),
      updateOfficialGuideLines,
    });

    try {
      drag.createCloneNode();
      expect(updateOfficialGuideLines).not.toHaveBeenCalled();
    } finally {
      upstreamCreateClone.mockRestore();
    }
  });

  it('moves the native highlight between candidate parents and restores prior state on cleanup', () => {
    const makeNode = (uid: string, initiallyHighlighted = false) => {
      let highlighted = initiallyHighlighted;
      return {
        uid,
        group: { hasClass: () => highlighted },
        highlight: vi.fn(() => { highlighted = true; }),
        closeHighlight: vi.fn(() => { highlighted = false; }),
      };
    };
    const first = makeNode('first', true);
    const second = makeNode('second');
    const drag = Object.create(YeMindDrag.prototype) as any;

    drag.setCandidateParentHighlight(first);
    drag.setCandidateParentHighlight(second);
    expect(first.closeHighlight).not.toHaveBeenCalled();
    expect(second.highlight).toHaveBeenCalledTimes(1);

    drag.clearCandidateParentHighlight();
    expect(second.closeHighlight).toHaveBeenCalledTimes(1);
  });
});
