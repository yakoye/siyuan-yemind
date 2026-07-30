type MindMapLike = {
  on?(name: string, callback: (...args: unknown[]) => void): void;
  off?(name: string, callback: (...args: unknown[]) => void): void;
  emit?(name: string, ...args: unknown[]): void;
  renderer?: {
    findNodeByUid?(uid: string): any;
    textEdit?: {
      show?(options: {
        node: any;
        isInserting: boolean;
        isFromKeyDown: boolean;
      }): unknown;
    };
  };
  richText?: {
    showTextEdit?: boolean;
    node?: any;
    focus?(start?: number): void;
  };
};

type FrameHandle = number | ReturnType<typeof setTimeout>;

function nodeUid(node: any): string {
  return String(node?.getData?.('uid') ?? node?.nodeData?.data?.uid ?? '');
}

function scheduleFrame(callback: FrameRequestCallback): FrameHandle {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 16);
}

function cancelFrame(handle: FrameHandle | null): void {
  if (handle === null) return;
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(handle as number);
    return;
  }
  clearTimeout(handle as ReturnType<typeof setTimeout>);
}

/**
 * Owns the complete "insert node and enter editing" transaction.
 *
 * simple-mind-map normally emits `node_dblclick` from inside its SVG render
 * stack. A host application can move focus while that same stack is still
 * settling, leaving a correctly created node without an editable caret.
 * YeMind keeps the upstream native insertion/opening transaction, identifies
 * it with a preallocated UID, and claims focus only after that exact editor
 * reports geometry readiness. If an alternative renderer does not open the
 * editor, the UID lookup below provides a bounded compatibility fallback.
 */
export class InsertedNodeEditCoordinator {
  private generation = 0;
  private frame: FrameHandle | null = null;
  private renderListener: (() => void) | null = null;
  private readyListener: ((...args: unknown[]) => void) | null = null;
  private attempts = 0;

  constructor(private readonly mindMap: MindMapLike) {}

  run(uid: string, insert: () => void): void {
    if (!uid) {
      insert();
      return;
    }

    this.cancel();
    const generation = ++this.generation;
    this.attempts = 0;
    this.renderListener = () => this.scheduleAttempt(uid, generation);
    this.readyListener = (...args) => {
      const payload = args[0] as { uid?: string } | undefined;
      if (String(payload?.uid ?? '') !== uid) return;
      this.focusExistingEditor(uid, generation);
    };
    this.mindMap.on?.('node_tree_render_end', this.renderListener);
    this.mindMap.on?.('yemind_text_edit_ready', this.readyListener);

    try {
      insert();
    } catch (error) {
      this.cancel();
      throw error;
    }

    // Some renderers emit before the command returns; others render
    // asynchronously. Scheduling here as well makes both paths identical.
    this.scheduleAttempt(uid, generation);
  }

  cancel(): void {
    this.generation += 1;
    cancelFrame(this.frame);
    this.frame = null;
    this.detachListeners();
    this.attempts = 0;
  }

  private scheduleAttempt(uid: string, generation: number): void {
    if (generation !== this.generation || this.frame !== null) return;
    this.frame = scheduleFrame(() => {
      this.frame = null;
      this.tryOpen(uid, generation);
    });
  }

  private tryOpen(uid: string, generation: number): void {
    if (generation !== this.generation) return;
    const node = this.mindMap.renderer?.findNodeByUid?.(uid) ?? null;
    if (!node) {
      this.attempts += 1;
      if (this.attempts < 12) this.scheduleAttempt(uid, generation);
      else this.detachListeners();
      return;
    }

    if (this.isEditingUid(uid)) {
      this.focusExistingEditor(uid, generation);
      return;
    }

    this.detachListeners();
    node.active?.();
    const show = this.mindMap.renderer?.textEdit?.show;
    const opening = typeof show === 'function'
      ? show.call(this.mindMap.renderer?.textEdit, {
        node,
        isInserting: true,
        isFromKeyDown: false,
      })
      : this.mindMap.emit?.('node_dblclick', node, null, true);

    Promise.resolve(opening).then(() => {
      if (generation !== this.generation) return;
      this.frame = scheduleFrame(() => {
        this.frame = null;
        if (generation !== this.generation) return;
        const richText = this.mindMap.richText;
        const editingUid = nodeUid(richText?.node);
        if (richText?.showTextEdit === false) return;
        if (editingUid && editingUid !== uid) return;
        richText?.focus?.(0);
      });
    });
  }

  private isEditingUid(uid: string): boolean {
    const richText = this.mindMap.richText;
    return richText?.showTextEdit === true && nodeUid(richText.node) === uid;
  }

  private focusExistingEditor(uid: string, generation: number): void {
    if (generation !== this.generation || !this.isEditingUid(uid)) return;
    this.detachListeners();
    cancelFrame(this.frame);
    this.frame = scheduleFrame(() => {
      this.frame = null;
      if (generation !== this.generation || !this.isEditingUid(uid)) return;
      this.mindMap.richText?.focus?.(0);
    });
  }

  private detachListeners(): void {
    if (this.renderListener) {
      this.mindMap.off?.('node_tree_render_end', this.renderListener);
      this.renderListener = null;
    }
    if (this.readyListener) {
      this.mindMap.off?.('yemind_text_edit_ready', this.readyListener);
      this.readyListener = null;
    }
  }
}

export function createInsertedNodeUid(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `node-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
