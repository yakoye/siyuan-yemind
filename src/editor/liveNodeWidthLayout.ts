export interface AnimationFrameDriver {
  request(callback: FrameRequestCallback): number;
  cancel(handle: number): void;
}

export function hasActiveNodeWidthDrag(root: any): boolean {
  return findActiveNodeWidthDrag(root) !== null;
}

export function findActiveNodeWidthDrag(root: any): any | null {
  if (!root) return null;
  if (root.isDragHandleMousedown === true) return root;
  const children = Array.isArray(root.children) ? root.children : [];
  for (const child of children) {
    const active = findActiveNodeWidthDrag(child);
    if (active) return active;
  }
  return null;
}

/**
 * simple-mind-map redraws only the resized node during a width-handle drag and
 * waits until mouseup before laying out the complete tree and committing the
 * width. Keep that draft/commit boundary intact. This controller only keeps
 * YeMind's detached HTML text editor aligned with the locally redrawn node.
 *
 * Do not render the full tree here: render data still contains the committed
 * width during pointer movement, so a full render would replace the live node
 * with stale geometry and make the node jump, disappear, or snap back.
 */
export class LiveNodeWidthLayoutController {
  private frame: number | null = null;
  private destroyed = false;
  private readonly animation: AnimationFrameDriver;

  constructor(
    private readonly map: any,
    private readonly target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
    animation?: AnimationFrameDriver,
  ) {
    this.animation = animation ?? {
      request: (callback) => window.requestAnimationFrame(callback),
      cancel: (handle) => window.cancelAnimationFrame(handle),
    };
    this.target.addEventListener('mousemove', this.onMousemove as EventListener);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.target.removeEventListener('mousemove', this.onMousemove as EventListener);
    if (this.frame !== null) this.animation.cancel(this.frame);
    this.frame = null;
  }

  private readonly onMousemove = (): void => {
    if (this.destroyed || this.frame !== null) return;
    if (!findActiveNodeWidthDrag(this.map?.renderer?.root)) return;
    this.frame = this.animation.request(() => {
      this.frame = null;
      if (this.destroyed) return;
      const active = findActiveNodeWidthDrag(this.map?.renderer?.root);
      if (!active) return;
      this.synchronizeEditingSurface();
    });
  };

  /** Keep the upstream HTML editor aligned with the node's draft geometry. */
  private synchronizeEditingSurface(): void {
    const richText = this.map?.richText;
    if (richText?.showTextEdit === true) richText.updateTextEditNode?.();
  }
}
