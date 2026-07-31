import { describe, expect, it, vi } from 'vitest';
import {
  RenderLifecycleCoordinator,
  type RenderLifecycleScheduler,
  type RenderLifecycleTimer,
} from '../../../src/editor/RenderLifecycleCoordinator';

// Runs the debounce callback synchronously, preserving the pre-debounce single-frame
// timing these existing tests were written against. Dedicated tests further down use a
// manually-triggered timer to verify the actual debounce/coalescing behavior.
const syncTimer: RenderLifecycleTimer = {
  request: (callback) => {
    callback();
    return 1;
  },
  cancel: vi.fn(),
};

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
    const coordinator = new RenderLifecycleCoordinator(mindMap, committed, scheduler, syncTimer);
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

  it('keeps an open editor on one live SVG node instead of replacing the whole tree', () => {
    const renderIncomingLine = vi.fn();
    const renderOutgoingLines = vi.fn();
    const live = {
      createTextNode: vi.fn((text) => ({ text })),
      getNodeRect: vi.fn(() => ({ width: 240, height: 52 })),
      layout: vi.fn(),
      update: vi.fn(),
      renderLine: renderOutgoingLines,
      parent: { renderLine: renderIncomingLine },
    };
    const mindMap = {
      renderer: { findNodeByUid: vi.fn(() => live) },
      richText: { showTextEdit: true, updateTextEditNode: vi.fn() },
      render: vi.fn(),
    };
    const committed = vi.fn();
    const coordinator = new RenderLifecycleCoordinator(mindMap, committed, {
      request: (callback) => {
        callback(0);
        return 1;
      },
      cancel: vi.fn(),
    }, syncTimer);

    coordinator.scheduleTextEdit({
      node: { getData: () => 'editing-node' },
      text: '<p>编辑过程中边框立即增长</p>',
      richText: true,
      reason: 'input',
    });

    expect(live.layout).toHaveBeenCalledOnce();
    expect(live.update).toHaveBeenCalledOnce();
    expect(renderIncomingLine).toHaveBeenCalledOnce();
    expect(renderOutgoingLines).toHaveBeenCalledWith();
    expect(mindMap.render).not.toHaveBeenCalled();
    expect(mindMap.richText.updateTextEditNode).toHaveBeenCalledOnce();
    expect(committed).toHaveBeenCalledWith('editing-node');
  });

  it('does not cascade renderLine into the edited node\'s descendants on every keystroke (real-trace regression: 371 forced layouts / 180ms main-thread block on one keystroke for a node with a large subtree)', () => {
    // A performance trace captured on the user's real document (Trace-20260731T195122.json.gz)
    // showed a single keydown triggering a 184ms RunTask containing 371 forced synchronous
    // Layout passes, all attributed to this coordinator's commitTextEdit -> node.renderLine(true).
    // renderLine(deep) only redraws *this* node's own outgoing connector lines regardless of
    // the deep flag; deep=true additionally walks every descendant's renderLine, even though
    // this live-edit fast path never repositions descendants (layout() only rebuilds the
    // edited node's own SVG content, it does not re-run the layout algorithm on children).
    // That recursion is therefore pure waste that scales with subtree size and explains the
    // "type one character -> whole subtree flickers/jumps then recovers" report.
    // renderLine mocks mirror the real MindMapNode.js contract: they always redraw this
    // node's own outgoing lines, and only recurse into children when called with deep=true.
    const grandchildRenderLine = vi.fn();
    const grandchild = { renderLine: grandchildRenderLine, children: [] };
    const childRenderLine = vi.fn((deep?: boolean) => {
      if (deep) grandchild.renderLine(deep);
    });
    const child = { renderLine: childRenderLine, children: [grandchild] };
    const liveRenderLine = vi.fn((deep?: boolean) => {
      if (deep) child.renderLine(deep);
    });
    const live = {
      createTextNode: vi.fn((text) => ({ text })),
      getNodeRect: vi.fn(() => ({ width: 240, height: 52 })),
      layout: vi.fn(),
      update: vi.fn(),
      renderLine: liveRenderLine,
      parent: { renderLine: vi.fn() },
      children: [child],
    };
    const mindMap = {
      renderer: { findNodeByUid: vi.fn(() => live) },
      richText: { showTextEdit: true, updateTextEditNode: vi.fn() },
      render: vi.fn(),
    };
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn(), {
      request: (callback) => {
        callback(0);
        return 1;
      },
      cancel: vi.fn(),
    }, syncTimer);

    coordinator.scheduleTextEdit({
      node: { getData: () => 'editing-node-with-subtree' },
      text: '<p>D</p>',
      richText: true,
      reason: 'input',
    });

    expect(liveRenderLine).toHaveBeenCalledOnce();
    expect(childRenderLine).not.toHaveBeenCalled();
    expect(grandchildRenderLine).not.toHaveBeenCalled();
  });

  it('coalesces a burst of rapid keystrokes / IME composition updates into one commit after the debounce window, instead of paying createTextNode()\'s cost on every character', () => {
    // Two real Chrome performance traces (Trace-20260731T195122.json.gz and
    // Trace-20260731T203417.json.gz), the second captured on a map with a single
    // node and no children, both showed node.createTextNode()'s plain-text
    // word-wrap loop (svg.js measureText() -> new SVG <text> element -> native
    // getBBox(), forced once per character while probing where to wrap) costing
    // 180-380ms for a single commit. CPU-sample counts across both traces put the
    // overwhelming majority of that time in createTextNode/measureText, not in
    // renderLine. The v1.7.5 renderLine(deep) fix was a real but secondary
    // optimization; the dominant cost is paid again on every commit, including
    // every IME compositionupdate a CJK candidate change fires. Debounce the
    // commit itself so a fast burst pays that cost once, after it goes quiet,
    // instead of once per character.
    let armedRafCallback: FrameRequestCallback | null = null;
    const scheduler: RenderLifecycleScheduler = {
      request: (next) => {
        armedRafCallback = next;
        return 1;
      },
      cancel: vi.fn(),
    };
    let armedTimerCallback: (() => void) | null = null;
    const timer: RenderLifecycleTimer = {
      request: (callback) => {
        armedTimerCallback = callback;
        return 1;
      },
      cancel: vi.fn(() => {
        armedTimerCallback = null;
      }),
    };
    const live = {
      createTextNode: vi.fn((text) => ({ text })),
      getNodeRect: vi.fn(() => ({ width: 240, height: 52 })),
      layout: vi.fn(),
      update: vi.fn(),
      renderLine: vi.fn(),
      parent: { renderLine: vi.fn() },
    };
    const mindMap = {
      renderer: { findNodeByUid: vi.fn(() => live) },
      richText: { showTextEdit: true, updateTextEditNode: vi.fn() },
      render: vi.fn(),
    };
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn(), scheduler, timer);
    const node = { getData: () => 'composing-node' };

    coordinator.scheduleTextEdit({ node, text: 'P', richText: true, reason: 'input' });
    coordinator.scheduleTextEdit({ node, text: 'PC', richText: true, reason: 'input' });
    coordinator.scheduleTextEdit({ node, text: 'PCI', richText: true, reason: 'input' });
    coordinator.scheduleTextEdit({ node, text: 'PCIe', richText: true, reason: 'input' });

    expect(live.createTextNode).not.toHaveBeenCalled();

    armedTimerCallback?.();
    armedRafCallback?.(0);

    expect(live.createTextNode).toHaveBeenCalledOnce();
    expect(live.createTextNode).toHaveBeenCalledWith('PCIe');
  });

  it('flushes the latest edit immediately when the editor closes mid-debounce, without waiting for the debounce window', () => {
    const timer: RenderLifecycleTimer = {
      request: vi.fn(() => 1),
      cancel: vi.fn(),
    };
    const scheduler: RenderLifecycleScheduler = { request: vi.fn(() => 1), cancel: vi.fn() };
    const live = {
      createTextNode: vi.fn((text) => ({ text })),
      getNodeRect: vi.fn(() => ({ width: 200, height: 40 })),
      layout: vi.fn(),
    };
    const mindMap = {
      renderer: { findNodeByUid: vi.fn(() => live) },
      richText: { updateTextEditNode: vi.fn() },
      render: vi.fn((done?: () => void) => done?.()),
    };
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn(), scheduler, timer);

    coordinator.scheduleTextEdit({
      node: { getData: () => 'closing-node' },
      text: '<p>关闭前的最后文字</p>',
      richText: true,
      reason: 'input',
    });

    expect(live.createTextNode).not.toHaveBeenCalled();
    expect(coordinator.flushPendingTextEdit()).toBe(true);
    expect(live.createTextNode).toHaveBeenCalledWith('关闭前的最后文字');
  });

  it('reports the committed live UID so every render can restore the single visible edit layer', () => {
    const committed = vi.fn();
    const live = {
      createTextNode: vi.fn((text) => ({ text })),
      getNodeRect: vi.fn(() => ({ width: 180, height: 34 })),
      layout: vi.fn(),
    };
    const mindMap = {
      renderer: { findNodeByUid: vi.fn(() => live) },
      richText: { updateTextEditNode: vi.fn() },
      render: vi.fn((done?: () => void) => done?.()),
    };
    const coordinator = new RenderLifecycleCoordinator(mindMap, committed, {
      request: (callback) => {
        callback(0);
        return 1;
      },
      cancel: vi.fn(),
    }, syncTimer);

    coordinator.scheduleTextEdit({
      node: { getData: () => 'active-edit-uid' },
      text: '<p>持续输入不重影</p>',
      richText: true,
      reason: 'input',
    });

    expect(committed).toHaveBeenCalledOnce();
    expect(committed).toHaveBeenCalledWith('active-edit-uid');
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
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn(), scheduler, syncTimer);
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
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn(), scheduler, syncTimer);

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
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn(), scheduler, syncTimer);
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
    const coordinator = new RenderLifecycleCoordinator(mindMap, vi.fn());

    expect(coordinator.reconcileRenderedTextGeometry()).toBe(false);
    expect(node.reRender).not.toHaveBeenCalled();
    expect(mindMap.render).not.toHaveBeenCalled();
  });
});
