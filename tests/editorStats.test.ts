import { describe, expect, it } from 'vitest';
import { calculateEditorStats } from '../src/editor/editorStats';
import type { MindMapTree } from '../src/model/types';

const tree: MindMapTree = {
  data: { text: '根 节点', expand: true },
  children: [
    { data: { text: '<b>第一项</b>' }, children: [] },
    {
      data: { text: '第二项 test' },
      children: [{ data: { text: 'child' }, children: [] }],
    },
  ],
};

describe('calculateEditorStats', () => {
  it('counts roots, all nodes and visible text words', () => {
    expect(calculateEditorStats(tree)).toEqual({
      roots: 1,
      nodes: 4,
      words: 6,
    });
  });
});
