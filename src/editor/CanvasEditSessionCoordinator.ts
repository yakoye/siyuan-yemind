export type CanvasEditSessionPhase = 'idle' | 'opening' | 'active' | 'closing';

export interface CanvasEditSessionSnapshot {
  id: number;
  uid: string;
  phase: CanvasEditSessionPhase;
  revision: number;
  geometryReady: boolean;
  contentReady: boolean;
  selectionEpoch: number;
}

export interface CanvasSelectionSession {
  sessionId: number;
  uid: string;
  selectionEpoch: number;
}

function freezeSnapshot(
  value: CanvasEditSessionSnapshot,
): Readonly<CanvasEditSessionSnapshot> {
  return Object.freeze({ ...value });
}

/**
 * Single source of truth for the transient canvas editing lifecycle.
 *
 * DOM layers, geometry, selections and the formatting toolbar may only publish
 * state for the current monotonically increasing session id. A late callback
 * from the previous Quill/SVG instance is therefore discarded instead of
 * briefly repainting the previous node.
 */
export class CanvasEditSessionCoordinator {
  private nextId = 0;
  private current = freezeSnapshot({
    id: 0,
    uid: '',
    phase: 'idle',
    revision: 0,
    geometryReady: false,
    contentReady: false,
    selectionEpoch: 0,
  } satisfies CanvasEditSessionSnapshot);

  begin(uid: string): Readonly<CanvasEditSessionSnapshot> {
    this.current = freezeSnapshot({
      id: ++this.nextId,
      uid: String(uid ?? ''),
      phase: 'opening',
      revision: 0,
      geometryReady: false,
      contentReady: false,
      selectionEpoch: 0,
    });
    return this.current;
  }

  markEditorReady(
    id: number,
    readiness: { geometryReady: boolean; contentReady: boolean },
  ): Readonly<CanvasEditSessionSnapshot> | null {
    if (!this.isCurrent(id) || this.current.phase === 'closing') return null;
    const geometryReady = Boolean(readiness.geometryReady);
    const contentReady = Boolean(readiness.contentReady);
    this.current = freezeSnapshot({
      ...this.current,
      phase: geometryReady && contentReady ? 'active' : 'opening',
      geometryReady,
      contentReady,
    });
    return this.current;
  }

  advanceRevision(id: number): Readonly<CanvasEditSessionSnapshot> | null {
    if (!this.isCurrent(id) || this.current.phase === 'idle') return null;
    this.current = freezeSnapshot({
      ...this.current,
      revision: this.current.revision + 1,
    });
    return this.current;
  }

  acceptSelection(id: number): CanvasSelectionSession | null {
    if (!this.isCurrent(id) || this.current.phase !== 'active') return null;
    this.current = freezeSnapshot({
      ...this.current,
      selectionEpoch: this.current.selectionEpoch + 1,
    });
    return {
      sessionId: this.current.id,
      uid: this.current.uid,
      selectionEpoch: this.current.selectionEpoch,
    };
  }

  close(id: number): boolean {
    if (!this.isCurrent(id)) return false;
    this.current = freezeSnapshot({
      id: this.current.id,
      uid: '',
      phase: 'idle',
      revision: this.current.revision,
      geometryReady: false,
      contentReady: false,
      selectionEpoch: 0,
    });
    return true;
  }

  isCurrent(id: number): boolean {
    return id > 0 && this.current.id === id && this.current.phase !== 'idle';
  }

  snapshot(): Readonly<CanvasEditSessionSnapshot> {
    return this.current;
  }
}
