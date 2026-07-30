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

it('anchors outline-driven selection to the current rendered node by UID after rerender', () => {
  const root = document.createElement('div');
  const canvas = document.createElement('div');
  root.appendChild(canvas);
  document.body.appendChild(root);
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({ left: 100, top: 80, right: 900, bottom: 680, width: 800, height: 600, x: 100, y: 80, toJSON() {} }),
  });
  const liveElement = document.createElement('div');
  Object.defineProperty(liveElement, 'isConnected', { value: true });
  Object.defineProperty(liveElement, 'getBoundingClientRect', {
    value: () => ({ left: 360, top: 260, right: 560, bottom: 300, width: 200, height: 40, x: 360, y: 260, toJSON() {} }),
  });
  const liveNode: any = {
    isRoot: false,
    children: [],
    nodeData: { children: [] },
    group: { node: liveElement },
    getData: (key: string) => ({ uid: 'a', expand: true, isActive: false } as any)[key],
  };
  const staleActiveNode = {
    getData: (key: string) => key === 'uid' ? 'a' : undefined,
  };
  const controller = new NodeQuickActionsController({
    root,
    canvas,
    getRendererRoot: () => liveNode,
    getActiveNodes: () => [staleActiveNode],
    readonly: () => false,
    onAddChild: vi.fn(),
    onSetExpanded: vi.fn(),
  });

  controller.refresh();

  const actions = canvas.querySelector<HTMLElement>('[data-node-uid="a"]')!;
  expect(actions).not.toBeNull();
  expect(actions.style.left).toBe('460px');
  expect(actions.style.top).toBe('200px');
  controller.destroy();
  root.remove();
});

it('tracks every viewport transform with one non-starving refresh per animation frame', () => {
  const root = document.createElement('div');
  const canvas = document.createElement('div');
  root.appendChild(canvas);
  document.body.appendChild(root);
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({ left: 100, top: 80, right: 900, bottom: 680, width: 800, height: 600, x: 100, y: 80, toJSON() {} }),
  });
  let nodeLeft = 360;
  const liveElement = document.createElement('div');
  const descendantGroup = document.createElement('div');
  const descendantHoverRect = document.createElement('div');
  descendantHoverRect.className = 'smm-hover-node';
  descendantGroup.appendChild(descendantHoverRect);
  liveElement.appendChild(descendantGroup);
  const liveHoverRect = document.createElement('div');
  liveHoverRect.className = 'smm-hover-node';
  liveElement.appendChild(liveHoverRect);
  Object.defineProperty(liveElement, 'getBoundingClientRect', {
    value: () => ({
      left: nodeLeft,
      top: 260,
      right: nodeLeft + 100,
      bottom: 300,
      width: 100,
      height: 40,
      x: nodeLeft,
      y: 260,
      toJSON() {},
    }),
  });
  Object.defineProperty(liveHoverRect, 'getBoundingClientRect', {
    value: () => ({
      left: nodeLeft - 5,
      top: 255,
      right: nodeLeft + 205,
      bottom: 305,
      width: 210,
      height: 50,
      x: nodeLeft - 5,
      y: 255,
      toJSON() {},
    }),
  });
  Object.defineProperty(descendantHoverRect, 'getBoundingClientRect', {
    value: () => ({
      left: nodeLeft + 300,
      top: 255,
      right: nodeLeft + 500,
      bottom: 305,
      width: 200,
      height: 50,
      x: nodeLeft + 300,
      y: 255,
      toJSON() {},
    }),
  });
  const liveNode: any = {
    isRoot: false,
    children: [],
    nodeData: { children: [] },
    group: { node: liveElement },
    getData: (key: string) => ({ uid: 'a', expand: true, isActive: true } as any)[key],
  };
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const viewportEventSource = {
    on: vi.fn((name: string, listener: (...args: any[]) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(listener);
    }),
    off: vi.fn((name: string, listener: (...args: any[]) => void) => {
      listeners.get(name)?.delete(listener);
    }),
  };
  const frames: FrameRequestCallback[] = [];
  const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  const controller = new NodeQuickActionsController({
    root,
    canvas,
    viewportEventSource,
    getRendererRoot: () => liveNode,
    getActiveNodes: () => [liveNode],
    readonly: () => false,
    onAddChild: vi.fn(),
    onSetExpanded: vi.fn(),
  });
  controller.refresh();
  expect(canvas.querySelector<HTMLElement>('[data-node-uid="a"]')?.style.left).toBe('465px');
  expect([...listeners.keys()]).toEqual(expect.arrayContaining(['translate', 'scale', 'resize', 'view_data_change']));

  nodeLeft = 240;
  listeners.get('translate')?.forEach((listener) => listener());
  listeners.get('view_data_change')?.forEach((listener) => listener());
  expect(requestFrame).toHaveBeenCalledTimes(1);
  expect(cancelFrame).not.toHaveBeenCalled();
  frames.shift()?.(performance.now());
  expect(canvas.querySelector<HTMLElement>('[data-node-uid="a"]')?.style.left).toBe('345px');

  controller.destroy();
  expect(viewportEventSource.off).toHaveBeenCalledTimes(4);
  requestFrame.mockRestore();
  cancelFrame.mockRestore();
  root.remove();
});

