const MENU_VIEWPORT_MARGIN = 8;
const MENU_MIN_SCROLL_HEIGHT = 96;

type ViewportSize = {
  width: number;
  height: number;
};

const guards = new WeakMap<HTMLElement, () => void>();

function setStyle(
  element: HTMLElement,
  property: 'maxWidth' | 'maxHeight' | 'left' | 'top',
  value: string,
): void {
  if (element.style[property] === value) return;
  element.style[property] = value;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(value, Math.max(minimum, maximum)));
}

function constrainFloatingSurface(
  surface: HTMLElement,
  viewport: ViewportSize,
  scrollSurface?: HTMLElement | null,
): void {
  const rect = surface.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const availableWidth = Math.max(160, viewport.width - MENU_VIEWPORT_MARGIN * 2);
  const availableHeight = Math.max(MENU_MIN_SCROLL_HEIGHT, viewport.height - MENU_VIEWPORT_MARGIN * 2);
  setStyle(surface, 'maxWidth', `${Math.round(availableWidth)}px`);
  setStyle(surface, 'maxHeight', `${Math.round(availableHeight)}px`);

  if (scrollSurface) {
    const scrollRect = scrollSurface.getBoundingClientRect();
    const chromeHeight =
      Math.max(0, scrollRect.top - rect.top) +
      Math.max(0, rect.bottom - scrollRect.bottom);
    setStyle(
      scrollSurface,
      'maxHeight',
      `${Math.round(Math.max(MENU_MIN_SCROLL_HEIGHT, availableHeight - chromeHeight))}px`,
    );
  }

  const measured = surface.getBoundingClientRect();
  const width = Math.min(measured.width, availableWidth);
  const height = Math.min(measured.height, availableHeight);
  const left = clamp(measured.left, MENU_VIEWPORT_MARGIN, viewport.width - MENU_VIEWPORT_MARGIN - width);
  const top = clamp(measured.top, MENU_VIEWPORT_MARGIN, viewport.height - MENU_VIEWPORT_MARGIN - height);
  setStyle(surface, 'left', `${Math.round(left)}px`);
  setStyle(surface, 'top', `${Math.round(top)}px`);
}

export function constrainContextMenuToViewport(
  element: HTMLElement,
  viewport: ViewportSize = { width: window.innerWidth, height: window.innerHeight },
): void {
  if (!element.isConnected || element.hidden || element.classList.contains('fn__none')) return;
  constrainFloatingSurface(
    element,
    viewport,
    element.querySelector<HTMLElement>(':scope > .b3-menu__items, :scope > .ymw-menu__list'),
  );
  element
    .querySelectorAll<HTMLElement>(
      ':scope > .ymw-submenu:not([hidden]), :scope .b3-menu__submenu:not(.fn__none)',
    )
    .forEach((submenu) => {
      constrainFloatingSurface(
        submenu,
        viewport,
        submenu.matches('.ymw-submenu')
          ? submenu
          : submenu.querySelector<HTMLElement>(':scope > .b3-menu__items'),
      );
    });
}

export function attachContextMenuViewportGuard(element: HTMLElement): void {
  if (guards.has(element)) return;

  let frame = 0;
  let disposed = false;
  const cleanup = (): void => {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener('resize', schedule);
    document.removeEventListener('pointerdown', schedule, true);
    document.removeEventListener('keydown', schedule, true);
    element.removeEventListener('pointerover', schedule, true);
    element.removeEventListener('click', schedule, true);
    guards.delete(element);
  };
  const update = (): void => {
    frame = 0;
    if (!element.isConnected) {
      cleanup();
      return;
    }
    constrainContextMenuToViewport(element);
  };
  const schedule = (): void => {
    if (disposed || frame) return;
    frame = window.requestAnimationFrame(update);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(element, {
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-expanded'],
    childList: true,
    subtree: true,
  });
  const resizeObserver = typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver(schedule);
  resizeObserver?.observe(element);
  window.addEventListener('resize', schedule);
  document.addEventListener('pointerdown', schedule, true);
  document.addEventListener('keydown', schedule, true);
  element.addEventListener('pointerover', schedule, true);
  element.addEventListener('click', schedule, true);
  guards.set(element, cleanup);
  schedule();
}
