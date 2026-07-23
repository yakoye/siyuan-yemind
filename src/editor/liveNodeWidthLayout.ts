export interface AnimationFrameDriver {
  request(callback: FrameRequestCallback): number;
  cancel(handle: number): void;
}

export function hasActiveNodeWidthDrag(root: any): boolean {
  if (!root) return false;
  if (root.isDragHandleMousedown === true) return true;
  const children = Array.isArray(root.children) ? root.children : [];
  return children.some(hasActiveNodeWidthDrag);
}

/**
 * simple-mind-map redraws only the resized node during a width-handle drag and
 * waits until mouseup before laying out the complete tree. This controller
 * schedules a full, history-free layout on the next animation frame so child
 * nodes and their lines follow the changing parent width in real time.
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
    if (!hasActiveNodeWidthDrag(this.map?.renderer?.root)) return;
    this.frame = this.animation.request(() => {
      this.frame = null;
      if (this.destroyed || !hasActiveNodeWidthDrag(this.map?.renderer?.root)) return;
      this.map?.render?.();
    });
  };
}
