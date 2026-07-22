import { parseOutlineText, reconcileOutlineText, serializeOutlineText } from '../../src/editor/outlineTextDocument';
import type { MindMapTree } from '../../src/model/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const current: MindMapTree = {
  data: { uid: 'root', text: 'PCIe 学习', richText: false },
  children: [{ data: { uid: 'old', text: '旧章节', tag: ['keep'] }, children: [] }],
};
const source = `0.6 About This Book; 60
    0.6.1 The MindShare Technology Series; 60
    0.6.2 Cautionary Note; 61
    0.6.6 Documentation Conventions; 62
        0.6.6.1 PCI Express™; 62
        0.6.6.2 Hexadecimal Notation; 63
        0.6.6.3 Binary Notation; 63
    1. Chapter 1\\: Background; 68
        1.1 Introduction; 68
        1.2 PCI and PCI-X; 69
        1.3 PCI Basics; 70
            1.3.1 Basics of a PCI-Based System; 70
            1.3.2 PCI Bus Initiator and Target; 71
            1.3.3 Typical PCI Bus Cycle; 72
            1.3.4 Reflected-Wave Signaling; 75
        1.4 PCI Bus Architecture Perspective; 77
            1.4.1 PCI Transaction Models; 77
                1.4.1.1 Programmed I/O; 77
                1.4.1.2 Direct Memory Access (DMA); 78
                1.4.1.3 Peer-to-Peer; 79
    2. Chapter 2\\: PCIe Architecture Overview; 98
        2.1 Introduction to PCI Express; 98
            2.1.1 Software Backward Compatibility; 100
            2.1.2 Serial Transport; 100
                2.1.2.1 The Need for Speed; 100
                    2.1.2.1.1 Overcoming Problems; 100
                    2.1.2.1.2 Bandwidth; 101
                2.1.2.2 PCIe Bandwidth Calculation; 102
                2.1.2.3 Differential Signals; 103
                2.1.2.4 No Common Clock; 104
                2.1.2.5 Packet-based Protocol; 105
            2.1.3 Links and Lanes; 105
                2.1.3.1 Scalable Performance; 105
                2.1.3.2 Flexible Topology Options; 106`;
const parsed = parseOutlineText(source);
assert(parsed.indentWidth === 4, 'indent width mismatch');
assert(!parsed.implicitRoot && parsed.topLevelCount === 1, 'explicit root detection mismatch');
let index = 0;
const result = reconcileOutlineText(current, parsed, () => `new-${++index}`);
assert(result.tree.data.uid === 'root' && result.tree.data.text === '0.6 About This Book; 60', 'explicit root replacement mismatch');
assert(result.nodeCount === 34, 'full imported node count mismatch');
assert(result.tree.children.length === 5, 'first-level child count mismatch');
assert(result.tree.children[3].data.text === '1. Chapter 1: Background; 68', 'escaped colon normalization mismatch');
assert(result.tree.children[3].children.length === 4, 'chapter one children mismatch');
assert(result.tree.children[4].children[0].children[1].children[0].children.length === 2, 'five-level hierarchy mismatch');
const rewritten = reconcileOutlineText(current, parseOutlineText('PCIe 学习\n    完全不同的新标题'), () => `rewrite-${++index}`);
assert(rewritten.tree.children[0].data.uid === 'old', 'structural-path UID preservation mismatch');
assert(Array.isArray(rewritten.tree.children[0].data.tag) && rewritten.tree.children[0].data.tag[0] === 'keep', 'metadata preservation mismatch');
const explicit = reconcileOutlineText(current, parseOutlineText('Root\n    A\n        B'), () => `x-${++index}`);
assert(serializeOutlineText(explicit.tree) === 'Root\n    A\n        B', 'round trip mismatch');

export default {
  indentWidth: parsed.indentWidth,
  topLevelCount: parsed.topLevelCount,
  implicitRoot: parsed.implicitRoot,
  nodeCount: result.nodeCount,
  firstLevel: result.tree.children.map((node) => node.data.text),
  metadataPreservedOnRewrite: true,
  roundTrip: true,
};
