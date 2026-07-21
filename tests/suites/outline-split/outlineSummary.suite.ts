import { describe, expect, it } from 'vitest';
import { flattenOutline } from '../../../src/editor/outline';

const tree = {
  data: {
    uid: 'root',
    text: 'Root',
    expand: true,
    generalization: {
      uid: 'summary-root',
      text: '总体概要',
      richText: false,
      generalizationNode: true,
    },
  },
  children: [
    { data: { uid: 'a', text: 'A', expand: true }, children: [] },
  ],
};

describe('outline native summaries', () => {
  it('exposes native generalizations as editable outline rows', () => {
    const rows = flattenOutline(tree as never);
    expect(rows.map((row) => row.uid)).toContain('summary-root');
    expect(rows.find((row) => row.uid === 'summary-root')).toMatchObject({
      text: '总体概要',
      isGeneralization: true,
      hasChildren: false,
    });
  });
});
