import { describe, expect, it, vi } from 'vitest';
import {
  RenderLifecycleCoordinator,
  type RenderLifecycleScheduler,
} from '../../../src/editor/RenderLifecycleCoordinator';

describe('v1.5.1 atomic render lifecycle', () => {
  it('V151-20 renders the newest typed text against the current live node', () => {
    let callback: FrameRequestCallback | null = null;
    const scheduler: RenderLifecycleScheduler = {
      request: (next) => {
        callback = next;
        return 1;
      },
      cancel: vi.fn(),
    };
    const stale = { getData: (key: string) => key === 'uid' ? 'node-1' : undefined };
    const live = {
      createTextNode: vi.fn((text) => ({ text })),
      getNodeRect: vi.fn(() => ({ width: 120, height: 36 })),
      layout: vi.fn(),
    };
    const committed = vi.fn();
    const mindMap = {
      renderer: { findNodeByUid: vi.fn(() => live) },
      richText: { updateTextEditNode: vi.fn() },
      render: vi.fn((done: () => void) => done()),
    };
    const coordinator = new RenderLifecycleCoordinator(mindMap, committed, scheduler);
    coordinator.scheduleTextEdit({ node: stale, text: '立即显示' });
    callback?.(0);

    expect(live.createTextNode).toHaveBeenCalledWith('立即显示');
    expect(live.width).toBe(120);
    expect(live.layout).toHaveBeenCalled();
    expect(committed).toHaveBeenCalledOnce();
  });

  it('commits one paste transaction immediately without leaving a duplicate animation-frame render', () => {
    const scheduler: RenderLifecycleScheduler = {
      request: vi.fn(() => 1),
      cancel: vi.fn(),
    };
    const live = {
      createTextNode: vi.fn((text) => ({ text })),
      getNodeRect: vi.fn(() => ({ width: 240, height: 36 })),
      layout: vi.fn(),
    };
    const mindMap = {
      renderer: { findNodeByUid: vi.fn(() => live) },
      richText: { updateTextEditNode: vi.fn() },
      render: vi.fn((done?: () => void) => done?.()),
    };
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn(), scheduler);

    coordinator.scheduleTextEdit({
      node: { getData: () => 'paste-node' },
      text: '<p>粘贴后边框立即跟随</p>',
      richText: true,
      reason: 'paste',
    });

    expect(live.createTextNode).toHaveBeenCalledOnce();
    expect(live.createTextNode).toHaveBeenCalledWith('粘贴后边框立即跟随');
    expect(mindMap.render).toHaveBeenCalledOnce();
    expect(scheduler.request).not.toHaveBeenCalled();
    expect(coordinator.flushPendingTextEdit()).toBe(false);
  });

  it('V151-21/V151-22 discards a queued edit after structure mutation or deletion', () => {
    let callback: FrameRequestCallback | null = null;
    const scheduler: RenderLifecycleScheduler = {
      request: (next) => {
        callback = next;
        return 1;
      },
      cancel: vi.fn(),
    };
    const mindMap = {
      renderer: { findNodeByUid: vi.fn() },
      render: vi.fn(),
    };
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn(), scheduler);
    coordinator.scheduleTextEdit({
      node: { getData: () => 'deleted-node' },
      text: '过期文字',
    });
    coordinator.invalidate();
    callback?.(0);
    expect(mindMap.renderer.findNodeByUid).not.toHaveBeenCalled();
    expect(mindMap.render).not.toHaveBeenCalled();
  });

  it('V151-20 measures rich text from visible text instead of literal HTML tags', () => {
    let callback: FrameRequestCallback | null = null;
    const scheduler: RenderLifecycleScheduler = {
      request: (next) => {
        callback = next;
        return 1;
      },
      cancel: vi.fn(),
    };
    const live = {
      createTextNode: vi.fn((text) => ({ text })),
      getNodeRect: vi.fn(() => ({ width: 96, height: 32 })),
      layout: vi.fn(),
    };
    const mindMap = {
      renderer: { findNodeByUid: vi.fn(() => live) },
      richText: { updateTextEditNode: vi.fn() },
      render: vi.fn((done: () => void) => done()),
    };
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn(), scheduler);

    coordinator.scheduleTextEdit({
      node: { getData: () => 'rich-node' },
      text: '<p><strong>立即</strong>显示</p>',
      richText: true,
    });
    callback?.(0);

    expect(live.createTextNode).toHaveBeenCalledWith('立即显示');
  });

  it('commits the final complete root text when edit close cancels the queued frame', () => {
    let callback: FrameRequestCallback | null = null;
    const scheduler: RenderLifecycleScheduler = {
      request: (next) => {
        callback = next;
        return 1;
      },
      cancel: vi.fn(),
    };
    const live = {
      createTextNode: vi.fn((text) => ({ text })),
      getNodeRect: vi.fn(() => ({ width: 132, height: 40 })),
      layout: vi.fn(),
    };
    const mindMap = {
      renderer: { findNodeByUid: vi.fn(() => live) },
      richText: { updateTextEditNode: vi.fn() },
      render: vi.fn((done?: () => void) => done?.()),
    };
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn(), scheduler);
    coordinator.scheduleTextEdit({
      node: { getData: () => 'root' },
      text: '<p>未命名导图</p>',
      richText: true,
    });
    coordinator.invalidate();
    coordinator.flushPendingTextEdit();
    callback?.(0);

    expect(live.createTextNode).toHaveBeenCalledTimes(1);
    expect(live.createTextNode).toHaveBeenCalledWith('未命名导图');
    expect(live.layout).toHaveBeenCalledOnce();
  });

  it('repairs a rendered rich-text node when its text overflows the SVG foreignObject', () => {
    let releaseRepair: FrameRequestCallback | null = null;
    const scheduler: RenderLifecycleScheduler = {
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
    const coordinator = new RenderLifecycleCoordinator(mindMap, committed, scheduler);

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
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn());

    expect(coordinator.reconcileRenderedTextGeometry()).toBe(false);
    expect(node.layout).not.toHaveBeenCalled();
    expect(mindMap.render).not.toHaveBeenCalled();
  });
});
