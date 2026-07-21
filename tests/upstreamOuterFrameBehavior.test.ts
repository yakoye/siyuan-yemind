import { describe, expect, it } from 'vitest';
import { parseAddNodeList } from 'simple-mind-map/src/plugins/outerFrame/outerFrameUtils.js';

function createParent(uid: string) {
  return { uid, children: [] as any[] };
}

function createNode(uid: string, parent: ReturnType<typeof createParent>, index: number, ancestorOf: string[] = []) {
  const node = {
    uid,
    parent,
    getIndexInBrothers: () => index,
    isAncestor: (candidate: { uid: string }) => ancestorOf.includes(candidate.uid),
  };
  parent.children[index] = node;
  return node;
}

describe('locked upstream outer-frame grouping behavior', () => {
  it('groups continuous siblings and splits non-continuous or different-parent selections', () => {
    const parentA = createParent('parent-a');
    const parentB = createParent('parent-b');
    const a0 = createNode('a0', parentA, 0);
    const a1 = createNode('a1', parentA, 1);
    const a2 = createNode('a2', parentA, 2);
    const a4 = createNode('a4', parentA, 4);
    const b0 = createNode('b0', parentB, 0);

    expect(parseAddNodeList([a0, a1, a2, a4, b0])).toEqual([
      { node: parentA, range: [0, 2] },
      { node: parentA, range: [4, 4] },
      { node: parentB, range: [0, 0] },
    ]);
  });

  it('keeps only the top ancestor when a selected parent also contains a selected descendant', () => {
    const root = createParent('root');
    const childParent = createParent('child-parent');
    const parent = createNode('parent', root, 0, ['child']);
    const child = createNode('child', childParent, 0);
    expect(parseAddNodeList([parent, child])).toEqual([{ node: root, range: [0, 0] }]);
  });
});
