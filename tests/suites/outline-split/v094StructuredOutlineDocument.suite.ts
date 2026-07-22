import { describe, expect, it } from 'vitest';
import {
  buildTreeFromStructuredOutline,
  flattenStructuredOutline,
  normalizeStructuredOutlineDepths,
  parseStructuredOutlinePaste,
  serializeStructuredOutlineBlocks,
  structuredOutlineIsRichHtml,
} from '../../../src/editor/structuredOutlineDocument';
import type { MindMapTree } from '../../../src/model/types';

const baseTree: MindMapTree = {
  data: { uid: 'root', text: 'Root', tag: ['root-meta'], expand: true },
  children: [
    {
      data: { uid: 'a', text: 'A', tag: ['keep-a'], expand: false },
      children: [{ data: { uid: 'a1', text: 'A.1', note: 'keep-note' }, children: [] }],
    },
    { data: { uid: 'b', text: 'B', fillColor: '#ffeeaa' }, children: [] },
  ],
};

describe('v0.9.4 structured outline document', () => {
  it('flattens the complete tree while marking collapsed descendants hidden', () => {
    const blocks = flattenStructuredOutline(baseTree);
    expect(blocks.map((block) => [block.uid, block.depth, block.hidden])).toEqual([
      ['root', 0, false],
      ['a', 1, false],
      ['a1', 2, true],
      ['b', 1, false],
    ]);
    expect(serializeStructuredOutlineBlocks(blocks)).toBe('Root\n    A\n        A.1\n    B');
  });

  it('keeps node identity and metadata when titles and hierarchy are rebuilt', () => {
    const blocks = flattenStructuredOutline(baseTree).map((block) =>
      block.uid === 'a' ? { ...block, html: 'Renamed A', text: 'Renamed A', expanded: true } : block,
    );
    const result = buildTreeFromStructuredOutline(baseTree, blocks);
    expect(result.reusedNodeCount).toBe(4);
    expect(result.createdNodeCount).toBe(0);
    expect(result.tree.children[0].data).toMatchObject({
      uid: 'a',
      text: 'Renamed A',
      tag: ['keep-a'],
      expand: true,
    });
    expect(result.tree.children[0].children[0].data).toMatchObject({ uid: 'a1', note: 'keep-note' });
    expect(result.tree.children[1].data).toMatchObject({ uid: 'b', fillColor: '#ffeeaa' });
  });

  it('treats browser paragraph and hard-break wrappers as plain text', () => {
    expect(structuredOutlineIsRichHtml('<p>Plain</p>')).toBe(false);
    expect(structuredOutlineIsRichHtml('<div>Line 1<br>Line 2</div>')).toBe(false);
    expect(structuredOutlineIsRichHtml('<p><strong>Bold</strong></p>')).toBe(true);
    expect(structuredOutlineIsRichHtml('<a href="https://example.com">Link</a>')).toBe(true);
  });

  it('normalizes illegal depth jumps and parses external indentation', () => {
    const parsed = parseStructuredOutlinePaste('Root\n        Too deep\n    Sibling');
    expect(parsed.map((line) => [line.text, line.depth])).toEqual([
      ['Root', 0],
      ['Too deep', 1],
      ['Sibling', 1],
    ]);
    const blocks = normalizeStructuredOutlineDepths([
      { ...flattenStructuredOutline(baseTree)[0], depth: 0 },
      { ...flattenStructuredOutline(baseTree)[1], depth: 5 },
    ]);
    expect(blocks.map((block) => block.depth)).toEqual([0, 1]);
  });
});
