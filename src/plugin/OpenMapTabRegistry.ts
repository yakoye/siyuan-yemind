export interface OpenMapTabHandle {
  activate(): void;
  close(): void;
  updateTitle(title: string): void;
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
    const handle = this.handles.get(mapId);
    if (!handle) return false;
    handle.activate();
    return true;
  }

  close(mapId: string): boolean {
    const handle = this.handles.get(mapId);
    if (!handle) return false;
    this.handles.delete(mapId);
    handle.close();
    return true;
  }

  updateTitle(mapId: string, title: string): void {
    this.handles.get(mapId)?.updateTitle(title);
  }
}
