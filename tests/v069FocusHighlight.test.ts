import { describe, expect, it, vi } from 'vitest';
import { scheduleFocusedNodeHighlight } from '../src/editor/focusHighlight';

describe('v0.6.9 focused-node highlight', () => {
  it('waits for a collapsed target to render, highlights it, then clears the highlight', () => {
    const frames: FrameRequestCallback[] = [];
    const timers: Array<() => void> = [];
    const node = { highlight: vi.fn(), closeHighlight: vi.fn() };
    let attempts = 0;
    const renderer = {
      findNodeByUid: vi.fn(() => (++attempts >= 2 ? node : null)),
    };

    const cleanup = scheduleFocusedNodeHighlight(() => renderer, 'target', {
      attempts: 3,
      scheduleFrame: (callback) => { frames.push(callback); return frames.length; },
      cancelFrame: vi.fn(),
      scheduleTimer: (callback) => { timers.push(callback); return timers.length; },
      cancelTimer: vi.fn(),
    });

    frames.shift()?.(0);
    expect(node.highlight).not.toHaveBeenCalled();
    frames.shift()?.(16);
    expect(node.highlight).toHaveBeenCalledTimes(1);
    timers.shift()?.();
    expect(node.closeHighlight).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
