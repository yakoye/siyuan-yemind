import { describe, expect, it, vi } from 'vitest';
import { NodeQuickActionsController, describeNodeQuickActions } from '../../../src/editor/nodeQuickActions';

describe('v0.9.3 node hover quick actions', () => {
  it('shows actions on hover without requiring selection', () => {
    expect(describeNodeQuickActions({
      isRoot: false,
      childCount: 2,
      expanded: true,
      selected: false,
      hovered: true,
    })).toEqual([
      { action: 'collapse', label: '折叠 2 个子孙节点', text: '−' },
      { action: 'add-child', label: '添加子节点', text: '+' },
    ]);
  });

  it('keeps the hovered action host alive while the pointer crosses to its buttons', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    root.innerHTML = '<div class="ymz-canvas-wrap"></div><div class="canvas"></div>';
    const canvas = root.querySelector<HTMLElement>('.canvas')!;
    document.body.appendChild(root);
    Object.defineProperty(root, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON() {} }),
    });
    const nodeElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    canvas.appendChild(nodeElement);
    Object.defineProperty(nodeElement, 'getBoundingClientRect', {
      value: () => ({ left: 50, top: 40, right: 150, bottom: 80, width: 100, height: 40, x: 50, y: 40, toJSON() {} }),
    });
    const rendererRoot: any = {
      isRoot: true,
      children: [],
      nodeData: { children: [] },
      group: { node: nodeElement },
      getData: (key: string) => ({ uid: 'root', expand: true, isActive: false } as any)[key],
    };
    const controller = new NodeQuickActionsController({
      root,
      canvas,
      getRendererRoot: () => rendererRoot,
      getActiveNodes: () => [],
      readonly: () => false,
      onAddChild: vi.fn(),
      onSetExpanded: vi.fn(),
    });
    controller.refresh();
    nodeElement.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    vi.runOnlyPendingTimers();
    controller.refresh();
    const host = root.querySelector<HTMLElement>('[data-node-uid="root"]')!;
    expect(host).toBeTruthy();
    nodeElement.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: host }));
    host.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, relatedTarget: nodeElement }));
    vi.advanceTimersByTime(300);
    expect(root.querySelector('[data-node-uid="root"]')).toBeTruthy();
    controller.destroy();
    root.remove();
    vi.useRealTimers();
  });
});
