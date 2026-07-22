import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  emptyOfficialDragCandidate,
  resolveOfficialDragCandidate,
} from '../../../src/core/officialDragIntent';

function node(uid: string, rect: { x: number; y: number; width: number; height: number }, parent: any = null) {
  return {
    uid,
    rect,
    parent,
    children: [] as any[],
    layerIndex: parent ? Number(parent.layerIndex ?? 0) + 1 : 0,
    dir: 'right',
    getData(key: string) { return key === 'uid' ? uid : undefined; },
  };
}

describe('v0.9.7 nearest-node right-logical drag', () => {
  it('splits each unequal node local box into sibling-left and child-right zones', () => {
    const root = node('root', { x: 10, y: 180, width: 80, height: 42 });
    const branch = node('branch', { x: 150, y: 120, width: 76, height: 46 }, root);
    const short = node('short', { x: 320, y: 78, width: 58, height: 36 }, branch);
    const tall = node('tall', { x: 320, y: 160, width: 120, height: 62 }, branch);
    root.children = [branch];
    branch.children = [short, tall];
    const base = {
      layout: 'logicalStructure',
      nodes: [root, branch, short, tall],
      current: emptyOfficialDragCandidate(),
      getRect: (value: any) => value.rect,
    };

    expect(resolveOfficialDragCandidate({ ...base, pointer: { x: 330, y: 78 } })).toMatchObject({
      kind: 'before', parentNode: branch, targetNode: short,
    });
    expect(resolveOfficialDragCandidate({ ...base, pointer: { x: 330, y: 113 } })).toMatchObject({
      kind: 'after', parentNode: branch, targetNode: short,
    });
    expect(resolveOfficialDragCandidate({ ...base, pointer: { x: 366, y: 96 } })).toMatchObject({
      kind: 'child', parentNode: short, targetNode: short,
    });
    expect(resolveOfficialDragCandidate({ ...base, pointer: { x: 405, y: 191 } })).toMatchObject({
      kind: 'child', parentNode: tall, targetNode: tall,
    });
  });

  it('keeps the current nearest target until a different target wins beyond hysteresis', () => {
    const parent = node('parent', { x: 20, y: 100, width: 80, height: 40 });
    const upper = node('upper', { x: 180, y: 70, width: 90, height: 34 }, parent);
    const lower = node('lower', { x: 180, y: 145, width: 90, height: 52 }, parent);
    parent.children = [upper, lower];
    const base = {
      layout: 'logicalStructure', nodes: [parent, upper, lower],
      getRect: (value: any) => value.rect,
    };
    const current = resolveOfficialDragCandidate({
      ...base, current: emptyOfficialDragCandidate(), pointer: { x: 195, y: 103 },
    });
    expect(current.targetNode).toBe(upper);
    const retained = resolveOfficialDragCandidate({
      ...base, current, pointer: { x: 195, y: 116 },
    });
    expect(retained.targetNode).toBe(upper);
    const switched = resolveOfficialDragCandidate({
      ...base, current: retained, pointer: { x: 205, y: 154 },
    });
    expect(switched.targetNode).toBe(lower);
  });

  it('uses one real-time candidate for parent guide, room preview and commit', () => {
    const source = readFileSync('src/core/YeMindDrag.ts', 'utf8');
    expect(source).toContain('this.flushOfficialCandidateCheck()');
    expect(source).toContain('? { stable: candidate, pending: null }');
    expect(source).toContain('stableTarget ?? plugin.mousedownNode?.parent');
    expect(source).toContain('nodeSceneRect(plugin, previewParent)');
    expect(source).toContain('this.updateLogicalRoomPreview(stable)');
    expect(source).toContain("'stroke-dasharray': '6 6'");
  });
});
