export interface RightPointerLike {
  button: number;
  clientX: number;
  clientY: number;
}

export interface MovePointerLike {
  clientX: number;
  clientY: number;
}

export interface RightDragMoveResult {
  dragging: boolean;
  dx: number;
  dy: number;
}

export class CanvasRightDragGesture {
  private active = false;
  private dragging = false;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private suppressMenu = false;
  private contextSuppressedDuringDrag = false;

  constructor(private readonly threshold = 5) {}

  pointerDown(event: RightPointerLike): boolean {
    if (event.button !== 2) return false;
    this.active = true;
    this.dragging = false;
    this.suppressMenu = false;
    this.contextSuppressedDuringDrag = false;
    this.startX = this.lastX = event.clientX;
    this.startY = this.lastY = event.clientY;
    return true;
  }

  pointerMove(event: MovePointerLike): RightDragMoveResult {
    if (!this.active) return { dragging: false, dx: 0, dy: 0 };
    const total = Math.hypot(event.clientX - this.startX, event.clientY - this.startY);
    if (!this.dragging && total <= this.threshold) {
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      return { dragging: false, dx: 0, dy: 0 };
    }
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    return { dragging: true, dx, dy };
  }

  pointerUp(): boolean {
    if (!this.active) return false;
    const dragged = this.dragging;
    this.active = false;
    this.dragging = false;
    this.suppressMenu = dragged && !this.contextSuppressedDuringDrag;
    return dragged;
  }

  cancel(): void {
    this.active = false;
    this.dragging = false;
  }

  consumeContextMenu(): boolean {
    if (this.active && this.dragging) {
      this.contextSuppressedDuringDrag = true;
      return true;
    }
    if (!this.suppressMenu) return false;
    this.suppressMenu = false;
    return true;
  }

  get isDragging(): boolean {
    return this.dragging;
  }
}

export function shouldSuppressCanvasContextMenu(gesture: CanvasRightDragGesture): boolean {
  return gesture.consumeContextMenu();
}

export interface CanvasRightDragControllerOptions {
  root: HTMLElement;
  map: any;
  mode: () => "pan" | "select";
}

export class CanvasRightDragController {
  private readonly gesture = new CanvasRightDragGesture(5);

  constructor(private readonly options: CanvasRightDragControllerOptions) {
    options.map.on?.("mousedown", this.onMouseDown);
    options.map.on?.("mousemove", this.onMouseMove);
    options.map.on?.("mouseup", this.onMouseUp);
    window.addEventListener("mouseup", this.onWindowMouseUp, true);
    window.addEventListener("blur", this.onWindowBlur);
  }

  destroy(): void {
    this.options.map.off?.("mousedown", this.onMouseDown);
    this.options.map.off?.("mousemove", this.onMouseMove);
    this.options.map.off?.("mouseup", this.onMouseUp);
    window.removeEventListener("mouseup", this.onWindowMouseUp, true);
    window.removeEventListener("blur", this.onWindowBlur);
    this.cancel();
  }

  consumeContextMenu(): boolean {
    return this.gesture.consumeContextMenu();
  }

  cancel(): void {
    this.gesture.cancel();
    this.options.root.classList.remove("is-canvas-right-dragging");
  }

  private readonly onMouseDown = (event: MouseEvent): void => {
    this.gesture.pointerDown(event);
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    const result = this.gesture.pointerMove(event);
    if (!result.dragging) return;
    event.preventDefault();
    this.options.root.classList.add("is-canvas-right-dragging");
    if (this.options.mode() === "pan" && (result.dx || result.dy)) {
      this.options.map.view?.translateXY?.(result.dx, result.dy);
    }
  };

  private readonly finishGesture = (): void => {
    this.gesture.pointerUp();
    this.options.root.classList.remove("is-canvas-right-dragging");
  };

  private readonly onMouseUp = (): void => {
    this.finishGesture();
  };

  private readonly onWindowMouseUp = (event: MouseEvent): void => {
    if (event.button !== 2 && !this.gesture.isDragging) return;
    this.finishGesture();
  };

  private readonly onWindowBlur = (): void => {
    this.cancel();
  };
}
