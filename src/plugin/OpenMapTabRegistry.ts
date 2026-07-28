export interface OpenMapTabHandle {
  activate(): void;
  close(): void;
  updateTitle(title: string): void;
  focusNode?(uid: string): void;
  isAlive?(): boolean;
}

export interface OpenMapTabRegistration {
  accepted: boolean;
  unregister(): void;
}

export class OpenMapTabRegistry {
  private readonly handles = new Map<string, OpenMapTabHandle>();
  private readonly registrationWaiters = new Map<string, Set<(registered: boolean) => void>>();

  register(mapId: string, handle: OpenMapTabHandle): () => void {
    return this.tryRegister(mapId, handle).unregister;
  }

  tryRegister(mapId: string, handle: OpenMapTabHandle): OpenMapTabRegistration {
    const existing = this.getLiveHandle(mapId);
    if (existing && existing !== handle) {
      // SiYuan can restore the same custom tab more than once from an older
      // workspace snapshot. Keep the first live owner and close the duplicate.
      queueMicrotask(() => handle.close());
      return { accepted: false, unregister: () => undefined };
    }
    this.handles.set(mapId, handle);
    this.resolveWaiters(mapId, true);
    return {
      accepted: true,
      unregister: () => {
        if (this.handles.get(mapId) === handle) this.handles.delete(mapId);
      },
    };
  }

  activate(mapId: string): boolean {
    const handle = this.getLiveHandle(mapId);
    if (!handle) return false;
    handle.activate();
    return true;
  }


  focusNode(mapId: string, uid: string): boolean {
    const handle = this.getLiveHandle(mapId);
    if (!handle || !handle.focusNode) return false;
    handle.activate();
    handle.focusNode(uid);
    return true;
  }
  close(mapId: string): boolean {
    const handle = this.getLiveHandle(mapId);
    if (!handle) return false;
    this.handles.delete(mapId);
    handle.close();
    return true;
  }

  updateTitle(mapId: string, title: string): void {
    this.getLiveHandle(mapId)?.updateTitle(title);
  }

  async waitForRegistration(mapId: string, timeoutMs = 120): Promise<boolean> {
    if (this.getLiveHandle(mapId)) return true;
    return new Promise<boolean>((resolve) => {
      const waiters = this.registrationWaiters.get(mapId) ?? new Set();
      let settled = false;
      const finish = (registered: boolean): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        waiters.delete(finish);
        if (waiters.size === 0) this.registrationWaiters.delete(mapId);
        resolve(registered);
      };
      waiters.add(finish);
      this.registrationWaiters.set(mapId, waiters);
      const timer = window.setTimeout(() => finish(Boolean(this.getLiveHandle(mapId))), timeoutMs);
    });
  }

  private resolveWaiters(mapId: string, registered: boolean): void {
    const waiters = this.registrationWaiters.get(mapId);
    if (!waiters) return;
    [...waiters].forEach((resolve) => resolve(registered));
  }

  private getLiveHandle(mapId: string): OpenMapTabHandle | null {
    const handle = this.handles.get(mapId);
    if (!handle) return null;
    if (handle.isAlive && !handle.isAlive()) {
      this.handles.delete(mapId);
      return null;
    }
    return handle;
  }
}
