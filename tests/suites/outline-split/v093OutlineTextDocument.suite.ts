import { describe, expect, it } from 'vitest';
import {
  editOutlineSelectionIndent,
  insertOutlineNewline,
  parseOutlineText,
  reconcileOutlineText,
  serializeOutlineText,
} from '../../../src/editor/outlineTextDocument';
import type { MindMapTree } from '../../../src/model/types';

const current: MindMapTree = {
  data: { uid: 'root', text: 'PCIe 学习', richText: false, expand: true },
  children: [
    { data: { uid: 'old-a', text: '旧章节', tag: ['keep'] }, children: [] },
  ],
};

const imported = `0.6 About This Book; 60
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

describe('v0.9.3 document outline parsing', () => {
  it('recognizes copied indentation and multiple top-level entries', () => {
    const parsed = parseOutlineText(imported);
    expect(parsed.indentWidth).toBe(4);
    expect(parsed.topLevelCount).toBe(1);
    expect(parsed.implicitRoot).toBe(false);
    expect(parsed.lines.map((line) => line.depth)).toEqual([0, 1, 1, 1, 2, 2, 2, 1, 2, 2, 2, 3, 3, 3, 3, 2, 3, 4, 4, 4, 1, 2, 3, 3, 4, 5, 5, 4, 4, 4, 4, 3, 4, 4]);
    expect(parsed.lines[7].text).toBe('1. Chapter 1: Background; 68');
  });

  it('uses indentation as the source of truth for the supplied copied table of contents', () => {
    let id = 0;
    const result = reconcileOutlineText(current, parseOutlineText(imported), () => `new-${++id}`);
    expect(result.implicitRoot).toBe(false);
    expect(result.tree.data.uid).toBe('root');
    expect(result.tree.data.text).toBe('0.6 About This Book; 60');
    expect(result.tree.children.map((node) => node.data.text)).toEqual([
      '0.6.1 The MindShare Technology Series; 60',
      '0.6.2 Cautionary Note; 61',
      '0.6.6 Documentation Conventions; 62',
      '1. Chapter 1: Background; 68',
      '2. Chapter 2: PCIe Architecture Overview; 98',
    ]);
    expect(result.nodeCount).toBe(34);
    expect(result.tree.children[2].children.map((node) => node.data.text)).toEqual([
      '0.6.6.1 PCI Express™; 62',
      '0.6.6.2 Hexadecimal Notation; 63',
      '0.6.6.3 Binary Notation; 63',
    ]);
    const chapterOne = result.tree.children[3];
    expect(chapterOne.children.map((node) => node.data.text)).toEqual([
      '1.1 Introduction; 68',
      '1.2 PCI and PCI-X; 69',
      '1.3 PCI Basics; 70',
      '1.4 PCI Bus Architecture Perspective; 77',
    ]);
    expect(chapterOne.children[3].children[0].children.map((node) => node.data.text)).toEqual([
      '1.4.1.1 Programmed I/O; 77',
      '1.4.1.2 Direct Memory Access (DMA); 78',
      '1.4.1.3 Peer-to-Peer; 79',
    ]);
    const chapterTwo = result.tree.children[4];
    expect(chapterTwo.children[0].children[1].children[0].children.map((node) => node.data.text)).toEqual([
      '2.1.2.1.1 Overcoming Problems; 100',
      '2.1.2.1.2 Bandwidth; 101',
    ]);
  });

  it('preserves the current root when pasted text truly has several zero-indent entries', () => {
    const result = reconcileOutlineText(current, parseOutlineText('Section A\n    A.1\nSection B'));
    expect(result.implicitRoot).toBe(true);
    expect(result.tree.data.text).toBe('PCIe 学习');
    expect(result.tree.children.map((node) => node.data.text)).toEqual(['Section A', 'Section B']);
  });

  it('uses a single first line as the explicit root and round-trips four-space text', () => {
    const source = 'New Root\n    Child\n        Grandchild';
    const result = reconcileOutlineText(current, parseOutlineText(source), () => 'new');
    expect(result.tree.data.uid).toBe('root');
    expect(result.tree.data.text).toBe('New Root');
    expect(serializeOutlineText(result.tree)).toBe(source);
  });

  it('retains stable metadata when an existing line is unchanged', () => {
    const source = 'PCIe 学习\n    旧章节';
    const result = reconcileOutlineText(current, parseOutlineText(source));
    expect(result.tree.children[0].data.uid).toBe('old-a');
    expect(result.tree.children[0].data.tag).toEqual(['keep']);
  });

  it('retains UID and metadata when a line is completely rewritten at the same structural path', () => {
    const result = reconcileOutlineText(current, parseOutlineText('PCIe 学习\n    完全不同的新标题'));
    expect(result.tree.children[0].data.uid).toBe('old-a');
    expect(result.tree.children[0].data.tag).toEqual(['keep']);
    expect(result.tree.children[0].data.text).toBe('完全不同的新标题');
    expect(result.tree.children[0].data.richText).toBe(false);
  });

  it('indents and outdents a multiline native selection', () => {
    const value = 'Root\nChild A\nChild B';
    const indented = editOutlineSelectionIndent(value, 5, value.length, false);
    expect(indented.value).toBe('Root\n    Child A\n    Child B');
    const outdented = editOutlineSelectionIndent(
      indented.value,
      indented.value.indexOf('Child A'),
      indented.value.length,
      true,
    );
    expect(outdented.value).toBe(value);
  });

  it('accepts common leading indentation, tabs and clamps impossible depth jumps', () => {
    const parsed = parseOutlineText('        Root\n\t\tChild\n                                Too deep');
    expect(parsed.indentWidth).toBe(4);
    expect(parsed.lines.map((line) => line.depth)).toEqual([0, 1, 2]);
    expect(parsed.lines.map((line) => line.text)).toEqual(['Root', 'Child', 'Too deep']);
  });

  it('continues the current indentation on Enter', () => {
    const value = 'Root\n        Child';
    const edit = insertOutlineNewline(value, value.length, value.length);
    expect(edit.value).toBe('Root\n        Child\n        ');
    expect(edit.selectionStart).toBe(edit.value.length);
  });
});
