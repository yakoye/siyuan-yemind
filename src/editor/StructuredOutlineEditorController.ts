import type { MindMapTree } from '../model/types';
import { sanitizeRichHtml } from '../content/sanitizeRichHtml';
import type { CodeBlockSnapshot } from './codeBlock';
import type { RichTextFormattingTarget } from './richTextTarget';
import type { RichTextSelectionRect } from './RichTextToolbar';
import { parseOutlineText, serializeOutlineText } from './outlineTextDocument';
import {
  buildTreeFromStructuredOutline,
  createStructuredOutlineUid,
  flattenStructuredOutline,
  normalizeStructuredOutlineDepths,
  structuredOutlineHtmlToText,
  structuredOutlineIsRichHtml,
  type StructuredOutlineBlock,
} from './structuredOutlineDocument';

export type StructuredOutlineFocusPlacement = 'start' | 'end' | 'select-all' | 'range';

export interface StructuredOutlineFocusRequest {
  placement: StructuredOutlineFocusPlacement;
  start?: number;
  end?: number;
}

export interface StructuredOutlineSelectionState {
  text: string;
  length: number;
  start: number;
  end: number;
}

export interface StructuredOutlineEditorOptions {
  root: HTMLElement;
  getTree(): MindMapTree;
  isReadonly(): boolean;
  onApply(tree: MindMapTree, details: Record<string, unknown>): boolean;
  onActivate(uid: string): void;
  onToggle(uid: string, expanded: boolean): void;
  onUndo(): void;
  onRedo(): void;
  onSelectionChange(
    hasRange: boolean,
    rect: RichTextSelectionRect | null,
    format: Record<string, unknown> | null,
    target: RichTextFormattingTarget,
  ): void;
  onDiagnostic?(action: string, details?: Record<string, unknown>): void;
  debounceMs?: number;
}

interface SelectionPoint {
  uid: string;
  offset: number;
}

interface SelectionContext {
  selection: Selection;
  range: Range;
  start: SelectionPoint;
  end: SelectionPoint;
  startEditor: HTMLElement;
  endEditor: HTMLElement;
  startRow: HTMLElement;
  endRow: HTMLElement;
  collapsed: boolean;
  spansRows: boolean;
}

interface SelectionBookmark {
  anchor: SelectionPoint;
  focus: SelectionPoint;
  whole: boolean;
}

const INDENT_SIZE = 22;
const PLAIN_INDENT = '    ';
const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'SECTION', 'ARTICLE']);

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('\n', '<br>');
}

function textLength(element: HTMLElement): number {
  return (element.innerText || element.textContent || '').replace(/\u00a0/g, ' ').length;
}

function editorIsSemanticallyEmpty(element: HTMLElement): boolean {
  // Chromium represents an emptied editable block as <p><br></p>. innerText
  // exposes that placeholder as a newline even though the user-visible node is
  // empty, so structural editing must inspect actual text content instead.
  return (element.textContent ?? '')
    .replace(/[\u00a0\u200b\ufeff]/g, '')
    .trim().length === 0;
}

function nodeTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue?.length ?? 0;
  if (node instanceof HTMLBRElement) return 1;
  return Array.from(node.childNodes).reduce((sum, child) => sum + nodeTextLength(child), 0);
}

function offsetWithin(root: HTMLElement, node: Node, offset: number): number {
  if (!root.contains(node) && root !== node) return 0;
  const range = document.createRange();
  range.selectNodeContents(root);
  try {
    range.setEnd(node, offset);
  } catch {
    return 0;
  }
  const fragment = range.cloneContents();
  const wrapper = document.createElement('div');
  wrapper.append(fragment);
  return (wrapper.innerText || wrapper.textContent || '').replace(/\u00a0/g, ' ').length;
}

function domPointAtOffset(root: HTMLElement, targetOffset: number): { node: Node; offset: number } {
  let remaining = Math.max(0, targetOffset);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, {
    acceptNode(node) {
      if (node === root) return NodeFilter.FILTER_SKIP;
      if (node instanceof HTMLElement) {
        const blocker = node.closest<HTMLElement>('[contenteditable="false"]');
        if (blocker && root.contains(blocker)) return NodeFilter.FILTER_REJECT;
      }
      if (node.nodeType === Node.TEXT_NODE || node instanceof HTMLBRElement) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    },
  });
  let current: Node | null = walker.nextNode();
  let lastText: Node | null = null;
  while (current) {
    const length = current instanceof HTMLBRElement ? 1 : current.nodeValue?.length ?? 0;
    if (remaining <= length) {
      if (current instanceof HTMLBRElement) {
        const parent = current.parentNode ?? root;
        const index = Array.from(parent.childNodes).indexOf(current);
        return { node: parent, offset: remaining === 0 ? index : index + 1 };
      }
      return { node: current, offset: remaining };
    }
    remaining -= length;
    lastText = current;
    current = walker.nextNode();
  }
  if (lastText?.nodeType === Node.TEXT_NODE) {
    return { node: lastText, offset: lastText.nodeValue?.length ?? 0 };
  }
  return { node: root, offset: root.childNodes.length };
}

function closestRow(node: Node | null): HTMLElement | null {
  const element = node instanceof Element ? node : node?.parentElement;
  return element?.closest<HTMLElement>('[data-outline-uid]') ?? null;
}

function closestEditor(node: Node | null): HTMLElement | null {
  const element = node instanceof Element ? node : node?.parentElement;
  return element?.closest<HTMLElement>('[data-outline-editor]') ?? null;
}

function inlineHtmlFromClipboard(value: string): string {
  const template = document.createElement('template');
  template.innerHTML = sanitizeRichHtml(value);
  template.content.querySelectorAll(BLOCK_TAGS.size ? Array.from(BLOCK_TAGS).join(',').toLowerCase() : 'div').forEach((block) => {
    const fragment = document.createDocumentFragment();
    while (block.firstChild) fragment.append(block.firstChild);
    if (block.nextSibling) fragment.append(document.createElement('br'));
    block.replaceWith(fragment);
  });
  return template.innerHTML;
}

function stripLeadingClipboardIndent(value: string): string {
  const template = document.createElement('template');
  template.innerHTML = sanitizeRichHtml(value);
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const current = node.nodeValue ?? '';
    if (current.length > 0) {
      node.nodeValue = current.replace(/^[\t \u00a0\u3000]+/, '');
      break;
    }
    node = walker.nextNode();
  }
  return template.innerHTML;
}

function clipboardRichLines(value: string, expectedCount: number): string[] | null {
  if (!value || expectedCount <= 0) return null;
  const template = document.createElement('template');
  template.innerHTML = sanitizeRichHtml(value);
  const topLevel = Array.from(template.content.childNodes);
  const blockNodes = topLevel.filter((node): node is HTMLElement =>
    node instanceof HTMLElement && ['DIV', 'P', 'LI', 'SECTION', 'ARTICLE'].includes(node.tagName),
  );
  let lines: string[] = [];
  if (blockNodes.length === expectedCount && topLevel.every((node) =>
    node.nodeType === Node.TEXT_NODE ? !(node.nodeValue ?? '').trim() : blockNodes.includes(node as HTMLElement),
  )) {
    lines = blockNodes.map((node) => stripLeadingClipboardIndent(node.innerHTML));
  } else if (expectedCount === 1) {
    lines = [stripLeadingClipboardIndent(template.innerHTML)];
  } else {
    const normalized = template.innerHTML
      .replace(/<\/(?:div|p|li|section|article)>\s*/gi, '<br>')
      .replace(/<(?:div|p|li|section|article)\b[^>]*>/gi, '');
    lines = normalized.split(/<br\s*\/?\s*>/i).map(stripLeadingClipboardIndent);
    while (lines.length && !structuredOutlineHtmlToText(lines[lines.length - 1])) lines.pop();
  }
  return lines.length === expectedCount ? lines.map((line) => sanitizeRichHtml(line)) : null;
}

function rangeHtml(editor: HTMLElement, startOffset: number, endOffset: number): string {
  const start = domPointAtOffset(editor, Math.max(0, startOffset));
  const end = domPointAtOffset(editor, Math.max(startOffset, endOffset));
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  const wrapper = document.createElement('div');
  wrapper.append(range.cloneContents());
  return sanitizeRichHtml(wrapper.innerHTML);
}

function selectionRect(range: Range): RichTextSelectionRect | null {
  const rect = range.getBoundingClientRect();
  if (!rect || (!rect.width && !rect.height)) return null;
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
  };
}

function commandState(name: string): boolean {
  try {
    return Boolean(document.queryCommandState(name));
  } catch {
    return false;
  }
}

function commandValue(name: string): string {
  try {
    return String(document.queryCommandValue(name) ?? '');
  } catch {
    return '';
  }
}

function blockKey(block: StructuredOutlineBlock): string {
  return `${block.kind}:${block.uid}`;
}

