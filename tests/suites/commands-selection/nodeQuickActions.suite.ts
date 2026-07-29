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
      { action: 'collapse', label: '折叠 3 个下级节点', text: '−' },
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
  });

  it('hides actions for an unselected expanded branch', () => {
    expect(describeNodeQuickActions({ isRoot: false, childCount: 3, expanded: true, selected: false })).toEqual([]);
  });

  it('shows expand and add-child for a hovered or selected collapsed branch', () => {
    expect(describeNodeQuickActions({ isRoot: false, childCount: 5, expanded: false, selected: false })).toEqual([]);
    expect(describeNodeQuickActions({ isRoot: false, childCount: 5, expanded: false, selected: false, hovered: true })).toEqual([
      { action: 'expand', label: '展开 5 个下级节点', text: '5' },
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
    expect(describeNodeQuickActions({ isRoot: false, childCount: 5, expanded: false, selected: true })).toEqual([
      { action: 'expand', label: '展开 5 个下级节点', text: '5' },
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
  });

  it('gives Root the same collapse and expand behavior as other branches', () => {
    expect(describeNodeQuickActions({ isRoot: true, childCount: 4, expanded: true, selected: true })).toEqual([
      { action: 'collapse', label: '折叠 4 个下级节点', text: '−' },
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
    expect(describeNodeQuickActions({ isRoot: true, childCount: 4, expanded: false, selected: true })).toEqual([
      { action: 'expand', label: '展开 4 个下级节点', text: '4' },
      { action: 'add-child', label: '添加子节点', text: '+' },
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

it('positions quick actions in the canvas layer coordinate system in split view', () => {
  const root = document.createElement('div');
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'ymz-canvas-wrap';
  const canvas = document.createElement('div');
  canvas.className = 'ymz-canvas';
  canvasWrap.appendChild(canvas);
  root.appendChild(canvasWrap);
  document.body.appendChild(root);
  Object.defineProperty(root, 'getBoundingClientRect', {
    value: () => ({ left: 20, top: 30, right: 1220, bottom: 830, width: 1200, height: 800, x: 20, y: 30, toJSON() {} }),
  });
  Object.defineProperty(canvasWrap, 'getBoundingClientRect', {
    value: () => ({ left: 20, top: 30, right: 1220, bottom: 830, width: 1200, height: 800, x: 20, y: 30, toJSON() {} }),
  });
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({ left: 180, top: 90, right: 860, bottom: 730, width: 680, height: 640, x: 180, y: 90, toJSON() {} }),
  });
  const svgNode = document.createElement('div');
  Object.defineProperty(svgNode, 'getBoundingClientRect', {
    value: () => ({ left: 420, top: 250, right: 520, bottom: 290, width: 100, height: 40, x: 420, y: 250, toJSON() {} }),
  });
  const rendererRoot: any = {
    isRoot: true,
    children: [],
    nodeData: { children: [] },
    group: { node: svgNode },
    getData: (key: string) => ({ uid: 'root', expand: true, isActive: true } as any)[key],
  };
  const controller = new NodeQuickActionsController({
    root,
    canvas,
    getRendererRoot: () => rendererRoot,
    getActiveNodes: () => [rendererRoot],
    readonly: () => false,
    onAddChild: vi.fn(),
    onSetExpanded: vi.fn(),
  });

  controller.refresh();

  const layer = root.querySelector<HTMLElement>('.ymz-node-quick-actions-layer')!;
  const actions = layer.querySelector<HTMLElement>('.ymz-node-quick-actions')!;
  expect(layer.parentElement).toBe(canvas);
  expect(actions.style.left).toBe('340px');
  expect(actions.style.top).toBe('180px');
  controller.destroy();
  root.remove();
});
