import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../../../src/core/commands';
import { supportsOfficialDragGeometry } from '../../../src/core/officialDragIntent';
import {
  describeNodeQuickActions,
  resolveNodeQuickActionAnchorForLayout,
  resolveNodeQuickActionSide,
} from '../../../src/editor/nodeQuickActions';

const layouts = [
  ['logicalStructure', 'right'],
  ['logicalStructureLeft', 'left'],
  ['mindMap', 'right'],
  ['organizationStructure', 'bottom'],
  ['catalogOrganization', 'bottom'],
] as const;

function fakeMap(layout: string) {
  const root = { isRoot: true, isGeneralization: false, layerIndex: 0, children: [] as unknown[] };
  const branch = { isRoot: false, isGeneralization: false, layerIndex: 1, parent: root, children: [] as unknown[] };
  const leaf = { isRoot: false, isGeneralization: false, layerIndex: 2, parent: branch, children: [] as unknown[] };
  root.children = [branch];
  branch.children = [leaf];
  return {
    opt: { readonly: false, layout },
    renderer: {
      activeNodeList: [branch],
      findNodeByUid: vi.fn((uid: string) => ({ root, branch, leaf } as const)[uid as 'root' | 'branch' | 'leaf'] ?? null),
      toggleActiveExpand: vi.fn(),
    },
    execCommand: vi.fn(),
    updateData: vi.fn(),
    view: { fit: vi.fn(), reset: vi.fn(), enlarge: vi.fn(), narrow: vi.fn() },
  };
}

describe('v1.3.0 map interaction matrix', () => {
  it.each(layouts)('keeps CRUD, history, collapse and drag commands available in %s', (layout) => {
    const map = fakeMap(layout);
    const commands = createCommandAdapter(map as never);

    expect(commands.setNodeTextByUid('branch', '已编辑')).toBe(true);
    expect(commands.insertSiblingByUid('branch', 'sibling')).toBe(true);
    expect(commands.insertChildByUid('branch', 'child')).toBe(true);
    expect(commands.removeNodeByUid('leaf')).toBe(true);
    expect(commands.setNodeExpandedByUid('branch', false)).toBe(true);
    commands.undo();
    commands.redo();

    expect(map.execCommand.mock.calls.map((call) => call[0])).toEqual([
      'SET_NODE_TEXT',
      'INSERT_NODE',
      'INSERT_CHILD_NODE',
      'REMOVE_NODE',
      'SET_NODE_EXPAND',
      'BACK',
      'FORWARD',
    ]);
    expect(supportsOfficialDragGeometry(layout)).toBe(true);
  });

  it.each(layouts)('places +, − and child counts at the outgoing connector in %s', (layout, expectedSide) => {
    const node = { layerIndex: 1, dir: expectedSide };
    const rect = { left: 100, top: 80, width: 120, height: 44 };
    expect(resolveNodeQuickActionSide(layout, node)).toBe(expectedSide);
    const anchor = resolveNodeQuickActionAnchorForLayout(layout, node, rect);
    expect(anchor.side).toBe(expectedSide);
    if (expectedSide === 'left' || expectedSide === 'right') expect(anchor.y).toBe(102);
    else expect(anchor.x).toBe(160);

    expect(describeNodeQuickActions({
      isRoot: false,
      childCount: 3,
      expanded: false,
      selected: true,
    })).toEqual([
      expect.objectContaining({ action: 'expand', text: '3' }),
      expect.objectContaining({ action: 'add-child', text: '+' }),
    ]);
  });

  it('protects Root while allowing Root collapse and child insertion', () => {
    const map = fakeMap('logicalStructure');
    const commands = createCommandAdapter(map as never);
    expect(commands.removeNodeByUid('root')).toBe(false);
    expect(commands.insertSiblingByUid('root', 'illegal')).toBe(false);
    expect(commands.insertChildByUid('root', 'child')).toBe(true);
    expect(commands.setNodeExpandedByUid('root', false)).toBe(true);
  });
});
