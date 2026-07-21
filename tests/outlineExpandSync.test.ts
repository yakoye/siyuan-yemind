import { describe, expect, it } from 'vitest';
import { flattenOutline, outlineStructureSignature } from '../src/editor/outline';

const tree = {
  data: { text: 'Root', uid: 'root', expand: true },
  children: [
    {
      data: { text: 'Branch', uid: 'branch', expand: false },
      children: [
        { data: { text: 'Hidden', uid: 'hidden', expand: true }, children: [] },
      ],
    },
    {
      data: { text: 'Open', uid: 'open', expand: true },
      children: [
        { data: { text: 'Visible', uid: 'visible', expand: true }, children: [] },
      ],
    },
  ],
};

describe('outline expand synchronization', () => {
  it('uses the persisted node expand state and hides descendants of collapsed branches', () => {
    const rows = flattenOutline(tree);
    expect(rows.map((row) => row.uid)).toEqual(['root', 'branch', 'open', 'visible']);
    expect(rows.find((row) => row.uid === 'branch')?.expanded).toBe(false);
  });

  it('includes expand state in the structural signature', () => {
    expect(outlineStructureSignature(tree)).toContain('branch:1:1:0');
  });
});
