import { describe, expect, it } from 'vitest';
import { copyNodeTree, getTopAncestorsFomNodeList } from 'simple-mind-map/src/utils/index';

describe('simple-mind-map clipboard behavior relied on by YeMind', () => {
  it('keeps only the highest selected ancestors so descendant subtrees are not duplicated', () => {
    const root: any = { uid: 'root', isAncestor: (node: any) => node === child || node === grandchild };
    const child: any = { uid: 'child', isAncestor: (node: any) => node === grandchild };
    const grandchild: any = { uid: 'grandchild', isAncestor: () => false };

    expect(getTopAncestorsFomNodeList([root, child, grandchild])).toEqual([root]);
    expect(getTopAncestorsFomNodeList([child, grandchild])).toEqual([child]);
  });

  it('copies the complete subtree while removing active state and node identifiers', () => {
    const source = {
      data: { uid: 'parent-id', text: 'Parent', isActive: true, custom: 'keep' },
      children: [{
        data: { uid: 'child-id', text: 'Child', isActive: true },
        children: [],
      }],
    };

    const copied = copyNodeTree({}, source, true);

    expect(copied).toEqual({
      data: { text: 'Parent', isActive: false, custom: 'keep' },
      children: [{
        data: { text: 'Child', isActive: false },
        children: [],
      }],
    });
  });
});
