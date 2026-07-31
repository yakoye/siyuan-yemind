import { renderedNodeUid } from './richTextGeometry';
import { plainTextFromSearchValue } from './searchEngine';
import { hasActiveNodeWidthDrag } from './liveNodeWidthLayout';

export interface RenderTextEditPayload {
  node: any;
  text: string;
  richText?: boolean;
  reason?: 'paste' | 'input';
}

export interface RenderLifecycleScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
}

const browserScheduler: RenderLifecycleScheduler = {
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (id) => window.cancelAnimationFrame(id),
};

export interface RenderLifecycleTimer {
  request(callback: () => void, delayMs: number): number;
  cancel(id: number): void;
}

const browserTimer: RenderLifecycleTimer = {
  request: (callback, delayMs) => window.setTimeout(callback, delayMs) as unknown as number,
  cancel: (id) => window.clearTimeout(id),
};

// vendor's plain-text createTextNode() re-measures the whole string one character at a
// time (svg.js measureText() -> new SVG <text> element -> native getBBox(), which forces
// a synchronous layout, repeated for every character while probing where to wrap). A real
// Chrome performance trace on the user's own document showed this costing 180-380ms for a
// SINGLE commit on ordinary node text -- independent of how many descendants the node has.
// Committing on every keystroke (or every IME compositionupdate, which can fire many times
// per candidate) pays that full cost each time. Debouncing coalesces a typing/composition
// burst into one commit shortly after it pauses, instead of blocking the main thread on
// every character.
const DEFAULT_COMMIT_DEBOUNCE_MS = 160;

/**
 * Owns live edit rendering as one revisioned transaction. This replaces
 * simple-mind-map's trailing debounce, which could run after a node was moved
 * or deleted and repaint a stale node for one frame.
 */
export class RenderLifecycleCoordinator {
  private revision = 0;
  private frame: number | null = null;
  private debounceTimer: number | null = null;
  private pending: { revision: number; payload: RenderTextEditPayload } | null = null;
  private geometryRepairInFlight = false;
  private geometryRepairFrame: number | null = null;

  constructor(
    private readonly mindMap: any,
    private readonly onCommitted: (uid?: string) => void,
    private readonly scheduler: RenderLifecycleScheduler = browserScheduler,
    private readonly timer: RenderLifecycleTimer = browserTimer,
    private readonly commitDebounceMs: number = DEFAULT_COMMIT_DEBOUNCE_MS,
  ) {}

  private cancelScheduled(): void {
    if (this.debounceTimer !== null) this.timer.cancel(this.debounceTimer);
    this.debounceTimer = null;
    if (this.frame !== null) this.scheduler.cancel(this.frame);
    this.frame = null;
  }

  scheduleTextEdit(payload: RenderTextEditPayload): void {
    const uid = renderedNodeUid(payload.node);
    if (!uid) return;
    const revision = ++this.revision;
    this.cancelScheduled();
    if (payload.reason === 'paste') {
      this.pending = null;
      this.commitTextEdit(payload, revision);
      return;
    }
    this.pending = { revision, payload };
    this.debounceTimer = this.timer.request(() => {
      this.debounceTimer = null;
      if (revision !== this.revision || this.pending?.revision !== revision) return;
      this.frame = this.scheduler.request(() => {
        this.frame = null;
        if (revision !== this.revision || this.pending?.revision !== revision) return;
        this.pending = null;
        this.commitTextEdit(payload, revision);
      });
    }, this.commitDebounceMs);
  }

  flushPendingTextEdit(): boolean {
    const pending = this.pending;
    if (!pending) return false;
    this.cancelScheduled();
    this.pending = null;
    const revision = ++this.revision;
    this.commitTextEdit(pending.payload, revision);
    return true;
  }

