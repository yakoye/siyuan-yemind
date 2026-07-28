import { renderedNodeUid } from './richTextGeometry';
import { plainTextFromSearchValue } from './searchEngine';

export interface RenderTextEditPayload {
  node: any;
  text: string;
  richText?: boolean;
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

  constructor(
    private readonly mindMap: any,
    private readonly onCommitted: () => void,
    private readonly scheduler: RenderLifecycleScheduler = browserScheduler,
  ) {}

  scheduleTextEdit(payload: RenderTextEditPayload): void {
    const uid = renderedNodeUid(payload.node);
    if (!uid) return;
    const revision = ++this.revision;
    if (this.frame !== null) this.scheduler.cancel(this.frame);
    this.frame = this.scheduler.request(() => {
      this.frame = null;
      if (revision !== this.revision) return;
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
        this.onCommitted();
      });
    });
  }

  invalidate(): void {
    this.revision += 1;
    if (this.frame !== null) this.scheduler.cancel(this.frame);
    this.frame = null;
  }

  destroy(): void {
    this.invalidate();
  }
}
