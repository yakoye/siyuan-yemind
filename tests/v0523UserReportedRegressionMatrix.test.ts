import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../src/core/commands';
import { describeNodeQuickActions } from '../src/editor/nodeQuickActions';
import { isEditableTarget } from '../src/editor/shortcuts';

function collapsedNode(isRoot = false) {
  return {
    isRoot,
    isGeneralization: false,
    children: [],
    nodeData: { children: [{ data: { uid: 'child' }, children: [] }] },
    getData: vi.fn((key?: string) => key === 'uid' ? (isRoot ? 'root' : 'branch') : key === 'expand' ? false : undefined),
  };
}

describe('user-reported interaction regression matrix', () => {
  it('keeps node quick controls selection-aware and makes collapsed counts the only expansion control', () => {
    expect(describeNodeQuickActions({ isRoot: false, childCount: 0, expanded: true, selected: false })).toEqual([]);
    expect(describeNodeQuickActions({ isRoot: false, childCount: 0, expanded: true, selected: true }).map(x => x.action)).toEqual(['add-child']);
    expect(describeNodeQuickActions({ isRoot: false, childCount: 3, expanded: true, selected: true }).map(x => x.action)).toEqual(['collapse', 'add-child']);
    expect(describeNodeQuickActions({ isRoot: true, childCount: 3, expanded: true, selected: true }).map(x => x.action)).toEqual(['collapse', 'add-child']);
    expect(describeNodeQuickActions({ isRoot: true, childCount: 3, expanded: false, selected: true })).toEqual([
      expect.objectContaining({ action: 'expand', text: '3' }),
    ]);
  });

  it('expands collapsed Root and branch nodes from persisted children even when renderer children are empty', () => {
    for (const node of [collapsedNode(false), collapsedNode(true)]) {
      const map = {
        opt: { readonly: false },
        renderer: { activeNodeList: [], findNodeByUid: vi.fn(() => node) },
        execCommand: vi.fn(),
        view: {},
      } as any;
      const commands = createCommandAdapter(map);
      expect(commands.setNodeExpandedByUid(String(node.getData('uid')), true)).toBe(true);
      expect(map.execCommand).toHaveBeenCalledWith('SET_NODE_EXPAND', node, true);
    }
  });

  it('keeps Delete and Backspace inside every canvas/outline rich-text editing surface', () => {
    const outline = document.createElement('div');
    outline.dataset.outlineEditor = '';
    const outlineChild = document.createElement('span');
    outline.appendChild(outlineChild);
    const canvas = document.createElement('div');
    canvas.className = 'smm-richtext-node-edit-wrap';
    const qlEditor = document.createElement('div');
    qlEditor.className = 'ql-editor';
    qlEditor.contentEditable = 'true';
    canvas.appendChild(qlEditor);

    expect(isEditableTarget(outline)).toBe(true);
    expect(isEditableTarget(outlineChild)).toBe(true);
    expect(isEditableTarget(canvas)).toBe(true);
    expect(isEditableTarget(qlEditor)).toBe(true);
  });
});
