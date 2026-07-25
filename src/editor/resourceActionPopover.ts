export type ResourceActionKind = 'marker' | 'clipart';

export interface ResourceActionPopoverShowOptions {
  kind: ResourceActionKind;
  anchorRect: DOMRect;
  onReplace(): void;
  onDelete(): void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class ResourceActionPopover {
  private readonly element: HTMLDivElement;
  private replace: (() => void) | null = null;
  private remove: (() => void) | null = null;

  constructor(private readonly root: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'ymz-resource-action-popover';
    this.element.hidden = true;
    this.element.innerHTML = `
      <button type="button" data-resource-action="replace" title="替换">↻ <span>替换</span></button>
      <button type="button" data-resource-action="delete" title="删除">⌫ <span>删除</span></button>`;
    this.root.appendChild(this.element);
    this.element.addEventListener('click', this.onClick);
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  show(options: ResourceActionPopoverShowOptions): void {
    this.replace = options.onReplace;
    this.remove = options.onDelete;
    this.element.dataset.resourceKind = options.kind;
    this.element.hidden = false;
    this.element.style.visibility = 'hidden';
    requestAnimationFrame(() => {
      if (this.element.hidden) return;
      const rect = this.element.getBoundingClientRect();
      const gap = 8;
      const margin = 10;
      const candidates = [
        { left: options.anchorRect.left + options.anchorRect.width / 2 - rect.width / 2, top: options.anchorRect.top - rect.height - gap },
        { left: options.anchorRect.left + options.anchorRect.width / 2 - rect.width / 2, top: options.anchorRect.bottom + gap },
        { left: options.anchorRect.right + gap, top: options.anchorRect.top + options.anchorRect.height / 2 - rect.height / 2 },
        { left: options.anchorRect.left - rect.width - gap, top: options.anchorRect.top + options.anchorRect.height / 2 - rect.height / 2 },
      ];
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const fitting = candidates.find((item) => item.left >= margin && item.top >= margin && item.left + rect.width <= viewportWidth - margin && item.top + rect.height <= viewportHeight - margin) ?? candidates[0];
      this.element.style.left = `${Math.round(clamp(fitting.left, margin, Math.max(margin, viewportWidth - rect.width - margin)))}px`;
      this.element.style.top = `${Math.round(clamp(fitting.top, margin, Math.max(margin, viewportHeight - rect.height - margin)))}px`;
      this.element.style.visibility = 'visible';
    });
  }

  hide(): void {
    this.element.hidden = true;
    this.replace = null;
    this.remove = null;
  }

  destroy(): void {
    this.element.removeEventListener('click', this.onClick);
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    this.element.remove();
  }

  private readonly onClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-resource-action]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.resourceAction;
    const callback = action === 'replace' ? this.replace : this.remove;
    this.hide();
    callback?.();
  };

  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    if (this.element.hidden) return;
    const target = event.target;
    if (target instanceof Node && this.element.contains(target)) return;
    this.hide();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.hide();
  };
}