function richHtmlForText(value: string): string {
  return escapeHtml(value);
}

function isImageClipboard(data: DataTransfer | null): boolean {
  return Array.from(data?.items ?? []).some((item) => item.kind === 'file' && item.type.startsWith('image/'));
}

/**
 * One structured outline editing surface.
 *
 * Every row remains a semantic node block, while all row labels inherit one
 * contenteditable root. Native browser selection can therefore cross any
 * number of nodes without introducing a second textarea representation.
 */
export class StructuredOutlineEditorController implements RichTextFormattingTarget {
  private readonly debounceMs: number;
  private timer: number | null = null;
  private dirty = false;
  private applying = false;
  private composing = false;
  private pointerSelecting = false;
  private wholeOutlineSelected = false;
  private wholeSelectionRange: Range | null = null;
  private forcePlainPaste = false;
  private savedRange: Range | null = null;
  private activeUid = '';
  private activeEditor: HTMLElement | null = null;
  private lastTree: MindMapTree;
  private lastAppliedSignature = '';
  private suppressSelectionChange = false;
  private readonly guideLayer: HTMLElement;
  private readonly guideResizeObserver: ResizeObserver | null;
  private guideFrame: number | null = null;
  private readonly onViewportResize = (): void => this.scheduleGuideRender();

