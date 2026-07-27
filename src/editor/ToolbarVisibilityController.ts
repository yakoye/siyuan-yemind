export type ToolbarSide = 'top' | 'left' | 'bottom';

export interface ToolbarVisibilityOptions {
  root: HTMLElement;
  pinned: boolean;
  hideDelayMs?: number;
  hotZonePx?: number;
}

interface SideState {
  timer: number | null;
}

const SIDES: ToolbarSide[] = ['top', 'left', 'bottom'];

const DATASET_KEYS: Record<ToolbarSide, 'topbarVisible' | 'leftbarVisible' | 'statusbarVisible'> = {
  top: 'topbarVisible',
  left: 'leftbarVisible',
  bottom: 'statusbarVisible',
};

const OWNER_SELECTORS: Record<ToolbarSide, string> = {
  top: '.ymz-topbar, .ymz-layout-gallery, .ymz-project-choice-panel, .ymz-project-style-panel, .ymz-node-style-panel, .ymz-transfer-panel',
  left: '.ymz-leftbar',
  bottom: '.ymz-statusbar',
};

export class ToolbarVisibilityController {
  private pinned: boolean;
  private readonly hideDelayMs: number;
  private readonly hotZonePx: number;
  private readonly sides: Record<ToolbarSide, SideState> = {
    top: { timer: null },
    left: { timer: null },
    bottom: { timer: null },
  };

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
    if (!this.pinned) SIDES.forEach((side) => this.scheduleHide(side));
  }

  destroy(): void {
    SIDES.forEach((side) => this.clearTimer(side));
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
    SIDES.forEach((side) => this.scheduleHide(side));
  }

  revealAll(): void {
    SIDES.forEach((side) => this.reveal(side, false));
    if (!this.pinned) SIDES.forEach((side) => this.scheduleHide(side));
  }

  revealBoth(): void {
    this.revealAll();
  }

  revealTop(): void {
    this.reveal('top');
  }

  revealBottom(): void {
    this.reveal('bottom');
  }

  revealLeft(): void {
    this.reveal('left');
  }

  private reveal(side: ToolbarSide, reschedule = true): void {
    this.options.root.dataset[DATASET_KEYS[side]] = 'true';
    this.clearTimer(side);
    if (!this.pinned && reschedule) this.scheduleHide(side);
  }

  private applyPinnedState(): void {
    this.options.root.dataset.toolbarsPinned = String(this.pinned);
  }

  private scheduleHide(side: ToolbarSide): void {
    if (this.pinned) return;
    this.clearTimer(side);
    this.sides[side].timer = window.setTimeout(() => {
      this.sides[side].timer = null;
      if (this.sideOwnsInteraction(side)) {
        this.scheduleHide(side);
        return;
      }
      this.options.root.dataset[DATASET_KEYS[side]] = 'false';
    }, this.hideDelayMs);
  }

  private sideOwnsInteraction(side: ToolbarSide): boolean {
    const selector = OWNER_SELECTORS[side];
    const active = document.activeElement;
    if (active instanceof Element && active.closest(selector)) return true;
    return Boolean(this.options.root.querySelector(`:is(${selector}):hover`));
  }

  private clearTimer(side: ToolbarSide): void {
    const timer = this.sides[side].timer;
    if (timer !== null) window.clearTimeout(timer);
    this.sides[side].timer = null;
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
    if (ownedSide) this.reveal(ownedSide);
    if (y <= this.hotZonePx) this.reveal('top');
    if (rect.height - y <= this.hotZonePx) this.reveal('bottom');
    if (x <= this.hotZonePx) this.reveal('left');
  };

  private readonly onPointerLeave = (): void => {
    if (!this.pinned) SIDES.forEach((side) => this.scheduleHide(side));
  };

  private readonly onFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    const side = this.sideFromTarget(target);
    if (side) this.reveal(side);
  };

  private readonly onFocusOut = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    const side = this.sideFromTarget(target);
    if (side && !this.pinned) this.scheduleHide(side);
  };

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const side = this.sideFromTarget(target);
    if (side && target.closest('[data-toolbar-edge]')) this.reveal(side);
  };
}