it('tracks the rendered SVG transform when the host does not emit viewport events', async () => {
  const root = document.createElement('div');
  const canvas = document.createElement('div');
  const transformedViewport = document.createElement('div');
  const liveElement = document.createElement('div');
  transformedViewport.appendChild(liveElement);
  canvas.appendChild(transformedViewport);
  root.appendChild(canvas);
  document.body.appendChild(root);
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({ left: 100, top: 80, right: 900, bottom: 680, width: 800, height: 600, x: 100, y: 80, toJSON() {} }),
  });
  let nodeLeft = 360;
  Object.defineProperty(liveElement, 'getBoundingClientRect', {
    value: () => ({
      left: nodeLeft,
      top: 260,
      right: nodeLeft + 100,
      bottom: 300,
      width: 100,
      height: 40,
      x: nodeLeft,
      y: 260,
      toJSON() {},
    }),
  });
  const liveNode: any = {
    isRoot: false,
    children: [],
    nodeData: { children: [] },
    group: { node: liveElement },
    getData: (key: string) => ({ uid: 'a', expand: true, isActive: true } as any)[key],
  };
  const frames: FrameRequestCallback[] = [];
  const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  const controller = new NodeQuickActionsController({
    root,
    canvas,
    getRendererRoot: () => liveNode,
    getActiveNodes: () => [liveNode],
    readonly: () => false,
    onAddChild: vi.fn(),
    onSetExpanded: vi.fn(),
  });
  controller.refresh();
  expect(canvas.querySelector<HTMLElement>('[data-node-uid="a"]')?.style.left).toBe('360px');

  nodeLeft = 220;
  transformedViewport.setAttribute('transform', 'translate(-140 0)');
  await Promise.resolve();

  expect(requestFrame).toHaveBeenCalledTimes(1);
  frames.shift()?.(performance.now());
  expect(canvas.querySelector<HTMLElement>('[data-node-uid="a"]')?.style.left).toBe('220px');

  controller.destroy();
  requestFrame.mockRestore();
  cancelFrame.mockRestore();
  root.remove();
});

it('tracks host ancestor scrolling when the canvas transform does not change', () => {
  const scrollHost = document.createElement('div');
  const root = document.createElement('div');
  const canvas = document.createElement('div');
  const liveElement = document.createElement('div');
  canvas.appendChild(liveElement);
  root.appendChild(canvas);
  scrollHost.appendChild(root);
  document.body.appendChild(scrollHost);
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({ left: 100, top: 80, right: 900, bottom: 680, width: 800, height: 600, x: 100, y: 80, toJSON() {} }),
  });
  let nodeTop = 260;
  Object.defineProperty(liveElement, 'getBoundingClientRect', {
    value: () => ({
      left: 360,
      top: nodeTop,
      right: 460,
      bottom: nodeTop + 40,
      width: 100,
      height: 40,
      x: 360,
      y: nodeTop,
      toJSON() {},
    }),
  });
  const liveNode: any = {
    isRoot: false,
    children: [],
    nodeData: { children: [] },
    group: { node: liveElement },
    getData: (key: string) => ({ uid: 'a', expand: true, isActive: true } as any)[key],
  };
  const frames: FrameRequestCallback[] = [];
  const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  const controller = new NodeQuickActionsController({
    root,
    canvas,
    getRendererRoot: () => liveNode,
    getActiveNodes: () => [liveNode],
    readonly: () => false,
    onAddChild: vi.fn(),
    onSetExpanded: vi.fn(),
  });
  controller.refresh();
  const actions = canvas.querySelector<HTMLElement>('[data-node-uid="a"]')!;
  const initialTop = actions.style.top;

  nodeTop = 150;
  scrollHost.dispatchEvent(new Event('scroll'));

  expect(requestFrame).toHaveBeenCalledTimes(1);
  frames.shift()?.(performance.now());
  expect(canvas.querySelector<HTMLElement>('[data-node-uid="a"]')?.style.top).not.toBe(initialTop);

  controller.destroy();
  requestFrame.mockRestore();
  cancelFrame.mockRestore();
  scrollHost.remove();
});
