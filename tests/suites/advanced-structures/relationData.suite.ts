import { describe, expect, it } from 'vitest';
import { sanitizeAssociativeLines } from '../../../src/core/relationData';
import type { MindMapTree } from '../../../src/model/types';

function tree(): MindMapTree {
  return {
    data: { text: 'root', uid: 'root' },
    children: [
      {
        data: {
          text: 'source',
          uid: 'source',
          associativeLineTargets: ['target', 'missing', 'target', 'summary'],
          associativeLinePoint: [{ p: 1 }, { p: 2 }, { p: 3 }, { p: 4 }],
          associativeLineTargetControlOffsets: [{ c: 1 }, { c: 2 }, { c: 3 }, { c: 4 }],
          associativeLineText: { target: 'valid', missing: 'stale', summary: 'summary line' },
          associativeLineStyle: { target: { associativeLineColor: 'red' }, missing: { associativeLineColor: 'gray' } },
          generalization: {
            text: 'summary',
            uid: 'summary',
            associativeLineTargets: ['target', 'missing'],
            associativeLinePoint: [{ g: 1 }, { g: 2 }],
            associativeLineTargetControlOffsets: [{ gc: 1 }, { gc: 2 }],
            associativeLineText: { target: 'from summary', missing: 'stale' },
          },
        },
        children: [],
      },
      { data: { text: 'target', uid: 'target' }, children: [] },
    ],
  };
}

describe('relation persistence cleanup', () => {
  it('removes missing and duplicate targets while preserving index-aligned native data', () => {
    const original = tree();
    const result = sanitizeAssociativeLines(original);
    const source = result.tree.children[0].data as any;

    expect(result.changed).toBe(true);
    expect(source.associativeLineTargets).toEqual(['target', 'summary']);
    expect(source.associativeLinePoint).toEqual([{ p: 1 }, { p: 4 }]);
    expect(source.associativeLineTargetControlOffsets).toEqual([{ c: 1 }, { c: 4 }]);
    expect(source.associativeLineText).toEqual({ target: 'valid', summary: 'summary line' });
    expect(source.associativeLineStyle).toEqual({ target: { associativeLineColor: 'red' } });
  });

  it('treats native generalization UIDs as valid targets and sanitizes relations originating from them', () => {
    const result = sanitizeAssociativeLines(tree());
    const summary = (result.tree.children[0].data as any).generalization;

    expect(summary.associativeLineTargets).toEqual(['target']);
    expect(summary.associativeLinePoint).toEqual([{ g: 1 }]);
    expect(summary.associativeLineTargetControlOffsets).toEqual([{ gc: 1 }]);
    expect(summary.associativeLineText).toEqual({ target: 'from summary' });
  });

  it('does not mutate the editor-owned tree and reports clean data accurately', () => {
    const original = tree();
    const snapshot = JSON.parse(JSON.stringify(original));
    sanitizeAssociativeLines(original);
    expect(original).toEqual(snapshot);

    const clean: MindMapTree = {
      data: { text: 'root', uid: 'root' },
      children: [{
        data: { text: 'a', uid: 'a', associativeLineTargets: ['root'] },
        children: [],
      }],
    };
    expect(sanitizeAssociativeLines(clean).changed).toBe(false);
  });
});
