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
      { uid: 'r', text: 'Root', html: '<b>Root</b>', richText: true, depth: 0, hasChildren: true, expanded: true, isRoot: true, pristine: false },
      { uid: 'a', text: 'Child A', html: 'Child A', richText: false, depth: 1, hasChildren: false, expanded: true, isRoot: false, pristine: false },
      { uid: 'b', text: 'Child B', html: 'Child B', richText: false, depth: 1, hasChildren: true, expanded: true, isRoot: false, pristine: false },
      { uid: 'g', text: 'Grandchild', html: 'Grandchild', richText: false, depth: 2, hasChildren: false, expanded: true, isRoot: false, pristine: false },
    ]);
  });
});
