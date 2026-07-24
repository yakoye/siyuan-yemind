import { describe, expect, it } from 'vitest';
import { parseOutlineTreeText, applyOutlineImport } from '../../../src/editor/outlineTreeImport';
import type { MindMapTree } from '../../../src/model/types';

const tree: MindMapTree = {
  data: { uid: 'root', text: '中心主题', expand: true },
  children: [{ data: { uid: 'target', text: '导入位置', expand: true }, children: [] }],
};

describe('v0.9.24 outline text import', () => {
  it('parses Unicode, Windows tree, indentation, Markdown and numbered outlines', () => {
    expect(parseOutlineTreeText('根\n├─ A\n│  └─ A1\n└─ B', 'unicode-tree').lines.map((line) => [line.depth, line.text]))
      .toEqual([[0, '根'], [1, 'A'], [2, 'A1'], [1, 'B']]);
    expect(parseOutlineTreeText('\\---root\n    +---src\n    |   \\---core\n    \\---tests', 'windows-tree').lines.map((line) => [line.depth, line.text]))
      .toEqual([[0, 'root'], [1, 'src'], [2, 'core'], [1, 'tests']]);
    expect(parseOutlineTreeText('根\n    A\n        A1\n    B', 'indent').lines.map((line) => line.depth)).toEqual([0, 1, 2, 1]);
    expect(parseOutlineTreeText('- 根\n  - A\n    - A1\n  - B', 'markdown').lines.map((line) => line.depth)).toEqual([0, 1, 2, 1]);
    expect(parseOutlineTreeText('1. 根\n1.1 A\n1.1.1 A1\n2. B', 'numbered').lines.map((line) => line.depth)).toEqual([0, 1, 2, 0]);
  });

  it('merges Unicode continuation lines and imports atomically beneath the selected node', () => {
    const parsed = parseOutlineTreeText('PCIe RAS\nReliability / Availability / Serviceability\n│\n├─ RAS D.E.S.\n│  调试 / 统计 / 错误注入\n└─ RAS DP', 'unicode-tree');
    expect(parsed.lines[0].text).toContain('Reliability');
    expect(parsed.lines[1].text).toContain('调试 / 统计 / 错误注入');
    const next = applyOutlineImport(tree, 'target', parsed, 'append-under-current');
    expect(next.children[0].children[0].data.text).toContain('PCIe RAS');
    expect(next.children[0].children[0].children.map((node) => node.data.text.split('\n')[0])).toEqual(['RAS D.E.S.', 'RAS DP']);
  });
  it('parses the reported PCIe RAS and Windows tree shapes without losing continuation text', () => {
    const pcie = parseOutlineTreeText(`PCIe RAS
Reliability / Availability / Serviceability

可靠性 / 可用性 / 可维护性
│
├─ 1. RAS D.E.S.
│    Debug / Statistics / Error Injection
│    调试 / 统计 / 错误注入
│    │
│    ├─ 1.1 Event Counter
│    │    事件计数器
│    │    └─ 主要寄存器
│    │         ├─ EVENT_COUNTER_CONTROL_REG
│    │         └─ EVENT_COUNTER_DATA_REG
│    └─ 1.2 Time-Based Analysis
└─ 2. RAS DP`, 'auto');
    expect(pcie.detectedMode).toBe('unicode-tree');
    expect(pcie.lines.map((line) => line.depth)).toEqual([0, 1, 2, 3, 4, 4, 2, 1]);
    expect(pcie.lines[0].text).toContain('可靠性 / 可用性 / 可维护性');
    expect(pcie.lines[1].text).toContain('Debug / Statistics / Error Injection');

    const windows = parseOutlineTreeText(`\\---lite-ime
|   \\---LiteIME-repo
|   |   \\---CMakeLists.txt
|   |   \\---README.md
|   |   \\---build
|   |   |   \\---CMakeFiles`, 'auto');
    expect(windows.detectedMode).toBe('windows-tree');
    expect(windows.lines.map((line) => [line.depth, line.text])).toEqual([
      [0, 'lite-ime'], [1, 'LiteIME-repo'], [2, 'CMakeLists.txt'],
      [2, 'README.md'], [2, 'build'], [3, 'CMakeFiles'],
    ]);
  });

});
