import { describe, expect, it } from 'vitest';
import {
  collapseAllBranches,
  collapseBranchDeep,
  expandBranchOneLevel,
  expandRootOneLevel,
  toggleAllExpansion,
  toggleBranchExpansion,
} from '../../../src/core/expandState';
import type { MindMapTree } from '../../../src/model/types';

function sample(): MindMapTree {
  return {
    data: { uid: 'root', text: 'root', expand: true },
    children: [{
      data: { uid: 'a', text: 'A', expand: true },
      children: [{
        data: { uid: 'b', text: 'B', expand: true },
        children: [{ data: { uid: 'c', text: 'C', expand: true }, children: [] }],
      }],
    }],
  };
}

function state(tree: MindMapTree): Record<string, boolean | undefined> {
  const result: Record<string, boolean | undefined> = {};
  const visit = (node: MindMapTree): void => {
    result[String(node.data.uid)] = node.data.expand;
    node.children.forEach(visit);
  };
  visit(tree);
  return result;
}

describe('v0.9.26 deterministic expansion semantics', () => {
  it('collapses the selected branch and every descendant branch', () => {
    expect(state(collapseBranchDeep(sample(), 'a').tree)).toMatchObject({ root: true, a: false, b: false });
  });

  it('expands only one level and leaves descendants collapsed', () => {
    const collapsed = collapseBranchDeep(sample(), 'a').tree;
    expect(state(expandBranchOneLevel(collapsed, 'a').tree)).toMatchObject({ root: true, a: true, b: false });
    expect(state(toggleBranchExpansion(collapsed, 'a').tree)).toMatchObject({ a: true, b: false });
  });

  it('collapses all branches and restores only root first-level visibility', () => {
    const collapsed = collapseAllBranches(sample()).tree;
    expect(state(collapsed)).toMatchObject({ root: false, a: false, b: false });
    expect(state(expandRootOneLevel(collapsed).tree)).toMatchObject({ root: true, a: false, b: false });
    expect(state(toggleAllExpansion(collapsed).tree)).toMatchObject({ root: true, a: false, b: false });
  });
});
