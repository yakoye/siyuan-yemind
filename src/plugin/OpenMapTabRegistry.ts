export interface OpenMapTabHandle {
  activate(): void;
  close(): void;
  updateTitle(title: string): void;
  focusNode?(uid: string): void;
  isAlive?(): boolean;
}

export class OpenMapTabRegistry {
  private readonly handles = new Map<string, OpenMapTabHandle>();

  register(mapId: string, handle: OpenMapTabHandle): () => void {
    this.handles.set(mapId, handle);
    return () => {
      if (this.handles.get(mapId) === handle) this.handles.delete(mapId);
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
