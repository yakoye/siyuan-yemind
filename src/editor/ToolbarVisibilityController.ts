export interface ToolbarVisibilityOptions {
  root: HTMLElement;
  pinned: boolean;
  hideDelayMs?: number;
  hotZonePx?: number;
}

export class ToolbarVisibilityController {
  private pinned: boolean;
  private hideTimer: number | null = null;
  private readonly hideDelayMs: number;
  private readonly hotZonePx: number;

  constructor(private readonly options: ToolbarVisibilityOptions) {
    this.pinned = Boolean(options.pinned);
    this.hideDelayMs = options.hideDelayMs ?? 700;
    this.hotZonePx = options.hotZonePx ?? 28;
    options.root.addEventListener('pointermove', this.onPointerMove);
    options.root.addEventListener('pointerleave', this.onPointerLeave);
    options.root.addEventListener('focusin', this.onFocusIn);
    options.root.addEventListener('focusout', this.onFocusOut);
    this.applyPinnedState();
    if (!this.pinned) this.scheduleHide();
  }

  destroy(): void {
    this.clearTimer();
    this.options.root.removeEventListener('pointermove', this.onPointerMove);
    this.options.root.removeEventListener('pointerleave', this.onPointerLeave);
    this.options.root.removeEventListener('focusin', this.onFocusIn);
    this.options.root.removeEventListener('focusout', this.onFocusOut);
  }

  setPinned(value: boolean): void {
    this.pinned = Boolean(value);
    this.applyPinnedState();
    if (this.pinned) this.revealAll();
    else this.scheduleHide();
  }

  revealAll(): void {
    this.options.root.dataset.topbarVisible = 'true';
    this.options.root.dataset.statusbarVisible = 'true';
    this.options.root.dataset.leftbarVisible = 'true';
    this.clearTimer();
  }

  revealBoth(): void { this.revealAll(); }

  revealTop(): void {
    this.options.root.dataset.topbarVisible = 'true';
    this.clearTimer();
    if (!this.pinned) this.scheduleHide();
  }

  revealBottom(): void {
    this.options.root.dataset.statusbarVisible = 'true';
    this.clearTimer();
    if (!this.pinned) this.scheduleHide();
  }

  revealLeft(): void {
    this.options.root.dataset.leftbarVisible = 'true';
    this.clearTimer();
    if (!this.pinned) this.scheduleHide();
  }

  private applyPinnedState(): void {
    this.options.root.dataset.toolbarsPinned = String(this.pinned);
    if (this.pinned) this.revealAll();
  }

  private scheduleHide(): void {
    if (this.pinned) return;
    this.clearTimer();
    this.hideTimer = window.setTimeout(() => {
      this.hideTimer = null;
      if (this.options.root.querySelector('.ymz-topbar:hover, .ymz-statusbar:hover, .ymz-leftbar:hover, .ymz-layout-gallery:hover, .ymz-project-choice-panel:hover, .ymz-project-style-panel:hover, .ymz-node-style-panel:hover, .ymz-topbar :focus, .ymz-statusbar :focus, .ymz-leftbar :focus')) {
        this.scheduleHide();
        return;
      }
      this.options.root.dataset.topbarVisible = 'false';
      this.options.root.dataset.statusbarVisible = 'false';
      this.options.root.dataset.leftbarVisible = 'false';
    }, this.hideDelayMs);
  }

  private clearTimer(): void {
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.pinned) return;
    const rect = this.options.root.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const target = event.target as HTMLElement;
    if (y <= this.hotZonePx || target.closest('.ymz-topbar, .ymz-layout-gallery, .ymz-project-choice-panel, .ymz-project-style-panel, .ymz-node-style-panel')) this.revealTop();
    if (rect.height - y <= this.hotZonePx || target.closest('.ymz-statusbar')) this.revealBottom();
    if (x <= this.hotZonePx || target.closest('.ymz-leftbar')) this.revealLeft();
  };

  private readonly onPointerLeave = (): void => this.scheduleHide();
  private readonly onFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    if (target.closest('.ymz-topbar')) this.revealTop();
    if (target.closest('.ymz-statusbar')) this.revealBottom();
    if (target.closest('.ymz-leftbar')) this.revealLeft();
  };
  private readonly onFocusOut = (): void => this.scheduleHide();
}