  constructor(private readonly options: StructuredOutlineEditorOptions) {
    this.debounceMs = Math.max(120, options.debounceMs ?? 380);
    this.lastTree = options.getTree();
    this.options.root.classList.add('ymz-structured-outline');
    this.options.root.setAttribute('role', 'tree');
    this.options.root.setAttribute('spellcheck', 'false');
    this.options.root.setAttribute('aria-label', '结构化大纲编辑器');
    this.options.root.tabIndex = 0;
    this.guideLayer = document.createElement('div');
    this.guideLayer.className = 'ymz-outline-guides';
    this.guideLayer.dataset.outlineGuides = '';
    this.guideLayer.contentEditable = 'false';
    this.guideLayer.setAttribute('aria-hidden', 'true');
    this.options.root.append(this.guideLayer);
    this.guideResizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => this.scheduleGuideRender())
      : null;
    this.guideResizeObserver?.observe(this.options.root);
    window.addEventListener('resize', this.onViewportResize);
    this.bind();
    this.setReadonly(options.isReadonly());
    this.syncFromTree(this.lastTree, true);
  }

  get activeHost(): HTMLElement | null {
    return this.activeEditor;
  }

  get isComposing(): boolean {
    return this.composing;
  }

  get isDirty(): boolean {
    return this.dirty;
  }

  setReadonly(readonly: boolean): void {
    this.options.root.contentEditable = String(!readonly);
    this.options.root.setAttribute('aria-readonly', String(readonly));
    this.options.root.querySelectorAll<HTMLElement>('[data-outline-editor]').forEach((editor) => {
      if (readonly) editor.setAttribute('aria-readonly', 'true');
      else editor.removeAttribute('aria-readonly');
    });
    if (readonly) this.cancelTimer();
  }

  syncFromTree(tree: MindMapTree, force = false): void {
    this.lastTree = tree;
    if (this.applying) return;
    if (!force && this.dirty && this.options.root.contains(document.activeElement)) return;
    const bookmark = this.captureSelectionBookmark();
    const blocks = flattenStructuredOutline(tree);
    this.patchBlocks(blocks, bookmark);
    this.scheduleGuideRender();
    this.lastAppliedSignature = this.domSignature();
    this.dirty = false;
  }

  activate(host: HTMLElement, uid: string, request?: StructuredOutlineFocusRequest): void {
    this.activeEditor = host;
    this.activeUid = uid;
    this.activateUid(uid, false);
    if (this.options.isReadonly()) return;
    this.options.root.focus({ preventScroll: true });
    const length = textLength(host);
    let start = length;
    let end = length;
    if (request?.placement === 'start') start = end = 0;
    else if (request?.placement === 'select-all') {
      start = 0;
      end = length;
    } else if (request?.placement === 'range') {
      start = Math.max(0, Math.min(length, request.start ?? 0));
      end = Math.max(start, Math.min(length, request.end ?? start));
    }
    this.selectEditorRange(host, start, end);
    host.scrollIntoView?.({ block: 'nearest' });
  }

  activateUid(uid: string, scroll = false, adoptEditor = true): void {
    this.activeUid = uid;
    this.options.root.querySelectorAll<HTMLElement>('[data-outline-uid]').forEach((row) => {
      row.classList.toggle('is-active', Boolean(uid) && row.dataset.outlineUid === uid);
    });
    const row = this.rowByUid(uid);
    if (adoptEditor) {
      this.activeEditor = row?.querySelector<HTMLElement>('[data-outline-editor]') ?? null;
    }
    if (scroll && row) this.revealRow(row);
  }

  /**
   * Mirrors a canvas selection into the outline without retaining a stale DOM
   * selection. Otherwise a later document selectionchange can reactivate the
   * previously edited outline row and override the node the user just clicked.
   */
  syncActiveUid(uid: string, scroll = false): void {
    this.suppressSelectionChange = true;
    try {
      const selection = window.getSelection();
      if (selection?.anchorNode && this.options.root.contains(selection.anchorNode)) {
        selection.removeAllRanges();
      }
    } finally {
      this.suppressSelectionChange = false;
    }
    this.activeEditor = null;
    this.activateUid(uid, scroll, false);
  }

  getSelectionState(host = this.activeEditor): StructuredOutlineSelectionState {
    if (!host) return { text: '', length: 0, start: 0, end: 0 };
    const text = (host.innerText || host.textContent || '').replace(/\u00a0/g, ' ');
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { text, length: text.length, start: 0, end: 0 };
    const range = selection.getRangeAt(0);
    if (!host.contains(range.startContainer) || !host.contains(range.endContainer)) {
      return { text, length: text.length, start: 0, end: 0 };
    }
    return {
      text,
      length: text.length,
      start: offsetWithin(host, range.startContainer, range.startOffset),
      end: offsetWithin(host, range.endContainer, range.endOffset),
    };
  }

  flush(reason = 'manual'): boolean {
    this.cancelTimer();
    if (!this.dirty || this.options.isReadonly() || this.composing) return false;
    const bookmark = this.captureSelectionBookmark();
    const blocks = this.collectBlocks();
    const result = buildTreeFromStructuredOutline(this.lastTree, blocks);
    this.applying = true;
    let applied = false;
    let failure: unknown = null;
    try {
      applied = this.options.onApply(result.tree, {
        reason,
        nodeCount: result.nodeCount,
        reusedNodeCount: result.reusedNodeCount,
        createdNodeCount: result.createdNodeCount,
      });
    } catch (error) {
      failure = error;
    } finally {
      this.applying = false;
    }
    if (!applied) {
      // A structured edit is atomic: if the map transaction rejects or throws,
      // restore the last committed projection instead of leaving a half-applied
      // outline document on screen.
      this.dirty = false;
      this.clearWholeSelection();
      this.patchBlocks(flattenStructuredOutline(this.lastTree), bookmark);
      this.lastAppliedSignature = this.domSignature();
      this.options.onDiagnostic?.('apply-rejected', {
        reason,
        nodeCount: result.nodeCount,
        error: failure instanceof Error ? failure.message : failure ? String(failure) : '',
      });
      return false;
    }
    this.lastTree = result.tree;
    this.lastAppliedSignature = this.domSignature();
    this.dirty = false;
    this.options.onDiagnostic?.('applied', {
      reason,
      nodeCount: result.nodeCount,
      reusedNodeCount: result.reusedNodeCount,
      createdNodeCount: result.createdNodeCount,
    });
    return true;
  }

  commitAndDetach(reason = 'surface-change'): void {
    this.flush(reason);
  }

  discardAndDetach(_reason = 'discard'): void {
    this.cancelTimer();
    this.dirty = false;
    this.syncFromTree(this.options.getTree(), true);
  }

  cancel(): void {
    this.cancelTimer();
    this.dirty = false;
    this.syncFromTree(this.lastTree, true);
  }

  destroy(): void {
    this.flush('destroy');
    this.cancelTimer();
    if (this.guideFrame !== null) window.cancelAnimationFrame(this.guideFrame);
    this.guideFrame = null;
    this.guideResizeObserver?.disconnect();
    window.removeEventListener('resize', this.onViewportResize);
    this.guideLayer.remove();
    this.unbind();
    this.options.onSelectionChange(false, null, null, this);
  }

  restoreSelection(): void {
    if (!this.savedRange) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(this.savedRange.cloneRange());
  }

  getSelectedText(): string {
    const selection = window.getSelection();
    return selection && this.options.root.contains(selection.anchorNode)
      ? selection.toString()
      : '';
  }

  getSelectedInlineLink(): string {
    const range = this.currentRange();
    const element = range ? closestElement(range.commonAncestorContainer) : null;
    return element?.closest<HTMLAnchorElement>('a[href]')?.getAttribute('href') ?? '';
  }

  setInlineLink(link: string | null): void {
    this.restoreSelection();
    if (!this.currentRange() || this.options.isReadonly()) return;
    if (link) document.execCommand('createLink', false, link);
    else document.execCommand('unlink');
    this.afterFormatting('link');
  }

  toggleInlineCode(): void {
    this.restoreSelection();
    const range = this.currentRange();
    if (!range || range.collapsed || this.options.isReadonly()) return;
    const element = closestElement(range.commonAncestorContainer)?.closest('code');
    if (element) {
      const parent = element.parentNode;
      while (element.firstChild) parent?.insertBefore(element.firstChild, element);
      element.remove();
    } else {
      this.wrapSelection('code');
    }
    this.afterFormatting('inline-code');
  }

  getCodeBlock(): CodeBlockSnapshot | null {
    const range = this.currentRange();
    const pre = range ? closestElement(range.commonAncestorContainer)?.closest<HTMLPreElement>('pre') : null;
    if (!pre) return null;
    const editor = pre.closest<HTMLElement>('[data-outline-editor]');
    if (!editor) return null;
    const index = offsetWithin(editor, pre, 0);
    return {
      index,
      length: pre.textContent?.length ?? 0,
      code: pre.textContent ?? '',
      language: pre.dataset.language || 'plain',
    };
  }

  saveCodeBlock(code: string, language = 'plain'): void {
    this.restoreSelection();
    const range = this.currentRange();
    if (!range || this.options.isReadonly()) return;
    const existing = closestElement(range.commonAncestorContainer)?.closest<HTMLPreElement>('pre');
    const pre = existing ?? document.createElement('pre');
    pre.dataset.language = language || 'plain';
    pre.textContent = code.replace(/\r\n?/g, '\n');
    if (!existing) {
      range.deleteContents();
      range.insertNode(pre);
    }
    this.placeCaretAfter(pre);
    this.afterFormatting('code-block-save');
  }

  removeCodeBlockFormat(): void {
    this.restoreSelection();
    const range = this.currentRange();
    const pre = range ? closestElement(range.commonAncestorContainer)?.closest<HTMLPreElement>('pre') : null;
    if (!pre || this.options.isReadonly()) return;
    const fragment = document.createDocumentFragment();
    const lines = (pre.textContent ?? '').split('\n');
    lines.forEach((line, index) => {
      if (index) fragment.append(document.createElement('br'));
      fragment.append(document.createTextNode(line));
    });
    pre.replaceWith(fragment);
    this.afterFormatting('code-block-remove-format');
  }

  deleteCodeBlock(): void {
    this.restoreSelection();
    const range = this.currentRange();
    const pre = range ? closestElement(range.commonAncestorContainer)?.closest<HTMLPreElement>('pre') : null;
    if (!pre || this.options.isReadonly()) return;
    const editor = pre.closest<HTMLElement>('[data-outline-editor]');
    pre.remove();
    if (editor) this.selectEditorRange(editor, Math.min(textLength(editor), 0), Math.min(textLength(editor), 0));
    this.afterFormatting('code-block-delete');
  }

  insertFormula(formula: string, mode: 'inline' | 'block' = 'inline'): void {
    this.restoreSelection();
    const range = this.currentRange();
    if (!range || this.options.isReadonly()) return;
    range.deleteContents();
    const span = document.createElement(mode === 'block' ? 'div' : 'span');
    span.className = 'ql-formula';
    span.dataset.value = mode === 'block' ? `\\displaystyle{${formula}}` : formula;
    span.setAttribute('contenteditable', 'false');
    span.textContent = formula;
    range.insertNode(span);
    this.placeCaretAfter(span);
    this.afterFormatting('formula');
  }

  formatText(config: Record<string, unknown>): void {
    this.restoreSelection();
    if (this.options.isReadonly() || !this.currentRange() || this.currentRange()?.collapsed) return;
    Object.entries(config).forEach(([key, value]) => {
      if (['bold', 'italic', 'underline', 'strike'].includes(key)) {
        const command = key === 'strike' ? 'strikeThrough' : key;
        document.execCommand(command, false, value === false ? undefined : undefined);
        return;
      }
      if (key === 'color') {
        document.execCommand('foreColor', false, value === false ? 'inherit' : String(value));
        return;
      }
      if (key === 'background') {
        document.execCommand('hiliteColor', false, value === false ? 'transparent' : String(value));
        return;
      }
      if (key === 'font') {
        this.applyInlineStyle({ fontFamily: value === false ? 'inherit' : String(value) });
        return;
      }
      if (key === 'size') {
        this.applyInlineStyle({ fontSize: value === false ? 'inherit' : String(value) });
      }
    });
    this.afterFormatting('format');
  }

  clearTextFormat(): void {
    this.restoreSelection();
    if (this.options.isReadonly() || !this.currentRange()) return;
    document.execCommand('removeFormat');
    document.execCommand('unlink');
    this.afterFormatting('clear-format');
  }

  setCloze(enabled: boolean): void {
    this.formatText(enabled
      ? { color: 'transparent', background: '#f5dfa0' }
      : { color: false, background: false });
  }

  private bind(): void {
    const root = this.options.root;
    root.addEventListener('input', this.onInput);
    root.addEventListener('keydown', this.onKeyDown, true);
    root.addEventListener('keyup', this.onKeyUp);
    root.addEventListener('paste', this.onPaste, true);
    root.addEventListener('copy', this.onCopy, true);
    root.addEventListener('cut', this.onCut, true);
    root.addEventListener('pointerdown', this.onPointerDown);
    root.addEventListener('pointerup', this.onPointerUp);
    root.addEventListener('focusin', this.onFocusIn);
    root.addEventListener('click', this.onClick);
    root.addEventListener('blur', this.onBlur, true);
    root.addEventListener('compositionstart', this.onCompositionStart);
    root.addEventListener('compositionend', this.onCompositionEnd);
    document.addEventListener('selectionchange', this.onDocumentSelectionChange);
  }

  private unbind(): void {
    const root = this.options.root;
    root.removeEventListener('input', this.onInput);
    root.removeEventListener('keydown', this.onKeyDown, true);
    root.removeEventListener('keyup', this.onKeyUp);
    root.removeEventListener('paste', this.onPaste, true);
    root.removeEventListener('copy', this.onCopy, true);
    root.removeEventListener('cut', this.onCut, true);
    root.removeEventListener('pointerdown', this.onPointerDown);
    root.removeEventListener('pointerup', this.onPointerUp);
    root.removeEventListener('focusin', this.onFocusIn);
    root.removeEventListener('click', this.onClick);
    root.removeEventListener('blur', this.onBlur, true);
    root.removeEventListener('compositionstart', this.onCompositionStart);
    root.removeEventListener('compositionend', this.onCompositionEnd);
    document.removeEventListener('selectionchange', this.onDocumentSelectionChange);
  }

  private readonly onInput = (): void => {
    if (this.applying) return;
    this.clearWholeSelection();
    this.scheduleGuideRender();
    this.markDirty(this.composing ? 'composition-input' : 'input');
  };

  private readonly onCompositionStart = (): void => {
    this.composing = true;
    this.cancelTimer();
  };

  private readonly onCompositionEnd = (): void => {
    this.composing = false;
    this.markDirty('composition-end');
  };

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-outline-uid]');
    if (!row) return;
    const uid = row.dataset.outlineUid ?? '';
    const toggle = target.closest<HTMLElement>('[data-outline-toggle]');
    if (toggle && row.dataset.outlineHasChildren === 'true') {
      event.preventDefault();
      event.stopPropagation();
      this.options.onToggle(uid, row.dataset.outlineExpanded !== 'true');
      return;
    }
    if (target.closest('[data-outline-drag-handle]')) return;
    this.activateUid(uid, false);
    if (!this.options.isReadonly()) this.options.onActivate(uid);
  };

  private readonly onFocusIn = (event: FocusEvent): void => {
    const editor = closestEditor(event.target as Node);
    const row = editor?.closest<HTMLElement>('[data-outline-uid]');
    if (!editor || !row) return;
    const uid = row.dataset.outlineUid ?? '';
    this.activeEditor = editor;
    this.activateUid(uid, false);
    if (!this.options.isReadonly()) this.options.onActivate(uid);
  };

  private readonly onBlur = (): void => {
    window.setTimeout(() => {
      if (!this.options.root.contains(document.activeElement)) this.flush('blur');
    }, 0);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.clearWholeSelection();
    this.pointerSelecting = Boolean((event.target as Element | null)?.closest('[data-outline-editor]'));
    if (this.pointerSelecting && this.options.isReadonly()) this.options.root.focus({ preventScroll: true });
    this.options.onSelectionChange(false, null, null, this);
  };

  private readonly onPointerUp = (): void => {
    this.pointerSelecting = false;
    window.setTimeout(() => this.publishSelection(), 0);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Shift' || event.shiftKey || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      window.setTimeout(() => this.publishSelection(), 0);
    }
  };

  private readonly onDocumentSelectionChange = (): void => {
    if (this.suppressSelectionChange) return;
    const selection = window.getSelection();
    if (!selection || !this.options.root.contains(selection.anchorNode)) {
      this.clearWholeSelection();
      return;
    }
    const currentRange = selection.rangeCount ? selection.getRangeAt(0) : null;
    if (this.wholeOutlineSelected && (!currentRange || !this.matchesWholeSelection(currentRange))) {
      this.clearWholeSelection();
    }
    const editor = closestEditor(selection.focusNode);
    const row = editor?.closest<HTMLElement>('[data-outline-uid]');
    const uid = row?.dataset.outlineUid ?? '';
    if (uid && uid !== this.activeUid) {
      this.activeEditor = editor;
      this.activateUid(uid, false);
      if (!this.options.isReadonly()) this.options.onActivate(uid);
    }
    if (selection.isCollapsed) {
      this.clearWholeSelection();
      this.options.onSelectionChange(false, null, null, this);
    } else if (!this.pointerSelecting) {
      this.savedRange = currentRange?.cloneRange() ?? null;
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.isComposing || this.composing) return;
    const command = event.ctrlKey || event.metaKey;
    if (command && !event.altKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      event.stopPropagation();
      this.handleSelectAll();
      return;
    }
    if (command && event.shiftKey && event.key.toLowerCase() === 'v') {
      if (!this.options.isReadonly()) {
        this.forcePlainPaste = true;
        window.setTimeout(() => { this.forcePlainPaste = false; }, 0);
      }
      return;
    }
    if (this.options.isReadonly()) return;
    if (command && !event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      event.stopPropagation();
      this.flush('shortcut-save');
      return;
    }
    if (command && !event.altKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.stopPropagation();
      this.flush('before-undo');
      if (event.shiftKey) this.options.onRedo();
      else this.options.onUndo();
      return;
    }
    if (command && !event.altKey && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      event.stopPropagation();
      this.flush('before-redo');
      this.options.onRedo();
      return;
    }
    if (event.key === 'Tab' && !command && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      this.adjustSelectedDepth(event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === 'Enter' && !command && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) {
        this.insertInlineHtml('<br>');
        this.markDirty('hard-break');
        this.flush('hard-break');
      } else {
        this.splitSelectionToSibling();
      }
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.stopPropagation();
      const context = this.selectionContext();
      if (!context) return;
      if (!context.collapsed || context.spansRows) {
        event.preventDefault();
        this.replaceSelectionWithText('', event.key.toLowerCase());
        return;
      }
      const state = this.getSelectionState(context.startEditor);
      const boundary = event.key === 'Backspace' ? state.start === 0 : state.end === state.length;
      if (boundary && context.startRow.dataset.outlineRoot !== 'true') {
        event.preventDefault();
        if (editorIsSemanticallyEmpty(context.startEditor)) {
          const emptyRow = context.startRow;
          const backward = event.key === 'Backspace';
          // Removing the event target synchronously during keydown lets some
          // Chromium builds continue the native Backspace operation against
          // the previous block, producing an unwanted <p><br></p>. Complete
          // the cancelled key event first, then commit the structural delete.
          window.requestAnimationFrame(() => this.removeEmptyRow(emptyRow, backward));
          return;
        }
        const neighbor = this.visibleNeighbor(context.startRow, event.key === 'Backspace' ? -1 : 1);
        if (neighbor) this.mergeRows(neighbor, context.startRow, event.key === 'Backspace');
      }
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const context = this.selectionContext();
      if (!context || !context.collapsed) return;
      const state = this.getSelectionState(context.startEditor);
      const hasChildren = context.startRow.dataset.outlineHasChildren === 'true';
      const expanded = context.startRow.dataset.outlineExpanded === 'true';
      if (event.key === 'ArrowLeft' && state.start === 0 && hasChildren && expanded) {
        event.preventDefault();
        this.options.onToggle(context.start.uid, false);
      }
      if (event.key === 'ArrowRight' && state.end === state.length && hasChildren && !expanded) {
        event.preventDefault();
        this.options.onToggle(context.start.uid, true);
      }
    }
  };

  private readonly onCopy = (event: ClipboardEvent): void => {
    if (!event.clipboardData) return;
    const context = this.selectionContext();
    const whole = this.isWholeSelectionActive(context?.range ?? null);
    if (!context && !whole) return;
    event.preventDefault();
    const plain = whole
      ? serializeOutlineText(this.options.getTree())
      : this.selectedStructuredPlainText(context!);
    event.clipboardData.setData('text/plain', plain);
    event.clipboardData.setData('text/html', this.selectedStructuredHtml(context, plain, whole));
    this.options.onDiagnostic?.('copy', {
      whole,
      textLength: plain.length,
    });
  };

  private readonly onCut = (event: ClipboardEvent): void => {
    if (this.options.isReadonly()) {
      this.onCopy(event);
      return;
    }
    this.onCopy(event);
    if (event.defaultPrevented) this.replaceSelectionWithText('', 'cut');
  };

  private readonly onPaste = (event: ClipboardEvent): void => {
    if (this.options.isReadonly() || !event.clipboardData || isImageClipboard(event.clipboardData)) return;
    const text = event.clipboardData.getData('text/plain');
    const html = this.forcePlainPaste ? '' : event.clipboardData.getData('text/html');
    if (!text && !html) return;
    event.preventDefault();
    event.stopPropagation();
    const context = this.selectionContext();
    const whole = this.isWholeSelectionActive(context?.range ?? null);
    const multiline = /\r|\n/.test(text);
    if (!whole && context && !context.spansRows && !multiline) {
      this.insertInlineHtml(html ? inlineHtmlFromClipboard(html) : escapeHtml(text));
      this.markDirty('paste-inline');
      this.placeSelectionToolbarLater();
      return;
    }
    const parsed = parseOutlineText(text);
    const richLines = html ? clipboardRichLines(html, parsed.lines.length) : null;
    this.replaceSelectionWithText(text, 'paste', richLines ?? undefined);
  };

  private markDirty(reason: string): void {
    if (this.options.isReadonly()) return;
    this.dirty = this.domSignature() !== this.lastAppliedSignature;
    this.cancelTimer();
    if (!this.dirty || this.composing) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.flush(reason);
    }, this.debounceMs);
  }

  private cancelTimer(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  private patchBlocks(blocks: StructuredOutlineBlock[], bookmark: SelectionBookmark | null): void {
    const root = this.options.root;
    const existing = new Map<string, HTMLElement>();
    root.querySelectorAll<HTMLElement>(':scope > [data-outline-uid]').forEach((row) => {
      existing.set(`${row.dataset.outlineKind ?? 'node'}:${row.dataset.outlineUid ?? ''}`, row);
    });
    const desired: HTMLElement[] = [];
    const selectionUids = new Set([bookmark?.anchor.uid, bookmark?.focus.uid].filter(Boolean) as string[]);
    blocks.forEach((block) => {
      const key = blockKey(block);
      let row = existing.get(key);
      if (!row) row = this.createRow(block);
      else this.patchRow(row, block, selectionUids.has(block.uid));
      desired.push(row);
      existing.delete(key);
    });
    existing.forEach((row) => row.remove());
    let cursor = root.firstElementChild;
    desired.forEach((row) => {
      if (row === cursor) {
        cursor = cursor.nextElementSibling;
        return;
      }
      root.insertBefore(row, cursor);
    });
    root.append(this.guideLayer);
    this.guideResizeObserver?.disconnect();
    this.guideResizeObserver?.observe(root);
    desired.forEach((row) => this.guideResizeObserver?.observe(row));
    this.scheduleGuideRender();
    if (bookmark) this.restoreSelectionBookmark(bookmark);
  }

  private scheduleGuideRender(): void {
    if (this.guideFrame !== null) return;
    this.guideFrame = window.requestAnimationFrame(() => {
      this.guideFrame = null;
      this.renderGuides();
    });
  }

  private renderGuides(): void {
    const root = this.options.root;
    if (!root.isConnected || root.clientWidth <= 0 || root.clientHeight <= 0) {
      this.guideLayer.replaceChildren();
      return;
    }
    const rows = Array.from(root.querySelectorAll<HTMLElement>(':scope > [data-outline-uid]'))
      .filter((row) => row.dataset.outlineHidden !== 'true' && getComputedStyle(row).display !== 'none');
    const rootRect = root.getBoundingClientRect();
    const fragment = document.createDocumentFragment();
    const depthOf = (row: HTMLElement): number => Math.max(0, Number.parseInt(row.style.getPropertyValue('--ymz-outline-depth') || '0', 10) || 0);
    const markerOf = (row: HTMLElement): HTMLElement | null =>
      row.querySelector<HTMLElement>('.ymz-outline-row__triangle,.ymz-outline-row__leaf-square')
      ?? row.querySelector<HTMLElement>('.ymz-outline-row__branch');

    rows.forEach((row, index) => {
      if (row.dataset.outlineHasChildren !== 'true' || row.dataset.outlineExpanded !== 'true') return;
      const depth = depthOf(row);
      let lastDescendant: HTMLElement | null = null;
      for (let cursor = index + 1; cursor < rows.length; cursor += 1) {
        const candidate = rows[cursor];
        if (depthOf(candidate) <= depth) break;
        lastDescendant = candidate;
      }
      if (!lastDescendant) return;
      const marker = markerOf(row);
      const lastMarker = markerOf(lastDescendant);
      if (!marker || !lastMarker) return;
      const markerRect = marker.getBoundingClientRect();
      const lastRect = lastMarker.getBoundingClientRect();
      const x = Math.round(markerRect.left + markerRect.width / 2 - rootRect.left + root.scrollLeft);
      const top = Math.round(markerRect.bottom - rootRect.top + root.scrollTop);
      const end = Math.round(lastRect.top + lastRect.height / 2 - rootRect.top + root.scrollTop);
      const height = Math.max(0, end - top);
      if (height <= 0) return;
      const line = document.createElement('span');
      line.className = 'ymz-outline-guide';
      line.dataset.outlineGuideParent = row.dataset.outlineUid ?? '';
      line.style.left = `${x}px`;
      line.style.top = `${top}px`;
      line.style.height = `${height}px`;
      line.style.setProperty('--ymz-outline-guide-color', `var(--ymz-outline-guide-${(depth % 4) + 1})`);
      fragment.append(line);
    });
    this.guideLayer.replaceChildren(fragment);
  }

  private revealRow(row: HTMLElement): void {
    const root = this.options.root;
    const rootRect = root.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const margin = Math.min(32, Math.max(12, root.clientHeight * 0.08));
    const visibleTop = rootRect.top + margin;
    const visibleBottom = rootRect.bottom - margin;
    if (rowRect.top >= visibleTop && rowRect.bottom <= visibleBottom) return;
    const target = row.offsetTop - Math.max(0, (root.clientHeight - row.offsetHeight) / 2);
    root.scrollTop = Math.max(0, target);
  }

  private createRow(block: StructuredOutlineBlock): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.rowHtml(block);
    return wrapper.firstElementChild as HTMLElement;
  }

  private rowHtml(block: StructuredOutlineBlock): string {
    const leaf = !block.hasChildren;
    const marker = block.hasChildren
      ? `<button type="button" class="ymz-outline-row__branch" data-outline-toggle contenteditable="false" tabindex="-1" aria-label="${block.expanded ? '折叠' : '展开'}"><span class="ymz-outline-row__triangle" data-direction="${block.expanded ? 'down' : 'right'}"></span></button>`
      : `<span class="ymz-outline-row__branch ymz-outline-row__branch--placeholder" contenteditable="false" aria-hidden="true"><span class="ymz-outline-row__leaf-square"></span></span>`;
    return `<div class="ymz-outline-row" role="treeitem" aria-level="${block.depth + 1}" aria-expanded="${block.hasChildren ? block.expanded : 'false'}" data-outline-uid="${escapeHtml(block.uid)}" data-outline-kind="${block.kind}" data-outline-parent-uid="${escapeHtml(block.parentUid ?? '')}" data-outline-root="${block.isRoot}" data-outline-hidden="${block.hidden}" data-outline-leaf="${leaf}" data-outline-has-children="${block.hasChildren}" data-outline-expanded="${block.expanded}" data-outline-drag-source="${!block.isRoot && block.kind === 'node'}" style="--ymz-outline-depth:${block.depth}"><span class="ymz-outline-row__drag" data-outline-drag-handle contenteditable="false" aria-hidden="true"></span><span class="ymz-outline-row__drop-indicator" contenteditable="false" aria-hidden="true"></span>${marker}<div class="ymz-outline-row__editor" data-outline-editor data-placeholder="空节点" data-outline-pristine="${block.pristine}" data-outline-rich-text="${structuredOutlineIsRichHtml(block.html)}">${block.html}</div></div>`;
  }

  private patchRow(row: HTMLElement, block: StructuredOutlineBlock, selectionProtected: boolean): void {
    row.setAttribute('aria-level', String(block.depth + 1));
    row.setAttribute('aria-expanded', block.hasChildren ? String(block.expanded) : 'false');
    row.dataset.outlineParentUid = block.parentUid ?? '';
    row.dataset.outlineRoot = String(block.isRoot);
    row.dataset.outlineHidden = String(block.hidden);
    row.dataset.outlineLeaf = String(!block.hasChildren);
    row.dataset.outlineHasChildren = String(block.hasChildren);
    row.dataset.outlineExpanded = String(block.expanded);
    row.dataset.outlineDragSource = String(!block.isRoot && block.kind === 'node');
    row.style.setProperty('--ymz-outline-depth', String(block.depth));
    let marker = row.querySelector<HTMLElement>('.ymz-outline-row__branch');
    if (block.hasChildren) {
      if (!(marker instanceof HTMLButtonElement)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ymz-outline-row__branch';
        button.dataset.outlineToggle = '';
        button.contentEditable = 'false';
        button.tabIndex = -1;
        marker?.replaceWith(button);
        marker = button;
      }
      marker.setAttribute('aria-label', block.expanded ? '折叠' : '展开');
      marker.innerHTML = `<span class="ymz-outline-row__triangle" data-direction="${block.expanded ? 'down' : 'right'}"></span>`;
    } else if (marker instanceof HTMLButtonElement) {
      const placeholder = document.createElement('span');
      placeholder.className = 'ymz-outline-row__branch ymz-outline-row__branch--placeholder';
      placeholder.contentEditable = 'false';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.innerHTML = '<span class="ymz-outline-row__leaf-square"></span>';
      marker.replaceWith(placeholder);
    }
    const editor = row.querySelector<HTMLElement>('[data-outline-editor]');
    if (editor) {
      editor.dataset.outlinePristine = String(block.pristine);
      editor.dataset.outlineRichText = String(structuredOutlineIsRichHtml(block.html));
      if (this.options.isReadonly()) editor.setAttribute('aria-readonly', 'true');
      else editor.removeAttribute('aria-readonly');
      if (!selectionProtected && !this.dirty && editor.innerHTML !== block.html) editor.innerHTML = block.html;
    }
  }

  private collectBlocks(): StructuredOutlineBlock[] {
    const rows = Array.from(this.options.root.querySelectorAll<HTMLElement>(':scope > [data-outline-uid]'));
    const existing = new Map(flattenStructuredOutline(this.lastTree).map((block) => [blockKey(block), block]));
    return rows.map((row, index) => {
      const uid = row.dataset.outlineUid || createStructuredOutlineUid();
      const kind = row.dataset.outlineKind === 'summary' ? 'summary' : 'node';
      const editor = row.querySelector<HTMLElement>('[data-outline-editor]');
      const html = sanitizeRichHtml(editor?.innerHTML ?? '');
      const previous = existing.get(`${kind}:${uid}`);
      return {
        uid,
        kind,
        depth: Math.max(0, Number.parseInt(row.style.getPropertyValue('--ymz-outline-depth') || '0', 10) || 0),
        html,
        text: structuredOutlineHtmlToText(html),
        parentUid: row.dataset.outlineParentUid || previous?.parentUid || null,
        hidden: row.dataset.outlineHidden === 'true',
        expanded: row.dataset.outlineExpanded !== 'false',
        hasChildren: row.dataset.outlineHasChildren === 'true',
        isRoot: index === 0,
        pristine: row.dataset.outlinePristine === 'true',
      };
    });
  }

  private domSignature(): string {
    return this.collectBlocks().map((block) => `${block.kind}|${block.uid}|${block.depth}|${block.expanded ? 1 : 0}|${block.html}`).join('\u001e');
  }

  private selectionContext(): SelectionContext | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !this.options.root.contains(selection.anchorNode) || !this.options.root.contains(selection.focusNode)) return null;
    const range = selection.getRangeAt(0);
    const startEditor = closestEditor(range.startContainer);
    const endEditor = closestEditor(range.endContainer);
    const startRow = startEditor?.closest<HTMLElement>('[data-outline-uid]');
    const endRow = endEditor?.closest<HTMLElement>('[data-outline-uid]');
    if (!startEditor || !endEditor || !startRow || !endRow) return null;
    return {
      selection,
      range,
      start: { uid: startRow.dataset.outlineUid ?? '', offset: offsetWithin(startEditor, range.startContainer, range.startOffset) },
      end: { uid: endRow.dataset.outlineUid ?? '', offset: offsetWithin(endEditor, range.endContainer, range.endOffset) },
      startEditor,
      endEditor,
      startRow,
      endRow,
      collapsed: range.collapsed,
      spansRows: startRow !== endRow,
    };
  }

  private captureSelectionBookmark(): SelectionBookmark | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !this.options.root.contains(selection.anchorNode) || !this.options.root.contains(selection.focusNode)) return null;
    const anchorEditor = closestEditor(selection.anchorNode);
    const focusEditor = closestEditor(selection.focusNode);
    const anchorRow = anchorEditor?.closest<HTMLElement>('[data-outline-uid]');
    const focusRow = focusEditor?.closest<HTMLElement>('[data-outline-uid]');
    if (!anchorEditor || !focusEditor || !anchorRow || !focusRow) return null;
    return {
      anchor: { uid: anchorRow.dataset.outlineUid ?? '', offset: offsetWithin(anchorEditor, selection.anchorNode!, selection.anchorOffset) },
      focus: { uid: focusRow.dataset.outlineUid ?? '', offset: offsetWithin(focusEditor, selection.focusNode!, selection.focusOffset) },
      whole: this.wholeOutlineSelected,
    };
  }

  private restoreSelectionBookmark(bookmark: SelectionBookmark): void {
    const anchorEditor = this.editorByUid(bookmark.anchor.uid);
    const focusEditor = this.editorByUid(bookmark.focus.uid);
    if (!anchorEditor || !focusEditor) return;
    const anchor = domPointAtOffset(anchorEditor, bookmark.anchor.offset);
    const focus = domPointAtOffset(focusEditor, bookmark.focus.offset);
    const selection = window.getSelection();
    if (!selection) return;
    this.suppressSelectionChange = true;
    try {
      selection.removeAllRanges();
      if (typeof selection.setBaseAndExtent === 'function') {
        selection.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
      } else {
        const range = document.createRange();
        range.setStart(anchor.node, anchor.offset);
        range.setEnd(focus.node, focus.offset);
        selection.addRange(range);
      }
      this.wholeOutlineSelected = bookmark.whole;
      this.wholeSelectionRange = bookmark.whole && selection.rangeCount
        ? selection.getRangeAt(0).cloneRange()
        : null;
    } finally {
      this.suppressSelectionChange = false;
    }
  }

  private clearWholeSelection(): void {
    this.wholeOutlineSelected = false;
    this.wholeSelectionRange = null;
  }

  private isWholeSelectionActive(range: Range | null): boolean {
    if (!this.wholeOutlineSelected) return false;
    if (range && this.matchesWholeSelection(range)) return true;
    this.clearWholeSelection();
    return false;
  }

  private matchesWholeSelection(range: Range): boolean {
    const expected = this.wholeSelectionRange;
    if (!expected) return false;
    try {
      return range.compareBoundaryPoints(Range.START_TO_START, expected) === 0
        && range.compareBoundaryPoints(Range.END_TO_END, expected) === 0;
    } catch {
      return false;
    }
  }

  private handleSelectAll(): void {
    const context = this.selectionContext();
    if (!context) return;
    const state = this.getSelectionState(context.startEditor);
    const wholeActive = this.isWholeSelectionActive(context.range);
    const currentRowFullySelected = !context.spansRows && state.start === 0 && state.end === state.length && state.length >= 0;
    if (!context.spansRows && !currentRowFullySelected && !wholeActive) {
      this.clearWholeSelection();
      this.selectEditorRange(context.startEditor, 0, state.length);
      this.savedRange = window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0).cloneRange() : null;
      this.options.onDiagnostic?.('select-all-node', { uid: context.start.uid, length: state.length });
      this.publishSelection();
      return;
    }
    const visibleEditors = Array.from(this.options.root.querySelectorAll<HTMLElement>(':scope > [data-outline-hidden="false"] [data-outline-editor], :scope > [data-outline-hidden="false"] > [data-outline-editor]'));
    const first = visibleEditors[0];
    const last = visibleEditors[visibleEditors.length - 1];
    if (!first || !last) return;
    const start = domPointAtOffset(first, 0);
    const end = domPointAtOffset(last, textLength(last));
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const selection = window.getSelection();
    this.suppressSelectionChange = true;
    try {
      selection?.removeAllRanges();
      selection?.addRange(range);
      this.wholeOutlineSelected = true;
      this.wholeSelectionRange = range.cloneRange();
      this.savedRange = range.cloneRange();
    } finally {
      this.suppressSelectionChange = false;
    }
    this.options.onDiagnostic?.('select-all-outline', { nodeCount: flattenStructuredOutline(this.options.getTree()).length });
    this.publishSelection();
  }

  private selectEditorRange(editor: HTMLElement, startOffset: number, endOffset: number): void {
    this.clearWholeSelection();
    editor.focus({ preventScroll: true });
    const start = domPointAtOffset(editor, startOffset);
    const end = domPointAtOffset(editor, endOffset);
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const selection = window.getSelection();
    this.suppressSelectionChange = true;
    try {
      selection?.removeAllRanges();
      selection?.addRange(range);
      this.savedRange = range.cloneRange();
    } finally {
      this.suppressSelectionChange = false;
    }
  }

  private splitSelectionToSibling(): void {
    const context = this.selectionContext();
    if (!context) return;
    if (context.spansRows) {
      // Collapse a cross-row selection first, then split at the restored caret.
      // Both actions still travel through the same structured outline mutation
      // path and never delegate block creation to contenteditable defaults.
      this.replaceSelectionWithText('', 'enter-selection');
      window.requestAnimationFrame(() => this.splitSelectionToSibling());
      return;
    }

    const blocks = this.collectBlocks();
    const rows = Array.from(
      this.options.root.querySelectorAll<HTMLElement>(':scope > [data-outline-uid]'),
    );
    const index = rows.indexOf(context.startRow);
    const current = blocks[index];
    if (index < 0 || !current || current.kind !== 'node') return;

    const length = textLength(context.startEditor);
    const prefixHtml = rangeHtml(context.startEditor, 0, context.start.offset);
    const suffixHtml = rangeHtml(context.startEditor, context.end.offset, length);
    const prefixText = structuredOutlineHtmlToText(prefixHtml);
    const suffixText = structuredOutlineHtmlToText(suffixHtml);
    const nextUid = createStructuredOutlineUid();
    const nextDepth = current.isRoot ? 1 : current.depth;
    const nextBlock: StructuredOutlineBlock = {
      uid: nextUid,
      kind: 'node',
      depth: nextDepth,
      html: suffixHtml,
      text: suffixText,
      parentUid: current.isRoot ? current.uid : current.parentUid,
      hidden: false,
      expanded: true,
      hasChildren: false,
      isRoot: false,
      pristine: false,
    };
    const updatedCurrent: StructuredOutlineBlock = {
      ...current,
      html: prefixHtml,
      text: prefixText,
      pristine: false,
    };

    let insertionIndex: number;
    if (current.isRoot) {
      insertionIndex = index + 1;
    } else {
      insertionIndex = index + 1;
      while (insertionIndex < blocks.length && blocks[insertionIndex].depth > current.depth) {
        insertionIndex += 1;
      }
    }
    const next = [
      ...blocks.slice(0, index),
      updatedCurrent,
      ...blocks.slice(index + 1, insertionIndex),
      nextBlock,
      ...blocks.slice(insertionIndex),
    ];
    this.replaceDomBlocks(normalizeStructuredOutlineDepths(next), 'enter-split-node');
    window.requestAnimationFrame(() => {
      const editor = this.editorByUid(nextUid);
      if (!editor) return;
      this.selectEditorRange(editor, 0, 0);
      this.activateUid(nextUid, true);
      this.options.onActivate(nextUid);
    });
  }

  private removeEmptyRow(row: HTMLElement, backward: boolean): void {
    if (row.dataset.outlineRoot === 'true') return;
    const blocks = this.collectBlocks();
    const rows = Array.from(
      this.options.root.querySelectorAll<HTMLElement>(':scope > [data-outline-uid]'),
    );
    const index = rows.indexOf(row);
    const current = blocks[index];
    if (index < 0 || !current) return;
    const emptyEditor = row.querySelector<HTMLElement>('[data-outline-editor]');
    if (emptyEditor) emptyEditor.replaceChildren();
    const neighbor = this.visibleNeighbor(row, backward ? -1 : 1)
      ?? this.visibleNeighbor(row, backward ? 1 : -1);
    const neighborUid = neighbor?.dataset.outlineUid ?? '';
    const neighborEditor = neighbor?.querySelector<HTMLElement>('[data-outline-editor]') ?? null;
    const neighborCaret = neighborEditor
      ? (backward ? textLength(neighborEditor) : 0)
      : 0;
    // Move the live browser selection away from the soon-to-be-removed block
    // before patching the contenteditable document. Chromium otherwise preserves
    // the caret by transplanting the empty <p><br></p> into the previous row.
    if (neighborEditor) this.selectEditorRange(neighborEditor, neighborCaret, neighborCaret);
    const currentDepth = current.depth;
    let descendantsEnd = index + 1;
    while (descendantsEnd < blocks.length && blocks[descendantsEnd].depth > currentDepth) {
      descendantsEnd += 1;
    }
    const promotedDescendants = blocks
      .slice(index + 1, descendantsEnd)
      .map((block) => ({ ...block, depth: Math.max(1, block.depth - 1) }));
    const next = [
      ...blocks.slice(0, index),
      ...promotedDescendants,
      ...blocks.slice(descendantsEnd),
    ];
    this.replaceDomBlocks(normalizeStructuredOutlineDepths(next), 'remove-empty-node');
    window.requestAnimationFrame(() => {
      const editor = this.editorByUid(neighborUid);
      if (!editor) return;
      const caret = backward ? textLength(editor) : 0;
      this.selectEditorRange(editor, caret, caret);
      this.activateUid(neighborUid, true);
      this.options.onActivate(neighborUid);
    });
  }

  private replaceSelectionWithText(value: string, reason: string, richLines?: readonly string[]): void {
    const context = this.selectionContext();
    if (this.isWholeSelectionActive(context?.range ?? null)) {
      this.replaceWholeOutline(value, reason, richLines);
      return;
    }
    if (!context) return;
    const parsed = parseOutlineText(value);
    if (!context.spansRows && parsed.lines.length <= 1) {
      this.insertInlineHtml(escapeHtml(parsed.lines[0]?.text ?? ''));
      this.markDirty(reason);
      this.flush(reason);
      return;
    }

    const blocks = this.collectBlocks();
    const rowOrder = Array.from(this.options.root.querySelectorAll<HTMLElement>(':scope > [data-outline-uid]'));
    const startIndex = rowOrder.indexOf(context.startRow);
    const endIndex = rowOrder.indexOf(context.endRow);
    if (startIndex < 0 || endIndex < 0) return;
    const startBlock = blocks[startIndex];
    const endBlock = blocks[endIndex];
    const startText = structuredOutlineHtmlToText(startBlock.html);
    const endText = structuredOutlineHtmlToText(endBlock.html);
    const prefix = startText.slice(0, context.start.offset);
    const suffix = endText.slice(context.end.offset);
    const prefixHtml = rangeHtml(context.startEditor, 0, context.start.offset);
    const suffixHtml = rangeHtml(context.endEditor, context.end.offset, textLength(context.endEditor));
    const lines = parsed.lines.length ? parsed.lines : [{ text: '', depth: 0, rawIndent: '', sourceLine: 1 }];
    const firstDepth = lines[0]?.depth ?? 0;
    const inserted: StructuredOutlineBlock[] = lines.map((line, index) => {
      const useEnd = index === lines.length - 1 && endIndex !== startIndex;
      const base = index === 0 ? startBlock : useEnd ? endBlock : startBlock;
      const text = `${index === 0 ? prefix : ''}${line.text}${index === lines.length - 1 ? suffix : ''}`;
      const pastedHtml = richLines?.[index] ?? richHtmlForText(line.text);
      const html = `${index === 0 ? prefixHtml : ''}${pastedHtml}${index === lines.length - 1 ? suffixHtml : ''}`;
      return {
        ...base,
        uid: index === 0 ? startBlock.uid : useEnd ? endBlock.uid : createStructuredOutlineUid(),
        kind: 'node',
        depth: Math.max(0, startBlock.depth + line.depth - firstDepth),
        html,
        text,
        parentUid: null,
        hidden: false,
        expanded: index === 0 ? startBlock.expanded : true,
        hasChildren: false,
        isRoot: startBlock.isRoot && index === 0,
        pristine: false,
      };
    });
    const selectedVisibleKeys = new Set<string>();
    rowOrder.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1).forEach((row) => {
      if (row.dataset.outlineHidden !== 'true') selectedVisibleKeys.add(`${row.dataset.outlineKind ?? 'node'}:${row.dataset.outlineUid ?? ''}`);
    });
    let next: StructuredOutlineBlock[];
    if (startIndex === endIndex) {
      // Replacing one node must not silently move its existing subtree under a
      // newly pasted sibling. New pasted children are inserted first, the
      // original children remain attached to the reused boundary node, and
      // pasted siblings follow the preserved subtree.
      let descendantsEnd = startIndex + 1;
      while (descendantsEnd < blocks.length && blocks[descendantsEnd].depth > startBlock.depth) descendantsEnd += 1;
      const foundSibling = startBlock.isRoot
        ? -1
        : inserted.findIndex((block, index) => index > 0 && block.depth <= startBlock.depth);
      const splitAt = foundSibling < 1 ? inserted.length : foundSibling;
      next = [
        ...blocks.slice(0, startIndex),
        ...inserted.slice(0, splitAt),
        ...blocks.slice(startIndex + 1, descendantsEnd),
        ...inserted.slice(splitAt),
        ...blocks.slice(descendantsEnd),
      ];
    } else {
      next = [];
      blocks.forEach((block, index) => {
        const key = blockKey(block);
        if (index === startIndex) {
          next.push(...inserted);
          return;
        }
        if (index === endIndex) return;
        if (selectedVisibleKeys.has(key) && index > startIndex && index < endIndex) return;
        next.push(block);
      });
    }
    const normalized = normalizeStructuredOutlineDepths(next);
    this.replaceDomBlocks(normalized, reason);
    const targetBlock = inserted[inserted.length - 1];
    window.requestAnimationFrame(() => {
      const editor = this.editorByUid(targetBlock.uid);
      if (!editor) return;
      const caret = Math.max(0, textLength(editor) - suffix.length);
      this.selectEditorRange(editor, caret, caret);
      this.activateUid(targetBlock.uid, true);
      this.options.onActivate(targetBlock.uid);
    });
  }

  private replaceWholeOutline(value: string, reason: string, richLines?: readonly string[]): void {
    const parsed = parseOutlineText(value);
    const existing = flattenStructuredOutline(this.lastTree).filter((block) => block.kind === 'node');
    const root = existing[0];
    let blocks: StructuredOutlineBlock[] = [];
    if (parsed.lines.length === 0) {
      blocks = [{ ...root, html: '', text: '', depth: 0, hidden: false, isRoot: true, pristine: false }];
    } else if (parsed.topLevelCount === 1 && parsed.lines[0].depth === 0) {
      blocks = parsed.lines.map((line, index) => ({
        ...(index === 0 ? root : existing[index] ?? root),
        uid: index === 0 ? root.uid : existing[index]?.uid ?? createStructuredOutlineUid(),
        kind: 'node',
        depth: line.depth,
        html: richLines?.[index] ?? richHtmlForText(line.text),
        text: line.text,
        parentUid: null,
        hidden: false,
        expanded: true,
        hasChildren: false,
        isRoot: index === 0,
        pristine: false,
      }));
    } else {
      blocks = [{ ...root, depth: 0, hidden: false, isRoot: true }];
      parsed.lines.forEach((line, index) => {
        const old = existing[index + 1];
        blocks.push({
          ...(old ?? root),
          uid: old?.uid ?? createStructuredOutlineUid(),
          kind: 'node',
          depth: line.depth + 1,
          html: richLines?.[index] ?? richHtmlForText(line.text),
          text: line.text,
          parentUid: root.uid,
          hidden: false,
          expanded: true,
          hasChildren: false,
          isRoot: false,
          pristine: false,
        });
      });
    }
    this.clearWholeSelection();
    this.replaceDomBlocks(normalizeStructuredOutlineDepths(blocks), reason);
    const last = blocks[blocks.length - 1] ?? root;
    window.requestAnimationFrame(() => {
      const editor = this.editorByUid(last.uid);
      if (editor) this.selectEditorRange(editor, textLength(editor), textLength(editor));
    });
  }

  private replaceDomBlocks(blocks: StructuredOutlineBlock[], reason: string): void {
    const bookmark = null;
    this.patchBlocks(blocks, bookmark);
    this.dirty = true;
    this.flush(reason);
  }

  private insertInlineHtml(html: string): void {
    const range = this.currentRange();
    if (!range) return;
    range.deleteContents();
    const template = document.createElement('template');
    template.innerHTML = sanitizeRichHtml(html);
    const fragment = template.content;
    const last = fragment.lastChild;
    range.insertNode(fragment);
    if (last) this.placeCaretAfter(last);
    this.clearWholeSelection();
  }

  private adjustSelectedDepth(delta: number): void {
    const context = this.selectionContext();
    if (!context) return;
    const range = context.range;
    const rows = Array.from(this.options.root.querySelectorAll<HTMLElement>(':scope > [data-outline-uid]')).filter((row) => {
      if (row.dataset.outlineHidden === 'true' || row.dataset.outlineKind === 'summary') return false;
      const editor = row.querySelector<HTMLElement>('[data-outline-editor]');
      return Boolean(editor && (range.intersectsNode(editor) || row === context.startRow));
    });
    const bookmark = this.captureSelectionBookmark();
    rows.forEach((row) => {
      if (row.dataset.outlineRoot === 'true') return;
      const current = Number.parseInt(row.style.getPropertyValue('--ymz-outline-depth') || '1', 10) || 1;
      let next = Math.max(1, current + delta);
      if (delta > 0) {
        const previous = this.visibleNeighbor(row, -1);
        const previousDepth = previous ? Number.parseInt(previous.style.getPropertyValue('--ymz-outline-depth') || '0', 10) || 0 : 0;
        next = Math.min(next, previousDepth + 1);
      }
      row.style.setProperty('--ymz-outline-depth', String(next));
      row.setAttribute('aria-level', String(next + 1));
    });
    this.markDirty(delta > 0 ? 'indent' : 'outdent');
    this.flush(delta > 0 ? 'indent' : 'outdent');
    if (bookmark) this.restoreSelectionBookmark(bookmark);
  }

  private mergeRows(neighbor: HTMLElement, current: HTMLElement, backward: boolean): void {
    const first = backward ? neighbor : current;
    const second = backward ? current : neighbor;
    const firstEditor = first.querySelector<HTMLElement>('[data-outline-editor]');
    const secondEditor = second.querySelector<HTMLElement>('[data-outline-editor]');
    if (!firstEditor || !secondEditor) return;
    const caret = textLength(firstEditor);
    const firstHtml = editorIsSemanticallyEmpty(firstEditor) ? '' : firstEditor.innerHTML;
    const secondHtml = editorIsSemanticallyEmpty(secondEditor) ? '' : secondEditor.innerHTML;
    firstEditor.innerHTML = `${firstHtml}${secondHtml}`;
    second.remove();
    this.markDirty('merge-node');
    this.flush('merge-node');
    window.requestAnimationFrame(() => this.selectEditorRange(firstEditor, caret, caret));
  }

  private selectedStructuredPlainText(context: SelectionContext): string {
    if (!context.spansRows) return context.selection.toString();
    const rows = Array.from(this.options.root.querySelectorAll<HTMLElement>(':scope > [data-outline-uid]'));
    const startIndex = rows.indexOf(context.startRow);
    const endIndex = rows.indexOf(context.endRow);
    const low = Math.min(startIndex, endIndex);
    const high = Math.max(startIndex, endIndex);
    const lines: string[] = [];
    rows.slice(low, high + 1).forEach((row, offset) => {
      if (row.dataset.outlineHidden === 'true') return;
      const editor = row.querySelector<HTMLElement>('[data-outline-editor]');
      if (!editor) return;
      const depth = Number.parseInt(row.style.getPropertyValue('--ymz-outline-depth') || '0', 10) || 0;
      let text = (editor.innerText || editor.textContent || '').replace(/\u00a0/g, ' ');
      if (low + offset === startIndex) text = text.slice(context.start.offset);
      if (low + offset === endIndex) text = text.slice(0, context.end.offset);
      lines.push(`${PLAIN_INDENT.repeat(depth)}${text}`);
    });
    return lines.join('\n');
  }

  private selectedStructuredHtml(context: SelectionContext | null, plain: string, whole = false): string {
    if (whole) {
      return flattenStructuredOutline(this.options.getTree())
        .filter((block) => block.kind === 'node')
        .map((block) => `<div data-yemind-outline-depth="${block.depth}">${escapeHtml(PLAIN_INDENT.repeat(block.depth))}${block.html}</div>`)
        .join('');
    }
    if (!context) return plain.split('\n').map((line) => `<div>${escapeHtml(line)}</div>`).join('');
    if (!context.spansRows) {
      const fragment = context.range.cloneContents();
      const wrapper = document.createElement('div');
      wrapper.append(fragment);
      return sanitizeRichHtml(wrapper.innerHTML);
    }
    const rows = Array.from(this.options.root.querySelectorAll<HTMLElement>(':scope > [data-outline-uid]'));
    const startIndex = rows.indexOf(context.startRow);
    const endIndex = rows.indexOf(context.endRow);
    const low = Math.min(startIndex, endIndex);
    const high = Math.max(startIndex, endIndex);
    return rows.slice(low, high + 1)
      .map((row, offset) => {
        if (row.dataset.outlineHidden === 'true') return '';
        const editor = row.querySelector<HTMLElement>('[data-outline-editor]');
        if (!editor) return '';
        const index = low + offset;
        const depth = Number.parseInt(row.style.getPropertyValue('--ymz-outline-depth') || '0', 10) || 0;
        const start = index === startIndex ? context.start.offset : 0;
        const end = index === endIndex ? context.end.offset : textLength(editor);
        return `<div data-yemind-outline-depth="${depth}">${escapeHtml(PLAIN_INDENT.repeat(depth))}${rangeHtml(editor, start, end)}</div>`;
      })
      .filter(Boolean)
      .join('');
  }

  private publishSelection(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !this.options.root.contains(selection.anchorNode)) {
      this.options.onSelectionChange(false, null, null, this);
      return;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      this.options.onSelectionChange(false, null, null, this);
      return;
    }
    this.savedRange = range.cloneRange();
    const rect = selectionRect(range);
    this.options.onSelectionChange(Boolean(rect), rect, this.currentFormat(), this);
  }

  private currentFormat(): Record<string, unknown> {
    const range = this.currentRange();
    const element = range ? closestElement(range.commonAncestorContainer) : null;
    const style = element ? getComputedStyle(element) : null;
    return {
      bold: commandState('bold') || Number.parseInt(style?.fontWeight ?? '400', 10) >= 600,
      italic: commandState('italic') || style?.fontStyle === 'italic',
      underline: commandState('underline') || style?.textDecorationLine.includes('underline'),
      strike: commandState('strikeThrough') || style?.textDecorationLine.includes('line-through'),
      code: Boolean(element?.closest('code')),
      link: element?.closest<HTMLAnchorElement>('a[href]')?.href ?? '',
      color: commandValue('foreColor') || style?.color,
      background: commandValue('hiliteColor') || style?.backgroundColor,
      font: commandValue('fontName') || style?.fontFamily,
      size: style?.fontSize,
    };
  }

  private afterFormatting(reason: string): void {
    this.markDirty(`format:${reason}`);
    this.flush(`format:${reason}`);
    this.publishSelection();
  }

  private wrapSelection(tag: string, styles?: Partial<CSSStyleDeclaration>): HTMLElement | null {
    const range = this.currentRange();
    if (!range || range.collapsed) return null;
    const element = document.createElement(tag);
    if (styles) Object.assign(element.style, styles);
    try {
      range.surroundContents(element);
    } catch {
      const fragment = range.extractContents();
      element.append(fragment);
      range.insertNode(element);
    }
    const nextRange = document.createRange();
    nextRange.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(nextRange);
    this.savedRange = nextRange.cloneRange();
    return element;
  }

  private applyInlineStyle(styles: Partial<CSSStyleDeclaration>): void {
    this.wrapSelection('span', styles);
  }

  private placeCaretAfter(node: Node): void {
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    this.savedRange = range.cloneRange();
  }

  private currentRange(): Range | null {
    const selection = window.getSelection();
    if (selection && selection.rangeCount && this.options.root.contains(selection.anchorNode)) return selection.getRangeAt(0);
    return this.savedRange?.cloneRange() ?? null;
  }

  private placeSelectionToolbarLater(): void {
    window.setTimeout(() => this.publishSelection(), 0);
  }

  private visibleNeighbor(row: HTMLElement, offset: number): HTMLElement | null {
    const rows = Array.from(this.options.root.querySelectorAll<HTMLElement>(':scope > [data-outline-uid][data-outline-hidden="false"]'));
    const index = rows.indexOf(row);
    return rows[index + offset] ?? null;
  }

  private rowByUid(uid: string): HTMLElement | null {
    return Array.from(this.options.root.querySelectorAll<HTMLElement>(':scope > [data-outline-uid]')).find((row) => row.dataset.outlineUid === uid) ?? null;
  }

  private editorByUid(uid: string): HTMLElement | null {
    return this.rowByUid(uid)?.querySelector<HTMLElement>('[data-outline-editor]') ?? null;
  }
}

function closestElement(node: Node | null): Element | null {
  return node instanceof Element ? node : node?.parentElement ?? null;
}
