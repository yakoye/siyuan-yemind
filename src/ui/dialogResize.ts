export interface DialogResizeInput {
  startWidth: number;
  startHeight: number;
  deltaX: number;
  deltaY: number;
  viewportWidth: number;
  viewportHeight: number;
  minWidth?: number;
  minHeight?: number;
  viewportMargin?: number;
}

export function calculateDialogResize(input: DialogResizeInput): { width: number; height: number } {
  const margin = Math.max(0, input.viewportMargin ?? 32);
  const minWidth = Math.max(240, input.minWidth ?? 420);
  const minHeight = Math.max(180, input.minHeight ?? 280);
  const maxWidth = Math.max(minWidth, input.viewportWidth - margin);
  const maxHeight = Math.max(minHeight, input.viewportHeight - margin);
  return {
    width: Math.round(Math.min(maxWidth, Math.max(minWidth, input.startWidth + input.deltaX))),
    height: Math.round(Math.min(maxHeight, Math.max(minHeight, input.startHeight + input.deltaY))),
  };
}

export function bindDialogResize(handle: HTMLElement, container: HTMLElement): () => void {
  let cleanupMove: (() => void) | null = null;
  const finish = (): void => {
    cleanupMove?.();
    cleanupMove = null;
    container.classList.remove('is-resizing');
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    finish();
    const startX = event.clientX;
    const startY = event.clientY;
    const rect = container.getBoundingClientRect();
    container.classList.add('is-resizing');
    handle.setPointerCapture?.(event.pointerId);
    const onMove = (move: PointerEvent): void => {
      const next = calculateDialogResize({
        startWidth: rect.width,
        startHeight: rect.height,
        deltaX: move.clientX - startX,
        deltaY: move.clientY - startY,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
      container.style.width = `${next.width}px`;
      container.style.height = `${next.height}px`;
      container.style.maxWidth = 'calc(100vw - 32px)';
      container.style.maxHeight = 'calc(100vh - 32px)';
    };
    const onUp = (): void => finish();
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, { capture: true, once: true });
    window.addEventListener('pointercancel', onUp, { capture: true, once: true });
    cleanupMove = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
    };
  };
  handle.addEventListener('pointerdown', onPointerDown);
  return () => {
    finish();
    handle.removeEventListener('pointerdown', onPointerDown);
  };
}
