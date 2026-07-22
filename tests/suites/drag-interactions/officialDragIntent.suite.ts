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
  it('keeps the large neutral gap between sibling nodes as NONE', () => {
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

    expect(candidate.kind).toBe('none');
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
