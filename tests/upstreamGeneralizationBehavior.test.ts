import { describe, expect, it, vi } from 'vitest';
import { parseAddGeneralizationNodeList } from 'simple-mind-map/src/utils/index';
import { createCommandAdapter } from '../src/core/commands';
import { createSummaryMenuDescriptor } from '../src/ui/nodeContentMenu';

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
      ['REMOVE_NODE'],
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
      label: '为所选节点添加概要',
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
