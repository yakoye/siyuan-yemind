import type { MindMapTree } from '../../src/model/types';
import {
  buildTreeFromStructuredOutline,
  flattenStructuredOutline,
  normalizeStructuredOutlineDepths,
  parseStructuredOutlinePaste,
  serializeStructuredOutlineBlocks,
  structuredOutlineIsRichHtml,
} from '../../src/editor/structuredOutlineDocument';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const current: MindMapTree = {
  data: { uid: 'root', text: 'Root', tag: ['root-meta'], expand: true },
  children: [
    {
      data: { uid: 'a', text: 'Alpha', tag: ['keep-a'], expand: false },
      children: [{ data: { uid: 'a1', text: 'Old child', yemindNote: { html: 'keep-note', createdAt: 1, updatedAt: 1 } }, children: [] }],
    },
    { data: { uid: 'b', text: 'Beta', fillColor: '#ffeeaa' }, children: [] },
  ],
};

const flattened = flattenStructuredOutline(current);
assert(flattened.length === 4, 'complete tree must be projected');
assert(flattened.find((block) => block.uid === 'a1')?.hidden === true, 'collapsed descendants must remain in the logical document');
assert(serializeStructuredOutlineBlocks(flattened) === 'Root\n    Alpha\n        Old child\n    Beta', 'indented serialization mismatch');

const richBlocks = flattened.map((block) => block.uid === 'a'
  ? { ...block, text: 'AA New', html: '<a href="https://prefix.example">AA</a> New', expanded: true }
  : block.uid === 'b'
    ? { ...block, text: 'Next ZZ', html: 'Next <a href="https://suffix.example">ZZ</a>' }
    : block);
const rebuilt = buildTreeFromStructuredOutline(current, richBlocks);
assert(rebuilt.reusedNodeCount === 4 && rebuilt.createdNodeCount === 0, 'stable UID reuse mismatch');
assert(rebuilt.tree.children[0].data.uid === 'a', 'existing node UID must survive replacement');
assert(rebuilt.tree.children[0].data.tag?.[0] === 'keep-a', 'node metadata must survive replacement');
assert(rebuilt.tree.children[0].children[0].data.yemindNote?.html === 'keep-note', 'child metadata must survive replacement');
assert(rebuilt.tree.children[0].data.richText === true && String(rebuilt.tree.children[0].data.text).includes('prefix.example'), 'rich prefix markup must survive model reconciliation');
assert(rebuilt.tree.children[1].data.richText === true && String(rebuilt.tree.children[1].data.text).includes('suffix.example'), 'rich suffix markup must survive model reconciliation');
assert(structuredOutlineIsRichHtml('<p>Plain</p>') === false, 'browser paragraph wrappers must not force rich text');
assert(structuredOutlineIsRichHtml('<strong>Bold</strong>') === true, 'meaningful formatting must remain rich text');

const parsed = parseStructuredOutlinePaste('Root\n        Too deep\n    Sibling');
assert(JSON.stringify(parsed.map((line) => [line.text, line.depth])) === JSON.stringify([
  ['Root', 0],
  ['Too deep', 1],
  ['Sibling', 1],
]), 'external indentation normalization mismatch');
const normalized = normalizeStructuredOutlineDepths([
  { ...flattened[0], depth: 0 },
  { ...flattened[1], depth: 8 },
]);
assert(normalized[1].depth === 1, 'illegal hierarchy jumps must collapse to one level');

export default {
  projectedNodes: flattened.length,
  hiddenDescendantsRetained: true,
  stableUidAndMetadata: true,
  richBoundaryMarkup: true,
  indentationNormalized: true,
};
