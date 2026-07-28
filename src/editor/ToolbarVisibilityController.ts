export type ToolbarSide = 'top' | 'left' | 'bottom';

export interface ToolbarVisibilityOptions {
  root: HTMLElement;
  pinned: boolean;
  hideDelayMs?: number;
  hotZonePx?: number;
}

const SIDES: ToolbarSide[] = ['top', 'left', 'bottom'];

const DATASET_KEYS: Record<ToolbarSide, 'topbarVisible' | 'leftbarVisible' | 'statusbarVisible'> = {
  top: 'topbarVisible',
  left: 'leftbarVisible',
  bottom: 'statusbarVisible',
};

const OWNER_SELECTORS: Record<ToolbarSide, string> = {
  top: '.ymz-topbar, .ymz-topbar__overflow-menu, .ymz-search-panel, .ymz-layout-gallery, .ymz-project-choice-panel, .ymz-project-style-panel, .ymz-node-style-panel, .ymz-transfer-panel',
  left: '.ymz-leftbar',
  bottom: '.ymz-statusbar',
};
const OWNER_SELECTOR = Object.values(OWNER_SELECTORS).join(', ');

export class ToolbarVisibilityController {
  private pinned: boolean;
  private readonly hideDelayMs: number;
  private readonly hotZonePx: number;
  private timer: number | null = null;

  constructor(private readonly options: ToolbarVisibilityOptions) {
    this.pinned = Boolean(options.pinned);
    this.hideDelayMs = options.hideDelayMs ?? 700;
    this.hotZonePx = options.hotZonePx ?? 28;
    options.root.addEventListener('pointermove', this.onPointerMove);
    options.root.addEventListener('pointerleave', this.onPointerLeave);
    options.root.addEventListener('focusin', this.onFocusIn);
    options.root.addEventListener('focusout', this.onFocusOut);
    options.root.addEventListener('click', this.onClick);
    this.applyPinnedState();
    if (!this.pinned) this.scheduleHide();
  }

  destroy(): void {
    this.clearTimer();
    this.options.root.removeEventListener('pointermove', this.onPointerMove);
    this.options.root.removeEventListener('pointerleave', this.onPointerLeave);
    this.options.root.removeEventListener('focusin', this.onFocusIn);
    this.options.root.removeEventListener('focusout', this.onFocusOut);
    this.options.root.removeEventListener('click', this.onClick);
  }

  setPinned(value: boolean): void {
    this.pinned = Boolean(value);
    this.applyPinnedState();
    if (this.pinned) {
      this.revealAll();
      return;
    }
    this.scheduleHide();
  }

  revealAll(): void {
    SIDES.forEach((side) => {
      this.options.root.dataset[DATASET_KEYS[side]] = 'true';
    });
    this.clearTimer();
    if (!this.pinned) this.scheduleHide();
  }

  revealBoth(): void {
    this.revealAll();
  }

  revealTop(): void {
    this.revealAll();
  }

  revealBottom(): void {
    this.revealAll();
  }

  revealLeft(): void {
    this.revealAll();
  }

  private applyPinnedState(): void {
    this.options.root.dataset.toolbarsPinned = String(this.pinned);
  }

  private scheduleHide(): void {
    if (this.pinned) return;
    this.clearTimer();
    this.timer = window.setTimeout(() => {
      this.timer = null;
      if (this.ownsInteraction()) {
        this.scheduleHide();
        return;
      }
      SIDES.forEach((side) => {
        this.options.root.dataset[DATASET_KEYS[side]] = 'false';
      });
    }, this.hideDelayMs);
  }

  private ownsInteraction(): boolean {
    const active = document.activeElement;
    if (active instanceof Element && active.closest(OWNER_SELECTOR)) return true;
    return Boolean(this.options.root.querySelector(`:is(${OWNER_SELECTOR}):hover`));
  }

  private clearTimer(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  private sideFromTarget(target: HTMLElement): ToolbarSide | null {
    const edge = target.closest<HTMLElement>('[data-toolbar-edge]')?.dataset.toolbarEdge;
    if (edge === 'top' || edge === 'left' || edge === 'bottom') return edge;
    if (target.closest(OWNER_SELECTORS.top)) return 'top';
    if (target.closest(OWNER_SELECTORS.left)) return 'left';
    if (target.closest(OWNER_SELECTORS.bottom)) return 'bottom';
    return null;
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.pinned) return;
    const rect = this.options.root.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const target = event.target as HTMLElement;
    const ownedSide = this.sideFromTarget(target);
    if (
      ownedSide
      || y <= this.hotZonePx
      || rect.height - y <= this.hotZonePx
      || x <= this.hotZonePx
    ) this.revealAll();
  };

  private readonly onPointerLeave = (): void => {
    if (!this.pinned) this.scheduleHide();
  };

  private readonly onFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    const side = this.sideFromTarget(target);
    if (side) this.revealAll();
  };

  private readonly onFocusOut = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    const side = this.sideFromTarget(target);
    if (side && !this.pinned) this.scheduleHide();
  };

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const side = this.sideFromTarget(target);
    if (side && target.closest('[data-toolbar-edge]')) this.revealAll();
  };
}
