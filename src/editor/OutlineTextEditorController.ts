import type { MindMapTree } from '../model/types';
import {
  editOutlineSelectionIndent,
  insertOutlineNewline,
  parseOutlineText,
  reconcileOutlineText,
  serializeOutlineText,
  type ReconciledOutlineText,
} from './outlineTextDocument';

export interface OutlineTextEditorControllerOptions {
  textarea: HTMLTextAreaElement;
  status: HTMLElement;
  getTree(): MindMapTree;
  isReadonly(): boolean;
  onApply(tree: MindMapTree, result: ReconciledOutlineText): boolean;
  onDiagnostic?(action: string, details?: Record<string, unknown>): void;
  debounceMs?: number;
}

/**
 * One-document outline editor.
 *
 * Unlike the row-based rich-text outline, this controller deliberately uses a
 * single native textarea. Native selection, clipboard and IME behavior then
 * span any number of nodes. The whole document is reconciled back to the map
 * as one undoable tree transaction.
 */
export class OutlineTextEditorController {
  private readonly debounceMs: number;
  private timer: number | null = null;
  private active = false;
  private dirty = false;
  private applying = false;
  private composing = false;
  private baseTree: MindMapTree;
  private lastAppliedText = '';

  constructor(private readonly options: OutlineTextEditorControllerOptions) {
    this.debounceMs = Math.max(100, options.debounceMs ?? 450);
    this.baseTree = options.getTree();
    this.options.textarea.addEventListener('input', this.onInput);
    this.options.textarea.addEventListener('keydown', this.onKeydown);
    this.options.textarea.addEventListener('blur', this.onBlur);
    this.options.textarea.addEventListener('focus', this.onFocus);
    this.options.textarea.addEventListener('compositionstart', this.onCompositionStart);
    this.options.textarea.addEventListener('compositionend', this.onCompositionEnd);
    this.setReadonly(options.isReadonly());
    this.syncFromTree(this.baseTree, true);
  }

  get isDirty(): boolean {
    return this.dirty;
  }

  get isActive(): boolean {
    return this.active;
  }

  activate(tree: MindMapTree): void {
    this.active = true;
    this.baseTree = tree;
    if (!this.dirty && !this.applying) this.syncFromTree(tree, true);
    this.updateStatus(this.dirty ? '等待同步…' : '自动同步');
  }

  deactivate(reason = 'mode-change'): void {
    this.flush(reason);
    this.active = false;
    this.cancelTimer();
  }

  setReadonly(readonly: boolean): void {
    this.options.textarea.readOnly = readonly;
    this.options.textarea.setAttribute('aria-readonly', String(readonly));
    if (readonly) {
      this.cancelTimer();
      this.updateStatus('只读');
    } else if (this.active) {
      this.updateStatus(this.dirty ? '等待同步…' : '自动同步');
    }
  }

  /** Synchronize canvas/tree changes without destroying an in-progress selection. */
  syncFromTree(tree: MindMapTree, force = false): void {
    this.baseTree = tree;
    if (this.applying) return;
    if (!force && this.dirty) {
      this.updateStatus('当前文本尚未同步');
      return;
    }
    const text = serializeOutlineText(tree);
    if (text !== this.options.textarea.value) {
      const focused = document.activeElement === this.options.textarea;
      const start = this.options.textarea.selectionStart;
      const end = this.options.textarea.selectionEnd;
      this.options.textarea.value = text;
      if (focused) {
        const safeStart = Math.min(start, text.length);
        const safeEnd = Math.min(end, text.length);
        this.options.textarea.setSelectionRange(safeStart, safeEnd);
      }
    }
    this.lastAppliedText = text;
    this.dirty = false;
    if (this.active) this.updateStatus(this.options.isReadonly() ? '只读' : '自动同步');
  }

  flush(reason = 'manual'): boolean {
    this.cancelTimer();
    if (!this.dirty || this.options.isReadonly() || this.composing) return false;
    const value = this.options.textarea.value;
    if (value === this.lastAppliedText) {
      this.dirty = false;
      this.updateStatus('自动同步');
      return false;
    }

    const parsed = parseOutlineText(value);
    const result = reconcileOutlineText(this.baseTree, parsed);
    this.applying = true;
    let applied = false;
    try {
      applied = this.options.onApply(result.tree, result);
    } finally {
      this.applying = false;
    }
    if (!applied) {
      this.updateStatus('同步失败');
      this.options.onDiagnostic?.('text-apply-rejected', { reason, nodeCount: result.nodeCount });
      return false;
    }

    this.baseTree = result.tree;
    this.lastAppliedText = value;
    this.dirty = false;
    const summary = result.implicitRoot
      ? `已同步 · 保留中心主题，导入 ${result.topLevelCount} 个一级条目`
      : `已同步 · ${result.nodeCount} 个节点`;
    this.updateStatus(summary);
    this.options.onDiagnostic?.('text-applied', {
      reason,
      nodeCount: result.nodeCount,
      reusedNodeCount: result.reusedNodeCount,
      createdNodeCount: result.createdNodeCount,
      implicitRoot: result.implicitRoot,
      topLevelCount: result.topLevelCount,
      indentWidth: result.indentWidth,
    });
    return true;
  }

  destroy(): void {
    this.flush('destroy');
    this.cancelTimer();
    this.options.textarea.removeEventListener('input', this.onInput);
    this.options.textarea.removeEventListener('keydown', this.onKeydown);
    this.options.textarea.removeEventListener('blur', this.onBlur);
    this.options.textarea.removeEventListener('focus', this.onFocus);
    this.options.textarea.removeEventListener('compositionstart', this.onCompositionStart);
    this.options.textarea.removeEventListener('compositionend', this.onCompositionEnd);
  }

  private markDirty(reason: string): void {
    if (this.options.isReadonly()) return;
    this.dirty = this.options.textarea.value !== this.lastAppliedText;
    this.updateStatus(this.dirty ? '等待同步…' : '自动同步');
    if (!this.dirty) {
      this.cancelTimer();
      return;
    }
    this.cancelTimer();
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.flush(reason);
    }, this.debounceMs);
  }

  private cancelTimer(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  private updateStatus(text: string): void {
    this.options.status.textContent = text;
    this.options.status.title = text;
  }

  private readonly onInput = (): void => {
    this.markDirty(this.composing ? 'composition-input' : 'input');
  };

  private readonly onCompositionStart = (): void => {
    this.composing = true;
    this.cancelTimer();
    this.updateStatus('正在输入…');
  };

  private readonly onCompositionEnd = (): void => {
    this.composing = false;
    this.markDirty('composition-end');
  };

  private readonly onFocus = (): void => {
    this.options.onDiagnostic?.('text-focus');
  };

  private readonly onBlur = (): void => {
    this.flush('blur');
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (this.options.isReadonly() || this.composing || event.isComposing) return;
    const textarea = this.options.textarea;
    if ((event.ctrlKey || event.metaKey) && (event.key === 'Enter' || event.key.toLowerCase() === 's')) {
      event.preventDefault();
      this.flush(event.key === 'Enter' ? 'shortcut-apply' : 'shortcut-save');
      return;
    }
    if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const edit = editOutlineSelectionIndent(
        textarea.value,
        textarea.selectionStart,
        textarea.selectionEnd,
        event.shiftKey,
      );
      textarea.value = edit.value;
      textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
      this.markDirty(event.shiftKey ? 'outdent' : 'indent');
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const edit = insertOutlineNewline(
        textarea.value,
        textarea.selectionStart,
        textarea.selectionEnd,
      );
      textarea.value = edit.value;
      textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
      this.markDirty('newline');
    }
  };
}