  /**
   * Rich-text measurement can finish before a late theme/font transaction.
   * In that state the HTML text is taller or wider than its SVG
   * foreignObject, so the last glyphs are clipped even though the node data is
   * complete. Recreate only the affected text contents from their current
   * data, then run one normal layout pass. This is deliberately driven by a
   * geometry invariant rather than by a specific theme or node label.
   */
  reconcileRenderedTextGeometry(): boolean {
    if (
      this.geometryRepairInFlight
      || hasActiveNodeWidthDrag(this.mindMap?.renderer?.root)
    ) return false;
    const overflowing: Array<{
      node: any;
      foreignRect: { width: number; height: number };
      textRect: { width: number; height: number };
    }> = [];
    const visit = (node: any): void => {
      if (!node) return;
      const foreignObject = node?._textData?.nodeContent?.node as Element | undefined;
      const wrapper = foreignObject?.querySelector?.('.smm-richtext-node-wrap') as HTMLElement | null;
      const foreignRect = foreignObject?.getBoundingClientRect?.();
      const textRect = wrapper?.getBoundingClientRect?.();
      if (
        foreignRect
        && textRect
        && Number.isFinite(foreignRect.width)
        && Number.isFinite(foreignRect.height)
        && Number.isFinite(textRect.width)
        && Number.isFinite(textRect.height)
        && foreignRect.width > 0.5
        && foreignRect.height > 0.5
        && (
          textRect.width > foreignRect.width + 0.5
          || textRect.height > foreignRect.height + 0.5
        )
      ) {
        overflowing.push({ node, foreignRect, textRect });
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };
    visit(this.mindMap?.renderer?.root);
    if (overflowing.length === 0) return false;

    this.geometryRepairInFlight = true;
    const temporaryAutoWidths: string[] = [];
    overflowing.forEach(({ node, foreignRect, textRect }) => {
      const textData = node?._textData;
      const currentWidth = Number(textData?.width);
      const currentHeight = Number(textData?.height);
      if (!(currentWidth > 0) || !(currentHeight > 0)) return;
      const scaleX = foreignRect.width / currentWidth;
      const scaleY = foreignRect.height / currentHeight;
      if (!(scaleX > 0) || !(scaleY > 0)) return;
      const hasCustomWidth = Boolean(node?.hasCustomWidth?.() || node?.getData?.('customTextWidth'));
      const maxAutoWidth = Number(this.mindMap?.opt?.textAutoWrapWidth);
      const measuredWidth = Math.ceil(textRect.width / scaleX) + 1;
      const nextWidth = hasCustomWidth
        ? currentWidth
        : Math.max(
            currentWidth,
            Number.isFinite(maxAutoWidth) && maxAutoWidth > 0
              ? Math.min(measuredWidth, maxAutoWidth)
              : measuredWidth,
          );
      const nextHeight = Math.max(currentHeight, Math.ceil(textRect.height / scaleY));
      if (!hasCustomWidth) {
        const uid = String(node?.getData?.('uid') ?? '');
        if (uid) temporaryAutoWidths.push(uid);
        if (node?.nodeData?.data) node.nodeData.data.customTextWidth = nextWidth;
        node.customTextWidth = nextWidth;
      }
      node.reRender?.(['text'], { ignoreUpdateCustomTextWidth: true });
      // A forced width also makes the upstream engine measure the correct
      // multiline height. Keep the explicit assignments as a compatibility
      // floor for older compatible renderers.
      if (Number(node?._textData?.height) < nextHeight) {
        node._textData.height = nextHeight;
        node._textData.node?.attr?.('data-height', nextHeight);
        node._textData.nodeContent?.height?.(nextHeight);
      }
    });
    this.mindMap.render?.(() => {
      temporaryAutoWidths.forEach((uid) => {
        const live = this.mindMap?.renderer?.findNodeByUid?.(uid);
        if (live?.nodeData?.data) delete live.nodeData.data.customTextWidth;
        if (live) live.customTextWidth = undefined;
      });
      if (this.geometryRepairFrame !== null) this.scheduler.cancel(this.geometryRepairFrame);
      this.geometryRepairFrame = this.scheduler.request(() => {
        this.geometryRepairFrame = null;
        this.geometryRepairInFlight = false;
        this.onCommitted();
      });
    }, 'yemind-richtext-geometry-repair');
    return true;
  }

  private commitTextEdit(payload: RenderTextEditPayload, revision: number): void {
      const uid = renderedNodeUid(payload.node);
      if (!uid) return;
      const node = this.mindMap?.renderer?.findNodeByUid?.(uid);
      if (!node || typeof node.createTextNode !== 'function') return;
      const measurementText = payload.richText
        ? plainTextFromSearchValue(payload.text, true).trim()
        : payload.text;
      node._textData = node.createTextNode(measurementText);
      const rect = node.getNodeRect?.();
      if (rect && Number.isFinite(rect.width) && Number.isFinite(rect.height)) {
        node.width = rect.width;
        node.height = rect.height;
      }
      node.layout?.();
      // Keep the active Quill editor and its SVG node in one live geometry
      // transaction. Replacing the whole tree here makes the editor alternate
      // between the old and new SVG instances for one or more frames.
      if (this.mindMap?.richText?.showTextEdit === true) {
        node.update?.();
        // The incoming connector is owned by the parent. renderLine(deep) on the edited
        // node always redraws its own outgoing lines regardless of the deep flag; deep
        // only controls whether it also recurses into every descendant's renderLine.
        // This live-edit fast path never repositions descendants (layout() only rebuilds
        // the edited node's own SVG content), so passing deep=true here was pure waste
        // that scales with subtree size -- a real trace showed one keystroke on a node
        // with a non-trivial subtree causing 371 forced synchronous layouts in ~184ms.
        node.parent?.renderLine?.();
        node.renderLine?.();
        this.mindMap.richText?.updateTextEditNode?.();
        if (revision === this.revision) this.onCommitted(uid);
        return;
      }
      this.mindMap.render?.(() => {
        if (revision !== this.revision) return;
        this.mindMap.richText?.updateTextEditNode?.();
        this.onCommitted(uid);
      });
  }

  invalidate(): void {
    this.revision += 1;
    this.cancelScheduled();
  }

  destroy(): void {
    this.invalidate();
    if (this.geometryRepairFrame !== null) this.scheduler.cancel(this.geometryRepairFrame);
    this.geometryRepairFrame = null;
    this.geometryRepairInFlight = false;
    this.pending = null;
  }
}
