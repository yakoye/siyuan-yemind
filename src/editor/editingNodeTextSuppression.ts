/** Marks the node whose glyphs the open Quill overlay is currently replacing. */
export const EDITING_NODE_CLASS = 'ymz-node-text-editing';

export interface SuppressionTimers {
  set(callback: () => void, delayMs: number): number;
  clear(handle: number): void;
}

const browserTimers: SuppressionTimers = {
  set: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clear: (handle) => window.clearTimeout(handle),
};

export interface EditingNodeTextSuppressionOptions {
  /** Upper bound on how long the glyphs stay hidden if no render follows. */
  revealFallbackMs?: number;
  timers?: SuppressionTimers;
  schedule?: (callback: () => void) => void;
}

/**
 * While a canvas editor is open, the Quill overlay is the only layer allowed
 * to paint that node's glyphs. The node keeps its shape, fill and border; only
 * its text is suppressed, through a class on the node group and one CSS rule.
 *
 * Two layers painting at once was tolerable while the static text was frozen
 * at the pre-edit content and fully covered by the opaque host. It stopped
 * being tolerable once the node resizes as the user types: the SVG layer then
 * holds a *different revision of the same string* a few pixels from the Quill
 * layer for a large share of frames, which reads as doubled, blurred text.
 *
 * The glyphs are restored only after the committed text has been laid out,
 * which is also what removes the one-frame flash of text at the node's local
 * origin as an editor closes. Upstream's own `hideEditText` keeps the opaque
 * host up until that same `node_tree_render_end`, so the two hand over
 * directly with no gap.
 *
 * The class lives on the node *group*, not on the text element, so it survives
 * the text layer being replaced by a live measurement.
 */
export class EditingNodeTextSuppression {
  private group: SVGElement | null = null;
  private revealTimer: number | null = null;
  private destroyed = false;
  private readonly timers: SuppressionTimers;
  private readonly revealFallbackMs: number;
  private readonly schedule: (callback: () => void) => void;

  private readonly onBeforeShow = (): void => {
    // `before_show_text_edit` is emitted immediately before upstream assigns
    // `richText.node`, so read it once this synchronous chunk has finished.
    // A microtask keeps that within the same frame -- a rendered frame must
    // never show both layers.
    this.schedule(() => this.suppress());
  };

  private readonly onTextEditChange = (): void => {
    this.suppress();
  };

  private readonly onHide = (): void => this.scheduleReveal();

  private readonly onRenderEnd = (): void => {
    if (!this.revealPending) return;
    this.reveal();
  };

  private revealPending = false;

  constructor(private readonly mindMap: any, options: EditingNodeTextSuppressionOptions = {}) {
    this.timers = options.timers ?? browserTimers;
    this.revealFallbackMs = Math.max(0, Number(options.revealFallbackMs ?? 400));
    this.schedule = options.schedule ?? ((callback) => queueMicrotask(callback));
    this.mindMap?.on?.('before_show_text_edit', this.onBeforeShow);
    // Re-asserted on every editor content change: idempotent, and it makes the
    // suppression independent of the exact opening callback order.
    this.mindMap?.on?.('node_text_edit_change', this.onTextEditChange);
    this.mindMap?.on?.('hide_text_edit', this.onHide);
    // Only a safety net: the commit render usually completes synchronously
    // inside `SET_NODE_TEXT`, before `hide_text_edit` is even emitted, so the
    // reveal normally happens directly in `scheduleReveal`.
    this.mindMap?.on?.('node_tree_render_end', this.onRenderEnd);
  }

  suppress(): boolean {
    if (this.destroyed) return false;
    this.revealPending = false;
    const richText = this.mindMap?.richText;
    if (richText?.showTextEdit !== true) return false;
    const group = richText.node?.group?.node as SVGElement | undefined;
    if (!group) return false;
    this.cancelReveal();
    if (this.group && this.group !== group) this.group.classList.remove(EDITING_NODE_CLASS);
    this.group = group;
    group.classList.add(EDITING_NODE_CLASS);
    return true;
  }

  /**
   * The glyphs may come back exactly when the opaque host stops covering them
   * -- no earlier (the node would paint nothing, or paint text at its
   * pre-layout local origin) and no later (the node would paint nothing at
   * all, which is what a ~400ms wait produced: a node visibly flashing empty
   * on close).
   *
   * By the time `hide_text_edit` is emitted, upstream has usually already run
   * its own one-shot `node_tree_render_end` listener and dropped the host,
   * because the commit render completes synchronously inside `SET_NODE_TEXT`.
   * Waiting for a *further* render end therefore waits for something that
   * already happened. So the host's own state is the signal, not the event.
   */
  private scheduleReveal(): void {
    if (!this.group) return;
    this.cancelReveal();
    const host = this.mindMap?.richText?.textEditNode as HTMLElement | null | undefined;
    if (!host || host.style.display === 'none') {
      this.reveal();
      return;
    }
    this.revealPending = true;
    this.revealTimer = this.timers.set(() => {
      this.revealTimer = null;
      this.reveal();
    }, this.revealFallbackMs);
  }

  private reveal(): void {
    this.cancelReveal();
    this.revealPending = false;
    this.group?.classList.remove(EDITING_NODE_CLASS);
    this.group = null;
  }

  private cancelReveal(): void {
    if (this.revealTimer === null) return;
    this.timers.clear(this.revealTimer);
    this.revealTimer = null;
  }

  destroy(): void {
    this.destroyed = true;
    this.cancelReveal();
    this.group?.classList.remove(EDITING_NODE_CLASS);
    this.group = null;
    this.mindMap?.off?.('node_tree_render_end', this.onRenderEnd);
    this.mindMap?.off?.('before_show_text_edit', this.onBeforeShow);
    this.mindMap?.off?.('node_text_edit_change', this.onTextEditChange);
    this.mindMap?.off?.('hide_text_edit', this.onHide);
  }
}
