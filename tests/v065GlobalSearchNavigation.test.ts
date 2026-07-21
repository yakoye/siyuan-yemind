import { describe, expect, it, vi } from 'vitest';
import { flushPendingTabNodeFocus, requestTabNodeFocus, type TabNodeFocusState } from '../src/plugin/tabNodeFocus';

describe('v0.6.5 global search node navigation', () => {
  it('queues a search target while a tab is loading and focuses it after editor mount', () => {
    const state: TabNodeFocusState = { destroyed: false };
    requestTabNodeFocus(state, 'node-42');
    expect(state.pendingNodeUid).toBe('node-42');

    const focusNode = vi.fn();
    state.editor = { focusNode } as any;
    flushPendingTabNodeFocus(state, (callback) => callback());

    expect(focusNode).toHaveBeenCalledWith('node-42');
    expect(state.pendingNodeUid).toBeUndefined();
  });
});
