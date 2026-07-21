export interface WaitForNonZeroSizeOptions {
  isCancelled?: () => boolean;
  pollMs?: number;
}

export function hasNonZeroSize(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const width = Number(rect.width || element.clientWidth || 0);
  const height = Number(rect.height || element.clientHeight || 0);
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}

export function waitForNonZeroSize(
  element: HTMLElement,
  options: WaitForNonZeroSizeOptions = {},
): Promise<boolean> {
  if (options.isCancelled?.()) return Promise.resolve(false);
  if (hasNonZeroSize(element)) return Promise.resolve(true);
  const pollMs = Math.max(1, Math.floor(options.pollMs ?? 50));

  return new Promise<boolean>((resolve) => {
    let done = false;
    let timer: number | null = null;
    let observer: ResizeObserver | null = null;

    const finish = (value: boolean): void => {
      if (done) return;
      done = true;
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      observer?.disconnect();
      observer = null;
      resolve(value);
    };

    const schedule = (): void => {
      if (done) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        check();
      }, pollMs);
    };

    const check = (): void => {
      if (done) return;
      if (options.isCancelled?.()) {
        finish(false);
        return;
      }
      if (hasNonZeroSize(element)) {
        finish(true);
        return;
      }
      schedule();
    };

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => check());
      observer.observe(element);
    }
    schedule();
  });
}
