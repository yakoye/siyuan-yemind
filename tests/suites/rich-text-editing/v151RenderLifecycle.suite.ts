import { describe, expect, it, vi } from 'vitest';
import {
  RenderedTextGeometryRepair,
  type RenderedTextGeometryScheduler,
} from '../../../src/editor/RenderedTextGeometryRepair';

describe('v1.5.1 atomic render lifecycle', () => {
  it('repairs a rendered rich-text node when its text overflows the SVG foreignObject', () => {
    let releaseRepair: FrameRequestCallback | null = null;
    const scheduler: RenderedTextGeometryScheduler = {
      request: (next) => {
        releaseRepair = next;
        return 2;
      },
      cancel: vi.fn(),
    };
    const wrapper = {
      getBoundingClientRect: () => ({ width: 100, height: 60 }),
    };
    const foreignObject = {
      getBoundingClientRect: () => ({ width: 75, height: 22 }),
      querySelector: vi.fn(() => wrapper),
    };
    const nodeContent = {
      node: foreignObject,
      width: vi.fn(),
      height: vi.fn(),
    };
    const textGroup = { attr: vi.fn() };
    const textData = {
      node: textGroup,
      nodeContent,
      width: 75,
      height: 22,
    };
    const node = {
      _textData: textData,
      nodeData: { data: { uid: 'root' } },
      children: [],
      getData: (key: string) => key === 'uid' ? 'root' : undefined,
      reRender: vi.fn(() => {
        textData.width = 101;
        textData.height = 60;
      }),
    };
    const mindMap = {
      opt: { textAutoWrapWidth: 500 },
      renderer: {
        root: node,
        findNodeByUid: vi.fn(() => node),
      },
      render: vi.fn((done?: () => void) => done?.()),
    };
    const committed = vi.fn();
    const coordinator = new RenderedTextGeometryRepair(mindMap, committed, scheduler);

    expect(coordinator.reconcileRenderedTextGeometry()).toBe(true);
    expect(node._textData.width).toBe(101);
    expect(node._textData.height).toBe(60);
    expect(node.reRender).toHaveBeenCalledWith(
      ['text'],
      { ignoreUpdateCustomTextWidth: true },
    );
    expect((node.nodeData.data as any).customTextWidth).toBeUndefined();
    expect((node as any).customTextWidth).toBeUndefined();
    expect(mindMap.render).toHaveBeenCalledWith(
      expect.any(Function),
      'yemind-richtext-geometry-repair',
    );
    expect(coordinator.reconcileRenderedTextGeometry()).toBe(false);
    releaseRepair?.(0);
    expect(committed).toHaveBeenCalledOnce();
  });

  it('does not redraw when rendered rich text already fits its SVG foreignObject', () => {
    const node = {
      _textData: {
        nodeContent: {
          node: {
            getBoundingClientRect: () => ({ width: 103, height: 30 }),
            querySelector: () => ({
              getBoundingClientRect: () => ({ width: 103, height: 30 }),
            }),
          },
        },
      },
      children: [],
      layout: vi.fn(),
    };
    const mindMap = {
      renderer: { root: node },
      render: vi.fn(),
    };
    const coordinator = new RenderedTextGeometryRepair(mindMap, vi.fn());

    expect(coordinator.reconcileRenderedTextGeometry()).toBe(false);
    expect(node.layout).not.toHaveBeenCalled();
    expect(mindMap.render).not.toHaveBeenCalled();
  });

  it('resets in-flight state on invalidate() so a subsequent repair can run', () => {
    let releaseRepair: FrameRequestCallback | null = null;
    const cancel = vi.fn();
    const scheduler: RenderedTextGeometryScheduler = {
      request: (next) => {
        releaseRepair = next;
        return 2;
      },
      cancel,
    };
    const wrapper = {
      getBoundingClientRect: () => ({ width: 100, height: 60 }),
    };
    const foreignObject = {
      getBoundingClientRect: () => ({ width: 75, height: 22 }),
      querySelector: vi.fn(() => wrapper),
    };
    const nodeContent = {
      node: foreignObject,
      width: vi.fn(),
      height: vi.fn(),
    };
    const textGroup = { attr: vi.fn() };
    const textData = {
      node: textGroup,
      nodeContent,
      width: 75,
      height: 22,
    };
    const node = {
      _textData: textData,
      nodeData: { data: { uid: 'root' } },
      children: [],
      getData: (key: string) => key === 'uid' ? 'root' : undefined,
      reRender: vi.fn(),
    };
    const mindMap = {
      opt: { textAutoWrapWidth: 500 },
      renderer: {
        root: node,
        findNodeByUid: vi.fn(() => node),
      },
      render: vi.fn((done?: () => void) => done?.()),
    };
    const committed = vi.fn();
    const coordinator = new RenderedTextGeometryRepair(mindMap, committed, scheduler);

    expect(coordinator.reconcileRenderedTextGeometry()).toBe(true);
    // The repair is in flight: render()'s callback already scheduled a frame,
    // but the frame itself has not fired yet, so the coordinator still
    // reports itself as busy and refuses to start another repair.
    expect(coordinator.reconcileRenderedTextGeometry()).toBe(false);

    coordinator.invalidate();
    expect(cancel).toHaveBeenCalledWith(2);

    // Without the fix, invalidate() cancelled the pending frame but left
    // geometryRepairInFlight stuck at true, so this call would keep
    // returning false forever (silent repair failure until destroy()).
    expect(coordinator.reconcileRenderedTextGeometry()).toBe(true);
    expect(committed).not.toHaveBeenCalled();

    // Cleanup: release the second repair's scheduled frame so it doesn't
    // leak a dangling callback reference for later tests.
    releaseRepair?.(0);
  });

  it('does not start a competing geometry repair while a width handle is being dragged', () => {
    const node = {
      isDragHandleMousedown: true,
      _textData: {
        nodeContent: {
          node: {
            getBoundingClientRect: () => ({ width: 80, height: 24 }),
            querySelector: () => ({
              getBoundingClientRect: () => ({ width: 180, height: 48 }),
            }),
          },
        },
      },
      children: [],
      reRender: vi.fn(),
    };
    const mindMap = {
      renderer: { root: node },
      render: vi.fn(),
    };
    const coordinator = new RenderedTextGeometryRepair(mindMap, vi.fn());

    expect(coordinator.reconcileRenderedTextGeometry()).toBe(false);
    expect(node.reRender).not.toHaveBeenCalled();
    expect(mindMap.render).not.toHaveBeenCalled();
  });
});
