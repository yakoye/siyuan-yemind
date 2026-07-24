import { describe, expect, it } from 'vitest';
import {
  calculateOfficialInsertionGuide,
  emptyOfficialDragCandidate,
  isOfficialDragCandidateNoop,
  resolveOfficialDragCandidate,
  resolveOfficialDragGuideOrientation,
  supportsOfficialDragGeometry,
} from '../../../src/core/officialDragIntent';

function node(uid: string, rect: { x: number; y: number; width: number; height: number }, parent: any = null) {
  return {
    uid,
    rect,
    parent,
    children: [] as any[],
    layerIndex: parent ? (parent.layerIndex ?? 0) + 1 : 0,
    dir: 'right',
    getData(key: string) {
      return key === 'uid' ? uid : undefined;
    },
  };
}

const current = () => emptyOfficialDragCandidate();

describe('pointer-based structural drag intent', () => {
  it('assigns the space between unequal sibling nodes to the nearest local target', () => {
    const parent = node('parent', { x: 20, y: 100, width: 80, height: 40 });
    const first = node('first', { x: 160, y: 70, width: 100, height: 36 }, parent);
    const second = node('second', { x: 160, y: 180, width: 100, height: 36 }, parent);
    parent.children = [first, second];

    const candidate = resolveOfficialDragCandidate({
      layout: 'logicalStructure',
      pointer: { x: 290, y: 142 },
      nodes: [parent, first, second],
      current: current(),
      getRect: (value) => value.rect,
    });

    expect(candidate.kind).toBe('after');
    expect(candidate.parentNode).toBe(parent);
    expect(candidate.targetNode).toBe(first);
  });

  it('resolves a pointer near the upper edge as a sibling BEFORE slot', () => {
    const parent = node('parent', { x: 20, y: 100, width: 80, height: 40 });
    const first = node('first', { x: 160, y: 70, width: 100, height: 36 }, parent);
    const second = node('second', { x: 160, y: 180, width: 100, height: 36 }, parent);
    parent.children = [first, second];

    const candidate = resolveOfficialDragCandidate({
      layout: 'logicalStructure',
      pointer: { x: 210, y: 179 },
      nodes: [parent, first, second],
      current: current(),
      getRect: (value) => value.rect,
    });

    expect(candidate.kind).toBe('before');
    expect(candidate.parentNode).toBe(parent);
    expect(candidate.nextNode).toBe(second);
    expect(candidate.index).toBe(1);
  });

  it('uses the outward tail as an explicit CHILD gesture', () => {
    const root = node('root', { x: 0, y: 100, width: 80, height: 40 });
    const target = node('target', { x: 140, y: 80, width: 90, height: 40 }, root);
    root.children = [target];

    const candidate = resolveOfficialDragCandidate({
      layout: 'logicalStructure',
      pointer: { x: 248, y: 100 },
      nodes: [root, target],
      current: current(),
      getRect: (value) => value.rect,
    });

    expect(candidate.kind).toBe('child');
    expect(candidate.parentNode).toBe(target);
    expect(candidate.overlapNode).toBe(target);
  });

  it('chooses the exact insertion index between existing children', () => {
    const parent = node('parent', { x: 100, y: 100, width: 90, height: 40 });
    const first = node('first', { x: 250, y: 70, width: 90, height: 34 }, parent);
    const second = node('second', { x: 250, y: 150, width: 90, height: 34 }, parent);
    parent.children = [first, second];

    const candidate = resolveOfficialDragCandidate({
      layout: 'logicalStructure',
      pointer: { x: 205, y: 120 },
      nodes: [parent, first, second],
      current: current(),
      getRect: (value) => value.rect,
    });

    expect(candidate.kind).toBe('child');
    expect(candidate.parentNode).toBe(parent);
    expect(candidate.index).toBe(1);
    expect(candidate.nextNode).toBe(second);
  });

  it('uses bottom, left and top tails according to layout direction', () => {
    const organization = node('organization', { x: 100, y: 100, width: 100, height: 40 });
    const left = node('left', { x: 200, y: 100, width: 80, height: 40 });
    left.dir = 'left';
    const top = node('top', { x: 140, y: 90, width: 80, height: 40 });
    top.dir = 'top';
    top.layerIndex = 2;

    expect(resolveOfficialDragCandidate({
      layout: 'organizationStructure', pointer: { x: 150, y: 158 }, nodes: [organization], current: current(), getRect: (value) => value.rect,
    }).kind).toBe('child');
    expect(resolveOfficialDragCandidate({
      layout: 'mindMap', pointer: { x: 165, y: 120 }, nodes: [left], current: current(), getRect: (value) => value.rect,
    }).kind).toBe('child');
    expect(resolveOfficialDragCandidate({
      layout: 'timeline2', pointer: { x: 180, y: 52 }, nodes: [top], current: current(), getRect: (value) => value.rect,
    }).kind).toBe('child');
  });

  it('mirrors sibling and child intent when a root child crosses the mind-map centre', () => {
    const root = node('root', { x: 400, y: 250, width: 100, height: 50 });
    (root as any).isRoot = true;
    const right1 = node('right-1', { x: 600, y: 160, width: 90, height: 36 }, root);
    const right2 = node('right-2', { x: 600, y: 330, width: 90, height: 36 }, root);
    const left1 = node('left-1', { x: 210, y: 160, width: 90, height: 36 }, root);
    const left2 = node('left-2', { x: 210, y: 330, width: 90, height: 36 }, root);
    left1.dir = 'left';
    left2.dir = 'left';
    root.children = [right1, right2, left1, left2];
    const base = {
      layout: 'mindMap',
      nodes: [root, right1, right2, left1, left2],
      excludedNodes: [right2],
      current: current(),
      getRect: (value: any) => value.rect,
    };

    const aboveLeft = resolveOfficialDragCandidate({ ...base, pointer: { x: 250, y: 150 } });
    expect(aboveLeft.kind).toBe('before');
    expect(aboveLeft.nextNode).toBe(left1);
    expect(aboveLeft.branchDirection).toBe('left');

    const belowLeft = resolveOfficialDragCandidate({ ...base, pointer: { x: 250, y: 205 } });
    expect(belowLeft.kind).toBe('after');
    expect(belowLeft.nextNode).toBe(left2);
    expect(belowLeft.branchDirection).toBe('left');

    const asLeftChild = resolveOfficialDragCandidate({ ...base, pointer: { x: 190, y: 178 } });
    expect(asLeftChild.kind).toBe('child');
    expect(asLeftChild.parentNode).toBe(left1);
    expect(asLeftChild.branchDirection).toBe('left');

    const rootLeft = resolveOfficialDragCandidate({ ...base, pointer: { x: 370, y: 275 } });
    const rootRight = resolveOfficialDragCandidate({ ...base, pointer: { x: 530, y: 275 } });
    expect(rootLeft.branchDirection).toBe('left');
    expect(rootRight.branchDirection).toBe('right');
    expect(rootLeft.key).not.toBe(rootRight.key);
    expect(isOfficialDragCandidateNoop(aboveLeft, [right2])).toBe(false);
    expect(isOfficialDragCandidateNoop(belowLeft, [right2])).toBe(false);
  });

  it('detects an unchanged source slot as a no-op', () => {
    const parent = node('parent', { x: 0, y: 0, width: 80, height: 40 });
    const source = node('source', { x: 140, y: 10, width: 80, height: 32 }, parent);
    const first = node('first', { x: 140, y: 60, width: 80, height: 32 }, parent);
    const second = node('second', { x: 140, y: 120, width: 80, height: 32 }, parent);
    parent.children = [source, first, second];
    const candidate = resolveOfficialDragCandidate({
      layout: 'logicalStructure', pointer: { x: 180, y: 60 }, nodes: [first, second], current: current(), getRect: (value) => value.rect,
    });
    expect(candidate.kind).toBe('before');
    expect(isOfficialDragCandidateNoop(candidate, [source])).toBe(true);
  });

  it('generates a green-style insertion geometry for sibling and empty-child slots', () => {
    const parent = node('parent', { x: 20, y: 100, width: 80, height: 40 });
    const child = node('child', { x: 160, y: 80, width: 100, height: 36 }, parent);
    parent.children = [child];
    const before = resolveOfficialDragCandidate({
      layout: 'logicalStructure', pointer: { x: 200, y: 80 }, nodes: [parent, child], current: current(), getRect: (value) => value.rect,
    });
    const guide = calculateOfficialInsertionGuide(before, 'logicalStructure', (value) => value.rect);
    expect(guide?.orientation).toBe('horizontal');
    expect(guide?.path).toContain('L');

    const emptyParent = node('empty', { x: 300, y: 100, width: 80, height: 40 });
    const emptyChild = resolveOfficialDragCandidate({
      layout: 'logicalStructure', pointer: { x: 390, y: 120 }, nodes: [emptyParent], current: current(), getRect: (value) => value.rect,
    });
    expect(calculateOfficialInsertionGuide(emptyChild, 'logicalStructure', (value) => value.rect)?.orientation).toBe('vertical');
  });

  it('keeps per-target guide orientation and upstream fallback coverage', () => {
    const root = node('root', { x: 0, y: 0, width: 100, height: 40 });
    const child = node('child', { x: 140, y: 80, width: 80, height: 36 }, root);
    expect(resolveOfficialDragGuideOrientation('organizationStructure', child)).toBe('vertical');
    expect(resolveOfficialDragGuideOrientation('timeline', root)).toBe('horizontal');
    expect(resolveOfficialDragGuideOrientation('timeline', child)).toBe('vertical');
    expect(resolveOfficialDragGuideOrientation('logicalStructureLeft', child)).toBe('horizontal');
    expect(supportsOfficialDragGeometry('fishbone')).toBe(false);
    expect(supportsOfficialDragGeometry('fishbone2')).toBe(false);
  });
});
