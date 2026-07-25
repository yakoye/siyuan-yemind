import { describe, expect, it } from 'vitest';
import {
  collapseAllBranches,
  collapseBranchDeep,
  expandAllBranches,
  expandBranchDeep,
  expandBranchOneLevel,
} from '../../../src/core/expandState';

const tree = () => ({
  data: { uid: 'root', text: 'root', expand: true },
  children: [{
    data: { uid: 'a', text: 'a', expand: false },
    children: [{ data: { uid: 'a1', text: 'a1', expand: false }, children: [{ data: { uid: 'a11', text: 'a11' }, children: [] }] }],
  }, { data: { uid: 'b', text: 'b', expand: false }, children: [] }],
});

describe('v0.9.30 expansion scopes', () => {
  it('fully expands and collapses the selected subtree for context-menu actions', () => {
    const expanded = expandBranchDeep(tree(), 'a').tree;
    expect(expanded.children![0].data.expand).toBe(true);
    expect(expanded.children![0].children![0].data.expand).toBe(true);
    const collapsed = collapseBranchDeep(expanded, 'a').tree;
    expect(collapsed.children![0].data.expand).toBe(false);
    expect(collapsed.children![0].children![0].data.expand).toBe(false);
  });

  it('keeps quick expansion limited to one level', () => {
    const expanded = expandBranchOneLevel(tree(), 'a').tree;
    expect(expanded.children![0].data.expand).toBe(true);
    expect(expanded.children![0].children![0].data.expand).toBe(false);
  });

  it('fully expands and collapses the whole map for canvas actions', () => {
    const expanded = expandAllBranches(tree()).tree;
    expect(expanded.data.expand).toBe(true);
    expect(expanded.children![0].data.expand).toBe(true);
    expect(expanded.children![0].children![0].data.expand).toBe(true);
    const collapsed = collapseAllBranches(expanded).tree;
    expect(collapsed.data.expand).toBe(false);
    expect(collapsed.children![0].data.expand).toBe(false);
  });
});
