import {
  normalizeAppearanceMode,
  resolveAppearance,
  type AppearanceMode,
  type ResolvedAppearance,
} from '../core/appearanceMode';

export interface AppearanceControllerOptions {
  root: HTMLElement;
  getSystemDark?: () => boolean;
  subscribeSystem?: (listener: (dark: boolean) => void) => () => void;
  onChange?: (appearance: ResolvedAppearance, mode: AppearanceMode) => void;
}

export class AppearanceController {
  private mode: AppearanceMode = 'system';
  private systemDark: boolean;
  private resolved: ResolvedAppearance;
  private unsubscribeSystem: (() => void) | null = null;
  private destroyed = false;
  private lastNotified: ResolvedAppearance | null = null;

  constructor(private readonly options: AppearanceControllerOptions) {
    this.systemDark = Boolean(options.getSystemDark?.());
    this.resolved = resolveAppearance(this.mode, this.systemDark);
    this.apply();
    this.unsubscribeSystem = options.subscribeSystem?.((dark) => {
      if (this.destroyed) return;
      this.systemDark = Boolean(dark);
      if (this.mode === 'system') this.apply();
    }) ?? null;
  }

  setMode(value: AppearanceMode): void {
    if (this.destroyed) return;
    this.mode = normalizeAppearanceMode(value);
    this.apply();
  }

  getMode(): AppearanceMode {
    return this.mode;
  }

  getResolved(): ResolvedAppearance {
    return this.resolved;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribeSystem?.();
    this.unsubscribeSystem = null;
  }

  private apply(): void {
    this.resolved = resolveAppearance(this.mode, this.systemDark);
    this.options.root.dataset.appearanceMode = this.mode;
    this.options.root.dataset.appearance = this.resolved;
    this.options.root.style.colorScheme = this.resolved;
    if (this.lastNotified !== this.resolved) {
      this.lastNotified = this.resolved;
      this.options.onChange?.(this.resolved, this.mode);
    }
  }
}
