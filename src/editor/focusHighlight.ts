export interface HighlightableRenderedNode {
  highlight?(): void;
  closeHighlight?(): void;
}

export interface NodeRendererLike {
  findNodeByUid?(uid: string): HighlightableRenderedNode | null | undefined;
}

export interface FocusHighlightOptions {
  attempts?: number;
  duration?: number;
  scheduleFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (id: number) => void;
  scheduleTimer?: (callback: () => void, delay: number) => number;
  cancelTimer?: (id: number) => void;
  onFound?: () => void;
  onMissing?: () => void;
}

/**
 * Waits for a node hidden behind collapsed ancestors to be rendered, then adds
 * the upstream highlight class briefly. The returned cleanup is idempotent.
 */
export function scheduleFocusedNodeHighlight(
  renderer: () => NodeRendererLike | null | undefined,
  uid: string,
  options: FocusHighlightOptions = {},
): () => void {
  const maxAttempts = Math.max(1, options.attempts ?? 20);
  const duration = Math.max(0, options.duration ?? 1500);
  const scheduleFrame = options.scheduleFrame ?? ((callback) => window.requestAnimationFrame(callback));
  const cancelFrame = options.cancelFrame ?? ((id) => window.cancelAnimationFrame(id));
  const scheduleTimer = options.scheduleTimer ?? ((callback, delay) => window.setTimeout(callback, delay));
  const cancelTimer = options.cancelTimer ?? ((id) => window.clearTimeout(id));
  let cancelled = false;
  let frameId: number | null = null;
  let timerId: number | null = null;
  let highlighted: HighlightableRenderedNode | null = null;

  const stopHighlight = (): void => {
    highlighted?.closeHighlight?.();
    highlighted = null;
    if (timerId !== null) {
      cancelTimer(timerId);
      timerId = null;
    }
  };

  const attempt = (remaining: number): void => {
    frameId = scheduleFrame(() => {
      frameId = null;
      if (cancelled) return;
      const node = renderer()?.findNodeByUid?.(uid) ?? null;
      if (!node && remaining > 1) {
        attempt(remaining - 1);
        return;
      }
      if (!node) {
        options.onMissing?.();
        return;
      }
      highlighted = node;
      options.onFound?.();
      node.highlight?.();
      timerId = scheduleTimer(() => {
        timerId = null;
        if (!cancelled) stopHighlight();
      }, duration);
    });
  };

  attempt(maxAttempts);
  return () => {
    if (cancelled) return;
    cancelled = true;
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
    stopHighlight();
  };
}
