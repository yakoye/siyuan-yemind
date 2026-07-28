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
});
