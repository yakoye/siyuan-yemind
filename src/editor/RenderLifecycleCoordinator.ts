import { renderedNodeUid } from './richTextGeometry';
import { plainTextFromSearchValue } from './searchEngine';

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

/**
 * Owns live edit rendering as one revisioned transaction. This replaces
 * simple-mind-map's trailing debounce, which could run after a node was moved
 * or deleted and repaint a stale node for one frame.
 */
export class RenderLifecycleCoordinator {
  private revision = 0;
  private frame: number | null = null;
  private pending: { revision: number; payload: RenderTextEditPayload } | null = null;
  private geometryRepairInFlight = false;
  private geometryRepairFrame: number | null = null;

  constructor(
    private readonly mindMap: any,
    private readonly onCommitted: (uid?: string) => void,
    private readonly scheduler: RenderLifecycleScheduler = browserScheduler,
  ) {}

  scheduleTextEdit(payload: RenderTextEditPayload): void {
    const uid = renderedNodeUid(payload.node);
    if (!uid) return;
    const revision = ++this.revision;
    if (this.frame !== null) this.scheduler.cancel(this.frame);
    this.frame = null;
    if (payload.reason === 'paste') {
      this.pending = null;
      this.commitTextEdit(payload, revision);
      return;
    }
    this.pending = { revision, payload };
    this.frame = this.scheduler.request(() => {
      this.frame = null;
      if (revision !== this.revision || this.pending?.revision !== revision) return;
      this.pending = null;
      this.commitTextEdit(payload, revision);
    });
  }

  flushPendingTextEdit(): boolean {
    const pending = this.pending;
    if (!pending) return false;
    if (this.frame !== null) this.scheduler.cancel(this.frame);
    this.frame = null;
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
    if (this.geometryRepairInFlight) return false;
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
      this.mindMap.render?.(() => {
        if (revision !== this.revision) return;
        this.mindMap.richText?.updateTextEditNode?.();
        this.onCommitted(uid);
      });
  }

  invalidate(): void {
    this.revision += 1;
    if (this.frame !== null) this.scheduler.cancel(this.frame);
    this.frame = null;
  }

  destroy(): void {
    this.invalidate();
    if (this.geometryRepairFrame !== null) this.scheduler.cancel(this.geometryRepairFrame);
    this.geometryRepairFrame = null;
    this.geometryRepairInFlight = false;
    this.pending = null;
  }
}
