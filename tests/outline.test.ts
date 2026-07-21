import { describe, expect, it } from 'vitest';
import { flattenOutline } from '../src/editor/outline';

const tree = {
  data: { text: '<b>Root</b>', richText: true, uid: 'r' },
  children: [
    { data: { text: 'Child A', uid: 'a' }, children: [] },
    { data: { text: 'Child B', uid: 'b' }, children: [
      { data: { text: 'Grandchild', uid: 'g' }, children: [] },
    ] },
  ],
};

describe('outline view model', () => {
  it('flattens the tree with depth, uid and plain text', () => {
    expect(flattenOutline(tree)).toEqual([
      { uid: 'r', text: 'Root', depth: 0, hasChildren: true, isRoot: true },
      { uid: 'a', text: 'Child A', depth: 1, hasChildren: false, isRoot: false },
      { uid: 'b', text: 'Child B', depth: 1, hasChildren: true, isRoot: false },
      { uid: 'g', text: 'Grandchild', depth: 2, hasChildren: false, isRoot: false },
    ]);
  });
});
