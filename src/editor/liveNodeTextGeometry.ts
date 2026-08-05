export interface LiveTextGeometryTimers {
  set(callback: () => void, delayMs: number): number;
  clear(handle: number): void;
}

const browserTimers: LiveTextGeometryTimers = {
  set: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clear: (handle) => window.clearTimeout(handle),
};

export interface MeasuredTextData {
  node: any;
  nodeContent?: any;
  width: number;
  height: number;
}

/**
 * Build the text layer the node will have once the open editor commits, using
 * the same `MindMapNode#createTextNode` the commit itself runs. Every node in
 * this codebase is normalized to the upstream rich-text model
 * (`normalizeTreeForUpstreamRichTextInPlace`) and `hideEditText()` commits
 * `getEditText()` verbatim, so measuring the live editor HTML here produces
 * exactly the geometry `SET_NODE_TEXT` will produce -- the preview and the
 * commit cannot disagree.
 *
 * A measurement must not be a data mutation: `createTextNode()` consumes
 * `needUpdate`, so it is restored, and a pending `resetRichText` (which makes
 * the upstream path rewrite node text) skips the frame entirely.
 */
export function createMeasuredTextData(node: any, html: string): MeasuredTextData | null {
  const data = node?.nodeData?.data;
  if (!data || typeof node?.createTextNode !== 'function') return null;
  if (data.resetRichText) return null;
  const previousNeedUpdate = data.needUpdate;
  try {
    const created = node.createTextNode(html);
    const width = Number(created?.width);
    const height = Number(created?.height);
    if (!created?.node || !Number.isFinite(width) || !Number.isFinite(height)) return null;
    if (!(width > 0) || !(height > 0)) return null;
    return created as MeasuredTextData;
  } catch {
    return null;
  } finally {
    if (previousNeedUpdate === undefined) delete data.needUpdate;
    else data.needUpdate = previousNeedUpdate;
  }
}

export function textSizeChanged(current: any, next: MeasuredTextData): boolean {
  return (
    Math.abs(Number(current?.width) - next.width) >= 0.5
    || Math.abs(Number(current?.height) - next.height) >= 0.5
  );
}

export interface LiveNodeTextGeometryOptions {
  /** Minimum gap between two reconciles while the user keeps typing. */
  intervalMs?: number;
  timers?: LiveTextGeometryTimers;
}

/**
 * Resizes the edited node while its text is still being typed.
 *
 * Without this, a node's box was only measured by the commit on close, so text
 * that outgrew its frame was clipped by it and a shortened node kept the frame
 * of its previous, longer text.
 *
 * This is deliberately *not* `openRealtimeRenderOnNodeTextEdit: true`. That
 * upstream mode also makes the edit host transparent and drives the node's
 * static text with `opacity(0)`, which would undo this codebase's opaque-editor
 * close contract (an opaque editor covering a still-valid SVG fallback, so no
 * frame can expose text at the temporary local origin). It also rebuilds the
 * node on a fixed 100ms tick regardless of whether anything about the geometry
 * actually changed.
 *
 * Instead the same measurement runs on a trailing throttle and only commits
 * when the measured size really changed, so typing inside an already-wide-enough
 * node costs one measurement and no layout. Nothing is written to the map data
 * model, so typing still produces no history entry, no `data_change` and no
 * autosave: `hideEditText()` remains the single authority that commits text.
 */
export class LiveNodeTextGeometryController {
  private timer: number | null = null;
  private destroyed = false;
  private readonly intervalMs: number;
  private readonly timers: LiveTextGeometryTimers;
  private readonly onTextEditChange = (): void => this.schedule();

  constructor(private readonly mindMap: any, options: LiveNodeTextGeometryOptions = {}) {
    this.intervalMs = Math.max(0, Number(options.intervalMs ?? 50));
    this.timers = options.timers ?? browserTimers;
    this.mindMap?.on?.('node_text_edit_change', this.onTextEditChange);
  }

  schedule(): void {
    if (this.destroyed || this.timer !== null) return;
    this.timer = this.timers.set(() => {
      this.timer = null;
      this.reconcile();
    }, this.intervalMs);
  }

  reconcile(): boolean {
    if (this.destroyed) return false;
    const richText = this.mindMap?.richText;
    if (richText?.showTextEdit !== true) return false;
    const node = richText.node;
    if (!node?._textData) return false;
    // The width handle owns node geometry while it is being dragged; the two
    // must never write a node size in the same frame.
    if (node.isDragHandleMousedown === true) return false;
    const measured = createMeasuredTextData(node, String(richText.getEditText?.() ?? ''));
    if (!measured) return false;
    if (!textSizeChanged(node._textData, measured)) return false;

    // `layout()` centres the text slot on the painted glyph ink, so leaving the
    // previous text layer inside a resized box would drag the whole content
    // group -- and the editor anchored to it -- sideways by half the
    // difference. Swapping in the freshly measured layer keeps ink and declared
    // geometry identical. The opaque edit host covers the swap.
    node._textData = measured;
    // `[]` recreates no content: only the cached text size is re-read, the node
    // box recomputed, and the shape/hover frame redrawn at the new size.
    node.reRender?.([], { ignoreUpdateCustomTextWidth: true });
    // Resize the edit host in the same synchronous block as the node. Upstream
    // derives the host's min/max width from the node's `data-width`, which
    // `reRender` has just updated. `mindMap.render()` below is asynchronous, so
    // deferring this until its callback leaves one or two painted frames in
    // which the node's text is already at the new size while the host that
    // covers it is still at the old one -- the static glyphs then visibly stick
    // out past the editor.
    richText.updateTextEditNode?.();
    this.mindMap.render?.(() => {
      if (this.destroyed || this.mindMap?.richText?.showTextEdit !== true) return;
      // Second pass, once the tree layout has placed the node: the call above
      // could only use its pre-layout position.
      this.mindMap.richText?.updateTextEditNode?.();
    }, 'yemind-live-node-text-geometry');
    return true;
  }

  invalidate(): void {
    if (this.timer !== null) this.timers.clear(this.timer);
    this.timer = null;
  }

  destroy(): void {
    this.invalidate();
    this.destroyed = true;
    this.mindMap?.off?.('node_text_edit_change', this.onTextEditChange);
  }
}
