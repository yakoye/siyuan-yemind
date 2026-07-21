import { describe, expect, it } from 'vitest';
import {
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

describe('KMind Zen official-style drag intent geometry', () => {
  it('enters a logical-right node through its 80px child tail before the pointer reaches the node', () => {
    const root = node('root', { x: 0, y: 80, width: 80, height: 40 });
    const target = node('target', { x: 100, y: 100, width: 80, height: 40 }, root);
    root.children = [target];

    const candidate = resolveOfficialDragCandidate({
      layout: 'logicalStructure',
      ghost: { x: 190, y: 102, width: 72, height: 36 },
      nodes: [root, target],
      current: { key: 'none', overlapNode: null, prevNode: null, nextNode: null },
      getRect: (value) => value.rect,
    });

    expect(candidate.key).toBe('child:target');
    expect(candidate.overlapNode).toBe(target);
    expect(candidate.prevNode).toBeNull();
    expect(candidate.nextNode).toBeNull();
  });

  it('uses the expanded sibling lane and resolves the insertion pair between two children', () => {
    const parent = node('parent', { x: 20, y: 100, width: 80, height: 40 });
    const first = node('first', { x: 160, y: 80, width: 80, height: 36 }, parent);
    const second = node('second', { x: 160, y: 180, width: 80, height: 36 }, parent);
    parent.children = [first, second];

    const candidate = resolveOfficialDragCandidate({
      layout: 'logicalStructure',
      ghost: { x: 250, y: 132, width: 72, height: 36 },
      nodes: [parent, first, second],
      current: { key: 'none', overlapNode: null, prevNode: null, nextNode: null },
      getRect: (value) => value.rect,
    });

    expect(candidate.key).toBe('sibling:parent:1');
    expect(candidate.overlapNode).toBeNull();
    expect(candidate.prevNode).toBe(first);
    expect(candidate.nextNode).toBe(second);
  });


  it('switches away from the old parent when the clone enters another node tail', () => {
    const root = node('root', { x: 0, y: 120, width: 80, height: 40 });
    const oldParent = node('old-parent', { x: 120, y: 180, width: 90, height: 40 }, root);
    const newParent = node('new-parent', { x: 120, y: 80, width: 90, height: 40 }, root);
    const oldSibling = node('old-sibling', { x: 260, y: 180, width: 72, height: 36 }, oldParent);
    root.children = [newParent, oldParent];
    oldParent.children = [oldSibling];

    const candidate = resolveOfficialDragCandidate({
      layout: 'logicalStructure',
      ghost: { x: 224, y: 82, width: 72, height: 36 },
      nodes: [root, oldParent, newParent, oldSibling],
      current: { key: 'sibling:old-parent:1', overlapNode: null, prevNode: oldSibling, nextNode: null },
      getRect: (value) => value.rect,
    });

    expect(candidate.key).toBe('child:new-parent');
    expect(candidate.overlapNode).toBe(newParent);
  });

  it('supports bottom child tails in organization layouts', () => {
    const target = node('target', { x: 100, y: 100, width: 100, height: 40 });
    const candidate = resolveOfficialDragCandidate({
      layout: 'organizationStructure',
      ghost: { x: 112, y: 150, width: 76, height: 36 },
      nodes: [target],
      current: { key: 'none', overlapNode: null, prevNode: null, nextNode: null },
      getRect: (value) => value.rect,
    });

    expect(candidate.key).toBe('child:target');
  });

  it('uses the left child tail for left-side mind-map branches', () => {
    const target = node('target', { x: 200, y: 100, width: 80, height: 40 });
    target.dir = 'left';
    const candidate = resolveOfficialDragCandidate({
      layout: 'mindMap',
      ghost: { x: 110, y: 102, width: 72, height: 36 },
      nodes: [target],
      current: { key: 'none', overlapNode: null, prevNode: null, nextNode: null },
      getRect: (value) => value.rect,
    });

    expect(candidate.key).toBe('child:target');
  });

  it('keeps the active child target with the wider 22px leave padding', () => {
    const target = node('target', { x: 100, y: 100, width: 80, height: 40 });
    const current = { key: 'child:target', overlapNode: target, prevNode: null, nextNode: null };

    const candidate = resolveOfficialDragCandidate({
      layout: 'logicalStructure',
      ghost: { x: 183, y: 80, width: 20, height: 8 },
      nodes: [target],
      current,
      getRect: (value) => value.rect,
    });

    expect(candidate.key).toBe('child:target');
  });
  it('uses per-target guide orientation instead of one orientation for the whole mixed layout', () => {
    const root = node('root', { x: 0, y: 0, width: 100, height: 40 });
    const child = node('child', { x: 140, y: 80, width: 80, height: 36 }, root);

    expect(resolveOfficialDragGuideOrientation('catalogOrganization', root)).toBe('vertical');
    expect(resolveOfficialDragGuideOrientation('catalogOrganization', child)).toBe('vertical');
    expect(resolveOfficialDragGuideOrientation('organizationStructure', child)).toBe('vertical');
    expect(resolveOfficialDragGuideOrientation('timeline', root)).toBe('horizontal');
    expect(resolveOfficialDragGuideOrientation('timeline', child)).toBe('vertical');
    expect(resolveOfficialDragGuideOrientation('verticalTimeline', root)).toBe('vertical');
    expect(resolveOfficialDragGuideOrientation('verticalTimeline', child)).toBe('horizontal');
    expect(resolveOfficialDragGuideOrientation('logicalStructureLeft', child)).toBe('horizontal');
  });

  it('falls back to the upstream drag geometry for fishbone layouts', () => {
    expect(supportsOfficialDragGeometry('fishbone')).toBe(false);
    expect(supportsOfficialDragGeometry('fishbone2')).toBe(false);
  });

  it('uses a bottom child tail for non-root catalog nodes in the installed renderer', () => {
    const root = node('root', { x: 0, y: 0, width: 100, height: 40 });
    const target = node('target', { x: 100, y: 100, width: 80, height: 40 }, root);

    const candidate = resolveOfficialDragCandidate({
      layout: 'catalogOrganization',
      ghost: { x: 104, y: 151, width: 72, height: 30 },
      nodes: [root, target],
      current: { key: 'none', overlapNode: null, prevNode: null, nextNode: null },
      getRect: (value) => value.rect,
    });

    expect(candidate.key).toBe('child:target');
  });

  it('uses a right child tail for the timeline root and a vertical tail below timeline descendants', () => {
    const root = node('root', { x: 20, y: 100, width: 80, height: 40 });
    const child = node('child', { x: 180, y: 100, width: 80, height: 40 }, root);

    const rootCandidate = resolveOfficialDragCandidate({
      layout: 'timeline',
      ghost: { x: 110, y: 102, width: 72, height: 32 },
      nodes: [root],
      current: { key: 'none', overlapNode: null, prevNode: null, nextNode: null },
      getRect: (value) => value.rect,
    });
    const childCandidate = resolveOfficialDragCandidate({
      layout: 'timeline',
      ghost: { x: 184, y: 150, width: 72, height: 32 },
      nodes: [root, child],
      current: { key: 'none', overlapNode: null, prevNode: null, nextNode: null },
      getRect: (value) => value.rect,
    });

    expect(rootCandidate.key).toBe('child:root');
    expect(childCandidate.key).toBe('child:child');
  });

  it('keeps top growth for every descendant of a top-side timeline2 branch', () => {
    const root = node('root', { x: 0, y: 180, width: 80, height: 40 });
    const branch = node('branch', { x: 140, y: 140, width: 80, height: 40 }, root);
    branch.dir = 'top';
    const target = node('target', { x: 140, y: 70, width: 80, height: 40 }, branch);
    target.dir = 'top';

    const candidate = resolveOfficialDragCandidate({
      layout: 'timeline2',
      ghost: { x: 144, y: -20, width: 72, height: 32 },
      nodes: [root, branch, target],
      current: { key: 'none', overlapNode: null, prevNode: null, nextNode: null },
      getRect: (value) => value.rect,
    });

    expect(candidate.key).toBe('child:target');
  });

  it('maps a visual insertion in a top timeline2 branch back to the native data order', () => {
    const root = node('root', { x: 0, y: 180, width: 80, height: 40 });
    const parent = node('parent', { x: 140, y: 140, width: 80, height: 40 }, root);
    parent.dir = 'top';
    const firstInData = node('first-in-data', { x: 140, y: 80, width: 80, height: 32 }, parent);
    const secondInData = node('second-in-data', { x: 140, y: 20, width: 80, height: 32 }, parent);
    firstInData.dir = 'top';
    secondInData.dir = 'top';
    parent.children = [firstInData, secondInData];

    const candidate = resolveOfficialDragCandidate({
      layout: 'timeline2',
      ghost: { x: 230, y: 55, width: 72, height: 28 },
      nodes: [root, parent, firstInData, secondInData],
      current: { key: 'none', overlapNode: null, prevNode: null, nextNode: null },
      getRect: (value) => value.rect,
    });

    expect(candidate.key).toBe('sibling:parent:1');
    expect(candidate.prevNode).toBe(firstInData);
    expect(candidate.nextNode).toBe(secondInData);
  });

});
