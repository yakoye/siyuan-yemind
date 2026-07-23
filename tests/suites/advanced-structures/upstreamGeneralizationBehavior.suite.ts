import { describe, expect, it, vi } from 'vitest';
import { parseAddGeneralizationNodeList } from 'simple-mind-map/src/utils/index';
import { createCommandAdapter } from '../../../src/core/commands';
import { addCombinedSummary, createCombinedSummaryPlan } from '../../../src/core/combinedSummary';
import { createSummaryMenuDescriptor } from '../../../src/ui/nodeContentMenu';

function sibling(parent: object, index: number) {
  return {
    parent,
    getIndexInBrothers: () => index,
  };
}

describe('upstream generalization behavior', () => {
  it('delegates multi-sibling range calculation to the upstream helper', () => {
    const parent = { uid: 'parent-1' };
    const selected = [sibling(parent, 1), sibling(parent, 3)];

    expect(parseAddGeneralizationNodeList(selected as never)).toEqual([
      { node: parent, range: [1, 3] },
    ]);
  });

  it('uses native summary commands for add, parent-wide removal, and selected summary removal', () => {
    const execCommand = vi.fn();
    const normalNode = {
      isGeneralization: false,
      checkHasGeneralization: () => true,
    };
    const renderer = { activeNodeList: [normalNode] };
    const commands = createCommandAdapter({ execCommand, renderer } as never);

    commands.addSummary();
    commands.removeSummary();

    renderer.activeNodeList = [{ isGeneralization: true }];
    commands.removeSummary();

    expect(execCommand.mock.calls).toEqual([
      ['ADD_GENERALIZATION'],
      ['REMOVE_GENERALIZATION'],
      ['REMOVE_NODE', [renderer.activeNodeList[0]]],
    ]);
  });

  it('shows precise add and remove labels without inventing summary state', () => {
    expect(createSummaryMenuDescriptor([{ isGeneralization: false, checkHasGeneralization: () => false }])).toEqual({
      action: 'add',
      label: '添加概要',
      warning: false,
    });
    expect(createSummaryMenuDescriptor([
      { isGeneralization: false, checkHasGeneralization: () => false },
      { isGeneralization: false, checkHasGeneralization: () => false },
    ])).toEqual({
      action: 'add',
      label: '为所选节点添加综合概要',
      warning: false,
    });
    expect(createSummaryMenuDescriptor([{ isGeneralization: true }])).toEqual({
      action: 'remove-current',
      label: '删除当前概要',
      warning: true,
    });
    expect(createSummaryMenuDescriptor([{ isGeneralization: false, checkHasGeneralization: () => true }])).toEqual({
      action: 'remove-all',
      label: '删除该节点全部概要',
      warning: true,
    });
  });
});


describe('v0.9.14 combined multi-selection summary', () => {
  function node(uid: string, parent: any = null) {
    return {
      uid, parent, children: [] as any[], isRoot: false, isGeneralization: false,
      getData: vi.fn((key?: string) => key === 'generalization' ? null : key === 'uid' ? uid : undefined),
      checkHasSelfGeneralization: vi.fn(() => false),
      getIndexInBrothers() { return parent?.children.indexOf(this) ?? -1; },
    };
  }

  it('projects sibling selections to one contiguous parent range', () => {
    const parent = node('parent');
    const a = node('a', parent);
    const gap = node('gap', parent);
    const c = node('c', parent);
    parent.children = [a, gap, c];
    expect(createCombinedSummaryPlan([a, c])).toMatchObject({ owner: parent, range: [0, 2], commandNodes: [a, c] });
  });

  it('projects selections from different branches to one range under their lowest common ancestor', () => {
    const root = { ...node('root'), isRoot: true };
    const left = node('left', root);
    const right = node('right', root);
    root.children = [left, right];
    const leftLeaf = node('left-leaf', left);
    const rightLeaf = node('right-leaf', right);
    left.children = [leftLeaf];
    right.children = [rightLeaf];
    expect(createCombinedSummaryPlan([leftLeaf, rightLeaf])).toMatchObject({ owner: root, range: [0, 1], commandNodes: [left, right] });
  });

  it('folds selected descendants into a selected ancestor instead of creating one summary per node', () => {
    const branch = node('branch');
    const leaf = node('leaf', branch);
    branch.children = [leaf];
    expect(createCombinedSummaryPlan([branch, leaf])).toMatchObject({ owner: branch, range: null, commandNodes: [branch] });
  });

  it('executes ADD_GENERALIZATION once with the combined native range endpoints', () => {
    const parent = node('parent');
    const a = node('a', parent);
    const b = node('b', parent);
    parent.children = [a, b];
    const original = [a, b];
    const renderer = {
      activeNodeList: original as any[],
      clearActiveNodeList: vi.fn(function (this: any) { this.activeNodeList = []; }),
      activeMultiNode: vi.fn(function (this: any, nodes: any[]) { this.activeNodeList = [...nodes]; }),
      emitNodeActiveEvent: vi.fn(),
    };
    const execCommand = vi.fn(() => {
      expect(renderer.activeNodeList).toEqual([a, b]);
      expect(a.checkHasSelfGeneralization()).toBe(false);
    });
    expect(addCombinedSummary({ renderer, execCommand }, original)).toBe(true);
    expect(execCommand).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith('ADD_GENERALIZATION');
    expect(renderer.activeNodeList).toEqual(original);
  });
});
