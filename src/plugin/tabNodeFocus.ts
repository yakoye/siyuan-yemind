export interface FocusableMapEditor {
  focusNode(uid: string): void;
}

export interface TabNodeFocusState {
  editor?: FocusableMapEditor;
  pendingNodeUid?: string;
}

export type FrameScheduler = (callback: FrameRequestCallback) => number | void;

export function requestTabNodeFocus(state: TabNodeFocusState, uid: string): void {
  if (!uid) return;
  if (state.editor) {
    state.editor.focusNode(uid);
    return;
  }
  state.pendingNodeUid = uid;
}

export function flushPendingTabNodeFocus(
  state: TabNodeFocusState,
  schedule: FrameScheduler = (callback) => window.requestAnimationFrame(callback),
): void {
  if (!state.editor || !state.pendingNodeUid) return;
  const uid = state.pendingNodeUid;
  state.pendingNodeUid = undefined;
  schedule(() => state.editor?.focusNode(uid));
}
