import { describe, expect, it } from 'vitest';
import { describeNodeQuickActions } from '../../../src/editor/nodeQuickActions';

describe('node quick actions', () => {
  it('hides actions for an unselected expanded leaf', () => {
    expect(describeNodeQuickActions({ isRoot: false, childCount: 0, expanded: true, selected: false })).toEqual([]);
  });

  it('shows only add-child for a selected leaf node', () => {
    expect(describeNodeQuickActions({ isRoot: false, childCount: 0, expanded: true, selected: true })).toEqual([
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
  });

  it('shows collapse and add-child for a selected expanded branch', () => {
    expect(describeNodeQuickActions({ isRoot: false, childCount: 3, expanded: true, selected: true })).toEqual([
      { action: 'collapse', label: '折叠 3 个子孙节点', text: '−' },
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
  });

  it('hides actions for an unselected expanded branch', () => {
    expect(describeNodeQuickActions({ isRoot: false, childCount: 3, expanded: true, selected: false })).toEqual([]);
  });

  it('shows only descendant count for a collapsed branch regardless of selection', () => {
    expect(describeNodeQuickActions({ isRoot: false, childCount: 5, expanded: false, selected: false })).toEqual([
      { action: 'expand', label: '展开 5 个子孙节点', text: '5' },
    ]);
    expect(describeNodeQuickActions({ isRoot: false, childCount: 5, expanded: false, selected: true })).toEqual([
      { action: 'expand', label: '展开 5 个子孙节点', text: '5' },
    ]);
  });

  it('gives Root the same collapse and expand behavior as other branches', () => {
    expect(describeNodeQuickActions({ isRoot: true, childCount: 4, expanded: true, selected: true })).toEqual([
      { action: 'collapse', label: '折叠 4 个子孙节点', text: '−' },
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
    expect(describeNodeQuickActions({ isRoot: true, childCount: 4, expanded: false, selected: true })).toEqual([
      { action: 'expand', label: '展开 4 个子孙节点', text: '4' },
    ]);
  });
});

import { vi } from 'vitest';
import { NodeQuickActionsController } from '../../../src/editor/nodeQuickActions';

it('routes the collapsed count button to an explicit expand command for Root', () => {
  const root = document.createElement('div');
  root.innerHTML = '<div class="ymz-canvas-wrap"></div>';
  document.body.appendChild(root);
  Object.defineProperty(root, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON() {} }),
  });
  const svgNode = document.createElement('div');
  Object.defineProperty(svgNode, 'getBoundingClientRect', {
    value: () => ({ left: 50, top: 40, right: 150, bottom: 80, width: 100, height: 40, x: 50, y: 40, toJSON() {} }),
  });
  const rendererRoot: any = {
    isRoot: true,
    children: [{ children: [], nodeData: { children: [] } }],
    nodeData: { children: [{ children: [], nodeData: { children: [] } }] },
    group: { node: svgNode },
    getData: (key: string) => ({ uid: 'root', expand: false, isActive: true } as any)[key],
  };
  const onSetExpanded = vi.fn();
  const controller = new NodeQuickActionsController({
    root,
    canvas: root,
    getRendererRoot: () => rendererRoot,
    getActiveNodes: () => [rendererRoot],
    readonly: () => false,
    onAddChild: vi.fn(),
    onSetExpanded,
  });
  controller.refresh();

  const count = root.querySelector<HTMLButtonElement>('[data-node-quick-action="expand"]')!;
  expect(count.textContent).toBe('1');
  count.click();
  expect(onSetExpanded).toHaveBeenCalledWith('root', true);
  controller.destroy();
  root.remove();
});
