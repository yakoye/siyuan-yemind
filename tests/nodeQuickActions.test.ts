import { describe, expect, it } from 'vitest';
import { describeNodeQuickActions } from '../src/editor/nodeQuickActions';

describe('node quick actions', () => {
  it('shows only add-child for a leaf node', () => {
    expect(describeNodeQuickActions({ isRoot: false, childCount: 0, expanded: true })).toEqual([
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
  });

  it('shows collapse and add-child for an expanded branch', () => {
    expect(describeNodeQuickActions({ isRoot: false, childCount: 3, expanded: true })).toEqual([
      { action: 'collapse', label: '折叠 3 个子孙节点', text: '−' },
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
  });

  it('shows descendant count and add-child for a collapsed branch', () => {
    expect(describeNodeQuickActions({ isRoot: false, childCount: 5, expanded: false })).toEqual([
      { action: 'expand', label: '展开 5 个子孙节点', text: '5' },
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
  });

  it('never exposes a collapse control for Root itself', () => {
    expect(describeNodeQuickActions({ isRoot: true, childCount: 4, expanded: true })).toEqual([
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
  });
});
