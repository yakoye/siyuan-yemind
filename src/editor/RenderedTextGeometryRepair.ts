import { hasActiveNodeWidthDrag } from './liveNodeWidthLayout';

export interface RenderedTextGeometryScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
}

const browserScheduler: RenderedTextGeometryScheduler = {
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (id) => window.cancelAnimationFrame(id),
};

/**
 * Runs after a full render (theme/font change, opening a saved map, structural
 * mutation) to catch a rich-text node whose measured HTML content no longer
 * fits its SVG foreignObject and repaint just that node once. This never runs
 * during an active edit session -- the live-edit commit path that used to
 * share this class was removed because it rebuilt static SVG text on every
 * keystroke (see docs/superpowers/plans/2026-07-31-canvas-text-edit-stabilization.md).
 */
export class RenderedTextGeometryRepair {
  private geometryRepairInFlight = false;
  private geometryRepairFrame: number | null = null;

  constructor(
    private readonly mindMap: any,
    private readonly onCommitted: (uid?: string) => void,
    private readonly scheduler: RenderedTextGeometryScheduler = browserScheduler,
  ) {}

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

  invalidate(): void {
    if (this.geometryRepairFrame !== null) this.scheduler.cancel(this.geometryRepairFrame);
    this.geometryRepairFrame = null;
  }

  destroy(): void {
    this.invalidate();
    this.geometryRepairInFlight = false;
  }
}
