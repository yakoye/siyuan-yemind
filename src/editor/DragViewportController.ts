import { normalizePersistedViewData, type PersistedViewData } from '../core/dragBehavior';

export class DragViewportController {
  private active = false;
  private startView: PersistedViewData | undefined;

  begin(viewData: unknown): void {
    if (this.active) return;
    this.active = true;
    this.startView = normalizePersistedViewData(viewData);
  }

  shouldPersistView(): boolean {
    return !this.active;
  }

  finish(currentViewData: unknown, preserveViewport: boolean): PersistedViewData | undefined {
    const current = normalizePersistedViewData(currentViewData);
    const result = preserveViewport ? this.startView : current;
    this.active = false;
    this.startView = undefined;
    return result;
  }

  reset(): void {
    this.active = false;
    this.startView = undefined;
  }
}
