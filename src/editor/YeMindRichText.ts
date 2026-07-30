import BaseRichText from 'simple-mind-map/src/plugins/RichText';
import { checkSmmFormatData, getTextFromHtml, nodeRichTextToTextWithWrap } from 'simple-mind-map/src/utils';
import Quill from 'quill';
import Delta from 'quill-delta';
import { Scope } from 'parchment';
import { editableTextLength, isPristineNodeTextData, markNodeTextEditedData } from './textEditingPolicy';
import { structuredOutlineIsRichHtml } from './structuredOutlineDocument';
import { clearNodeClipboard } from './nodeClipboard';
import {
  isUsableTextRect,
  editorContentRectAligned,
  editorHorizontalMargin,
  renderedNodeUid,
  resolveLiveRenderedNode,
  resolveRenderedTextRect,
  snapshotRect,
  type ResolvedTextRect,
} from './richTextGeometry';
import {
  CanvasEditSessionCoordinator,
  type CanvasEditSessionSnapshot,
  type CanvasSelectionSession,
} from './CanvasEditSessionCoordinator';
import { shouldActivateRichTextLink } from './linkNavigation';

export const YEMIND_FONT_VALUES = [
  'sans-serif',
  'serif',
  '微软雅黑, Microsoft YaHei',
  '宋体, SimSun, Songti SC',
  'andale mono',
] as const;

export const YEMIND_SIZE_VALUES = [
  '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px',
] as const;

export const YEMIND_RICH_TEXT_FORMATS = [
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'font',
  'size',
  'formula',
  'align',
  'link',
  'code',
  'code-block',
] as const;

let formatsRegistered = false;

interface QuillClipboardRange {
  index: number;
  length: number;
}

interface QuillClipboardSource {
  getSelection?(): QuillClipboardRange | null;
  getText(index: number, length: number): string;
  getSemanticHTML?(index: number, length: number): string;
}

export function resolveNonCollapsedQuillRange(
  quill: Pick<QuillClipboardSource, 'getSelection'> | null | undefined,
  fallbackRange: QuillClipboardRange | null | undefined,
): QuillClipboardRange | null {
  const live = quill?.getSelection?.() ?? null;
  if (live && live.length > 0) return live;
  if (fallbackRange && fallbackRange.length > 0) return fallbackRange;
  return null;
}

export function writeQuillSelectionToClipboard(
  quill: QuillClipboardSource | null | undefined,
  event: ClipboardEvent,
  fallbackRange: QuillClipboardRange | null | undefined,
): boolean {
  const range = resolveNonCollapsedQuillRange(quill, fallbackRange);
  if (!quill || !event.clipboardData || !range || range.length <= 0) return false;
  const plain = String(quill.getText(range.index, range.length) ?? '').replace(/\n$/, '');
  if (!plain) return false;
  const html = String(quill.getSemanticHTML?.(range.index, range.length) ?? '');
  clearNodeClipboard();
  event.preventDefault();
  event.clipboardData.setData('text/plain', plain);
  if (html) event.clipboardData.setData('text/html', html);
  return true;
}

export interface CanvasTextPayload {
  text: string;
  richText: boolean;
}

export function canvasTextPayloadMatchesNode(
  payload: CanvasTextPayload,
  nodeData: { text?: unknown; richText?: unknown } | null | undefined,
): boolean {
  return (
    String(nodeData?.text ?? '') === payload.text
    && Boolean(nodeData?.richText) === payload.richText
  );
}

export function shouldStabilizeOpeningPlacement(isInserting: unknown): boolean {
  return isInserting === true;
}

function trimCanvasRichTextBoundaryBlocks(value: string): string {
  if (typeof document === 'undefined') {
    const emptyBlock = String.raw`<(?:p|div)\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:p|div)>`;
    return value
      .replace(new RegExp(String.raw`^(?:\s*${emptyBlock}\s*)+`, 'i'), '')
      .replace(new RegExp(String.raw`(?:\s*${emptyBlock}\s*)+$`, 'i'), '')
      .trim();
  }
  const template = document.createElement('template');
  template.innerHTML = value;
  const discardBoundaryWhitespace = (): void => {
    while (
      template.content.firstChild?.nodeType === Node.TEXT_NODE
      && !(template.content.firstChild.textContent ?? '').trim()
    ) template.content.firstChild.remove();
    while (
      template.content.lastChild?.nodeType === Node.TEXT_NODE
      && !(template.content.lastChild.textContent ?? '').trim()
    ) template.content.lastChild.remove();
  };
  const isEmptyBoundaryBlock = (node: ChildNode | null): node is HTMLElement => (
    node instanceof HTMLElement
    && (node.tagName === 'P' || node.tagName === 'DIV')
    && !(node.textContent ?? '').replace(/\u00a0/g, ' ').trim()
    && !node.querySelector('img,svg,mjx-container,.ql-formula,[data-formula],iframe,video,audio')
  );
  discardBoundaryWhitespace();
  while (isEmptyBoundaryBlock(template.content.firstChild)) {
    template.content.firstChild.remove();
    discardBoundaryWhitespace();
  }
  while (isEmptyBoundaryBlock(template.content.lastChild)) {
    template.content.lastChild.remove();
    discardBoundaryWhitespace();
  }
  return template.innerHTML.trim();
}

/**
 * Quill always serializes even plain text as HTML (`<p>text</p>`). Persisting
 * that wrapper as rich text changes simple-mind-map's measurement engine after
 * every first edit, so an unchanged node grows or shrinks when editing closes.
 * Keep plain content plain and only opt into the rich-text renderer when the
 * document contains a real inline/block format.
 */
export function normalizeCanvasTextPayload(html: unknown): CanvasTextPayload {
  const source = trimCanvasRichTextBoundaryBlocks(String(html ?? ''));
  const richText = structuredOutlineIsRichHtml(source);
  const plain = richText
    ? ''
    : nodeRichTextToTextWithWrap(source.replace(/<br\s*\/?>/gi, '\n'))
        .replace(/\u00a0/g, ' ')
        .replace(/^(?:[ \t]*\n)+/, '')
        .replace(/(?:\n[ \t]*)+$/, '');
  return {
    text: richText
      ? source
      : (plain.trim().length > 0 ? plain : ''),
    richText,
  };
}

function sanitizeLink(value: string): string {
  const text = String(value ?? '').trim();
  if (/^(https?:|mailto:|tel:|sms:|siyuan:)/i.test(text)) return text;
  return 'about:blank';
}

export function registerYeMindFormats(): void {
  if (formatsRegistered) return;
  formatsRegistered = true;

  const FontStyle = Quill.import('attributors/style/font') as any;
  const SizeStyle = Quill.import('attributors/style/size') as any;
  FontStyle.whitelist = [...YEMIND_FONT_VALUES];
  SizeStyle.whitelist = [...YEMIND_SIZE_VALUES];
  Quill.register(FontStyle, true);
  Quill.register(SizeStyle, true);

  const BaseLink = Quill.import('formats/link') as any;
  class YeMindLink extends BaseLink {
    static blotName = 'link';
    static tagName = 'A';

    static create(value: string): HTMLElement {
      const node = super.create(value) as HTMLElement;
      node.setAttribute('href', sanitizeLink(value));
      node.setAttribute('rel', 'noopener noreferrer');
      node.setAttribute('data-yemind-link', 'true');
      return node;
    }

    static sanitize(value: string): string {
      return sanitizeLink(value);
    }

    format(name: string, value: unknown): void {
      if (name === 'link' && value) {
        this.domNode.setAttribute('href', sanitizeLink(String(value)));
        return;
      }
      super.format(name, value);
    }
  }

  const BaseCodeBlock = Quill.import('formats/code-block') as any;
  class YeMindCodeBlock extends BaseCodeBlock {
    static blotName = 'code-block';
    static className = 'ql-code-block';
    static tagName = 'DIV';

    static create(value: string | boolean): HTMLElement {
      const node = super.create(value) as HTMLElement;
      const language = typeof value === 'string' && value.trim() ? value.trim() : 'plain';
      node.setAttribute('data-language', language);
      return node;
    }

    static formats(node: HTMLElement): string {
      return node.getAttribute('data-language') || 'plain';
    }

    format(name: string, value: unknown): void {
      if (name === 'code-block' && value) {
        this.domNode.setAttribute('data-language', String(value));
        return;
      }
      super.format(name, value);
    }
  }

  Quill.register(YeMindLink, true);
  Quill.register(YeMindCodeBlock, true);
}

/**
 * YeMind's rich-text plugin extends the MIT-licensed simple-mind-map RichText
 * implementation and only replaces Quill initialization so links, inline code,
 * and language-aware code blocks are first-class persisted formats.
 */
export default class YeMindRichText extends (BaseRichText as any) {
  static instanceName = 'richText';

  private editSessions?: CanvasEditSessionCoordinator;
  private lastValidNodeRect: DOMRect | null = null;
  private lastRectSource: ResolvedTextRect['source'] | 'show-parameter' | 'last-valid' | 'none' = 'none';
  private placementFrame: number | null = null;
  private placementMonitorFrame: number | null = null;
  private placementTracking = false;
  private placementResizeObserver: ResizeObserver | null = null;
  private lastAlignedSessionId = 0;
  private openingFocusFrame: number | null = null;
  private openingFocusSessionId = 0;
  private openingFocusAttempts = 0;
  private pasteTransactionPending = false;
  private readonly handlePlacementInvalidation = (): void => {
    if (!this.showTextEdit) return;
    this.schedulePlacementStabilization();
  };
  private readonly handleOpeningFocusPointerDown = (event: PointerEvent): void => {
    const host = this.textEditNode as HTMLElement | null;
    const target = event.target;
    if (host && target instanceof Node && host.contains(target)) return;
    this.cancelOpeningFocusClaim();
  };

  private sessionCoordinator(): CanvasEditSessionCoordinator {
    this.editSessions ??= new CanvasEditSessionCoordinator();
    return this.editSessions;
  }

  private get editingUid(): string {
    return this.sessionCoordinator().snapshot().uid;
  }

  private set editingUid(uid: string) {
    const sessions = this.sessionCoordinator();
    const current = sessions.snapshot();
    const next = String(uid ?? '');
    if (!next) {
      if (current.phase !== 'idle') sessions.close(current.id);
      return;
    }
    if (current.uid !== next || current.phase === 'idle') sessions.begin(next);
  }

  getEditSessionSnapshot(): Readonly<CanvasEditSessionSnapshot> {
    return this.sessionCoordinator().snapshot();
  }

  private editorContentReady(): boolean {
    const editor = (this.textEditNode as HTMLElement | null)
      ?.querySelector<HTMLElement>('.ql-editor');
    if (!editor) return false;
    const sourceText = String(this.node?.getData?.('text') ?? '').trim();
    if (!sourceText) return true;
    return Boolean(
      String(editor.textContent ?? '').trim()
      || editor.querySelector('img,svg,.ql-formula,[data-yemind-formula]'),
    );
  }

  private markCurrentEditorReady(): Readonly<CanvasEditSessionSnapshot> | null {
    const sessions = this.sessionCoordinator();
    const current = sessions.snapshot();
    const host = this.textEditNode as HTMLElement | null;
    const rect = host?.getBoundingClientRect?.();
    return sessions.markEditorReady(current.id, {
      geometryReady: Boolean(
        host
        && host.dataset.yemindGeometryReady === 'true'
        && rect
        && rect.width > 0.5
        && rect.height > 0.5,
      ),
      contentReady: this.editorContentReady(),
    });
  }

  private acceptCurrentSelection(): CanvasSelectionSession | null {
    const sessions = this.sessionCoordinator();
    return sessions.acceptSelection(sessions.snapshot().id);
  }

  /**
   * The upstream RichText plugin migrates every plain node to `richText: true`
   * when it is constructed and whenever a new tree is installed. YeMind keeps
   * plain and formatted nodes in one canonical model, so that implicit
   * migration destroys native line breaks and changes node measurement after
   * a collapse, reload, or first edit.
   *
   * Rich text is enabled only by an actual formatting edit. Loading or
   * replacing a tree must be identity-preserving.
   */
  handleDataToRichTextOnInit(): void {
    // Intentionally keep the repository model unchanged.
  }

  handleSetData<T>(data: T): T {
    return data;
  }

  showEditText(params: any): void {
    if (this.showTextEdit) return;
    const pendingHost = this.textEditNode as HTMLElement | null;
    if (pendingHost) pendingHost.dataset.yemindGeometryReady = 'false';
    const sourceNode = params?.node ?? null;
    const uid = renderedNodeUid(sourceNode);
    const liveNode = resolveLiveRenderedNode(this.mindMap, sourceNode, uid);
    const liveGeometry = resolveRenderedTextRect(liveNode);
    const parameterRect = isUsableTextRect(params?.rect) ? snapshotRect(params.rect) : null;
    const rect = liveGeometry?.rect ?? parameterRect ?? this.lastValidNodeRect;

    this.editingUid = uid || renderedNodeUid(liveNode);
    const sessionId = this.sessionCoordinator().snapshot().id;
    if (pendingHost) pendingHost.dataset.yemindEditSession = String(sessionId);
    if (rect) {
      this.lastValidNodeRect = snapshotRect(rect);
      this.lastRectSource = liveGeometry?.source ?? (parameterRect ? 'show-parameter' : 'last-valid');
    }

    super.showEditText({
      ...params,
      node: liveNode ?? sourceNode,
      rect: rect ?? params?.rect,
    });

    // The upstream renderer can keep the pre-drag node instance in the event
    // payload. Keep the editor transaction bound to the current renderer node.
    this.node = resolveLiveRenderedNode(this.mindMap, this.node ?? liveNode ?? sourceNode, this.editingUid);
    const readyHost = this.textEditNode as HTMLElement | null;
    if (readyHost) {
      readyHost.dataset.yemindEditSession = String(sessionId);
      readyHost.dataset.yemindGeometryReady = 'false';
    }
    if (rect) this.applyEditorGeometry(this.node, rect);
    this.bindTextEditingKeyboard();
    this.bindPlacementTracking();
    this.reconcileEditorPlacement(sessionId);
    this.startPlacementMonitor(sessionId);
    this.emitEditingDiagnostic('opened', {
      liveNodeResolved: Boolean(liveNode && liveNode !== sourceNode),
      rectSource: this.lastRectSource,
    });
  }

  updateTextEditNode(): void {
    if (!this.showTextEdit || !this.textEditNode) return;
    const previousNode = this.node;
    const liveNode = resolveLiveRenderedNode(this.mindMap, previousNode, this.editingUid);
    if (liveNode) this.node = liveNode;

    const geometry = resolveRenderedTextRect(liveNode);
    const rect = geometry?.rect ?? this.lastValidNodeRect;
    if (!rect) {
      this.emitEditingDiagnostic('reposition-skipped-invalid-target', {
        liveNodeResolved: Boolean(liveNode && liveNode !== previousNode),
        rectSource: 'none',
      });
      return;
    }

    if (geometry) {
      this.lastValidNodeRect = snapshotRect(geometry.rect);
      this.lastRectSource = geometry.source;
    } else {
      this.lastRectSource = 'last-valid';
    }
    this.applyEditorGeometry(liveNode, rect);
    this.commitOpeningPlacement(this.sessionCoordinator().snapshot().id, rect);
    this.emitEditingDiagnostic(geometry ? 'repositioned' : 'repositioned-from-anchor', {
      liveNodeResolved: Boolean(liveNode && liveNode !== previousNode),
      rectSource: this.lastRectSource,
    });
  }

  hideEditText(nodes?: any[]): void {
    this.unbindPlacementTracking();
    this.cancelPlacementStabilization();
    this.cancelOpeningFocusClaim();
    const liveNode = resolveLiveRenderedNode(this.mindMap, this.node, this.editingUid);
    if (liveNode) this.node = liveNode;
    const liveNodes = Array.isArray(nodes)
      ? nodes.map((node) => resolveLiveRenderedNode(this.mindMap, node)).filter(Boolean)
      : nodes;
    try {
      if (!this.showTextEdit) return;
      const beforeHideRichTextEdit = this.mindMap?.opt?.beforeHideRichTextEdit;
      if (typeof beforeHideRichTextEdit === 'function') beforeHideRichTextEdit(this);
      const payload = normalizeCanvasTextPayload(this.getEditText());
      const list = Array.isArray(liveNodes) && liveNodes.length > 0
        ? liveNodes
        : [this.node].filter(Boolean);
      const editingNode = this.node;
      this.textEditNode.style.display = 'none';
      this.setIsShowTextEdit(false);
      this.mindMap.emit('rich_text_selection_change', false);
      this.node = null;
      this.isInserting = false;
      let changed = false;
      list.forEach((node) => {
        const nodeData = node?.nodeData?.data ?? node?.getData?.() ?? {};
        if (canvasTextPayloadMatchesNode(payload, nodeData)) return;
        changed = true;
        markNodeTextEditedData(nodeData);
        this.mindMap.execCommand(
          'SET_NODE_TEXT',
          node,
          payload.text,
          payload.richText,
          !payload.richText,
        );
      });
      if (changed) this.mindMap.render();
      this.mindMap.emit('hide_text_edit', this.textEditNode, list, editingNode);
    } finally {
      const host = this.textEditNode as HTMLElement | null;
      if (host) host.dataset.yemindGeometryReady = 'false';
      this.lastAlignedSessionId = 0;
      this.editingUid = '';
      this.lastValidNodeRect = null;
      this.lastRectSource = 'none';
    }
  }

  removeTextEditEl(): void {
    this.unbindPlacementTracking();
    this.cancelPlacementStabilization();
    this.cancelOpeningFocusClaim();
    try {
      super.removeTextEditEl();
    } finally {
      const host = this.textEditNode as HTMLElement | null;
      if (host) host.dataset.yemindGeometryReady = 'false';
      this.lastAlignedSessionId = 0;
      this.editingUid = '';
      this.lastValidNodeRect = null;
      this.lastRectSource = 'none';
    }
  }

  setQuillContainerMinHeight(minHeight: number): void {
    const editor = (this.textEditNode as HTMLElement | null)?.querySelector<HTMLElement>('.ql-editor');
    if (editor) editor.style.minHeight = `${Math.max(0, Number(minHeight) || 0)}px`;
  }

  focus(start?: number): void {
    if (!this.quill) return;
    const liveNode = resolveLiveRenderedNode(this.mindMap, this.node, this.editingUid);
    if (liveNode) this.node = liveNode;
    const length = editableTextLength(this.quill);
    const data = this.node?.nodeData?.data ?? this.node?.getData?.() ?? null;
    const selectAll = start === 0 || isPristineNodeTextData(data);
    this.quill.root.focus({ preventScroll: true });
    this.quill.setSelection(selectAll ? 0 : length, selectAll ? length : 0, Quill.sources.SILENT);
    this.range = selectAll ? { index: 0, length } : { index: length, length: 0 };
    this.pasteUseRange = this.range;
    this.emitEditingDiagnostic(selectAll ? 'initial-select-all' : 'initial-caret-end', { length });

    // Quill's SILENT source deliberately suppresses `selection-change`. That is
    // useful while mounting the editor, but it also meant a node double-click
    // selected all text without opening YeMind's shared formatting toolbar.
    // Emit the same normalized selection payload after the edit surface has
    // settled. Newly inserted nodes keep the old behavior and do not show the
    // toolbar immediately.
    if (selectAll && length > 0 && !this.isInserting) {
      const sessionId = this.sessionCoordinator().snapshot().id;
      window.requestAnimationFrame(() => {
        if (!this.sessionCoordinator().isCurrent(sessionId)) return;
        this.emitCurrentSelectionChange();
      });
    }
  }

  private emitCurrentSelectionChange(): void {
    if (!this.showTextEdit || !this.quill || !this.textEditNode) return;
    const range = resolveNonCollapsedQuillRange(this.quill, this.range);
    if (!range || range.length <= 0) return;
    const bounds = this.quill.getBounds(range.index, range.length);
    const rectInfo = this.selectionViewportRect(bounds);
    const formatInfo = this.quill.getFormat(range.index, range.length);
    const selectionSession = this.acceptCurrentSelection();
    if (!selectionSession) return;
    this.range = range;
    this.pasteUseRange = range;
    this.mindMap.emit(
      'rich_text_selection_change',
      true,
      rectInfo,
      formatInfo,
      selectionSession,
    );
    this.emitEditingDiagnostic('initial-selection-toolbar', {
      index: range.index,
      length: range.length,
    });
  }

  private selectionViewportRect(bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
  }): {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
  } {
    const host = this.textEditNode as HTMLElement;
    const selection = window.getSelection();
    if (
      selection
      && !selection.isCollapsed
      && selection.rangeCount > 0
      && selection.anchorNode
      && host.contains(selection.anchorNode)
    ) {
      const live = selection.getRangeAt(0).getBoundingClientRect();
      if (live.width > 0 || live.height > 0) {
        return {
          left: live.left,
          top: live.top,
          right: live.right,
          bottom: live.bottom,
          width: live.width,
        };
      }
    }
    const rect = host.getBoundingClientRect();
    return {
      left: bounds.left + rect.left,
      top: bounds.top + rect.top,
      right: bounds.right + rect.left,
      bottom: bounds.bottom + rect.top,
      width: bounds.width,
    };
  }

  private applyEditorGeometry(node: any, rect: DOMRect): void {
    const host = this.textEditNode as HTMLElement | null;
    if (!host || !isUsableTextRect(rect)) return;
    const group = node?._textData?.node;
    const width = Number(group?.attr?.('data-width'));
    const height = Number(group?.attr?.('data-height'));
    const originWidth = Number.isFinite(width) && width > 0 ? width : rect.width;
    const originHeight = Number.isFinite(height) && height > 0 ? height : rect.height;
    host.style.minWidth = `${originWidth + this.textNodePaddingX * 2}px`;
    host.style.minHeight = `${originHeight}px`;
    this.setQuillContainerMinHeight(originHeight);
    this.applyEditorHorizontalMargin(node, rect);
    this.normalizeEditorPlacement(rect);
    this.alignEditorContentToTarget(rect);
  }

  private applyEditorHorizontalMargin(node: any, rect: DOMRect | null): void {
    const host = this.textEditNode as HTMLElement | null;
    if (!host || !rect) return;
    const group = node?._textData?.node;
    const originWidth = Number(group?.attr?.('data-width'));
    const scaleX = Number.isFinite(originWidth) && originWidth > 0
      ? Math.ceil(rect.width) / originWidth
      : 1;
    const gap = Number(this.mindMap?.opt?.textContentMargin);
    host.style.marginLeft = `${editorHorizontalMargin(
      node,
      this.textNodePaddingX,
      Number.isFinite(gap) ? gap : 5,
      scaleX,
    )}px`;
  }

  private normalizeEditorPlacement(rect?: DOMRect | null): void {
    const host = this.textEditNode as HTMLElement | null;
    if (!host) return;
    const target = this.mindMap?.opt?.customInnerElsAppendTo as HTMLElement | null | undefined;
    const geometry = rect ? null : resolveRenderedTextRect(resolveLiveRenderedNode(this.mindMap, this.node, this.editingUid));
    const nodeRect = rect ?? geometry?.rect ?? this.lastValidNodeRect;
    if (!nodeRect || !isUsableTextRect(nodeRect)) return;
    this.lastValidNodeRect = snapshotRect(nodeRect);
    if (geometry) this.lastRectSource = geometry.source;
    if (!target || target === document.body || host.parentElement === document.body) {
      host.style.position = 'fixed';
      host.style.left = `${nodeRect.left}px`;
      host.style.top = `${nodeRect.top}px`;
      return;
    }
    const targetRect = target.getBoundingClientRect();
    host.style.position = 'absolute';
    host.style.left = `${nodeRect.left - targetRect.left + target.scrollLeft - target.clientLeft}px`;
    host.style.top = `${nodeRect.top - targetRect.top + target.scrollTop - target.clientTop}px`;
  }

  /**
   * `normalizeEditorPlacement` establishes the overlay in the correct viewport
   * coordinate system. Quill still has its own content padding, and prefix
   * nodes can add a renderer-specific margin before the real text layer. Align
   * the live content box, not the outer overlay box, to the canonical SVG text
   * rectangle before the editor is allowed to paint.
   */
  private alignEditorContentToTarget(targetRect: DOMRect): void {
    const host = this.textEditNode as HTMLElement | null;
    const editor = host?.querySelector<HTMLElement>('.ql-editor') ?? null;
    if (!host || !editor) return;
    const editorRect = editor.getBoundingClientRect();
    const deltaX = targetRect.left - editorRect.left;
    const deltaY = targetRect.top - editorRect.top;
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;
    if (Math.abs(deltaX) <= 0.05 && Math.abs(deltaY) <= 0.05) return;

    const left = Number.parseFloat(host.style.left);
    const top = Number.parseFloat(host.style.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return;

    const target = this.mindMap?.opt?.customInnerElsAppendTo as HTMLElement | null | undefined;
    if (!target || target === document.body || host.parentElement === document.body) {
      host.style.left = `${left + deltaX}px`;
      host.style.top = `${top + deltaY}px`;
      return;
    }
    const containerRect = target.getBoundingClientRect();
    const scaleX = target.offsetWidth > 0 ? containerRect.width / target.offsetWidth : 1;
    const scaleY = target.offsetHeight > 0 ? containerRect.height / target.offsetHeight : 1;
    host.style.left = `${left + deltaX / (Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1)}px`;
    host.style.top = `${top + deltaY / (Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1)}px`;
  }

  private commitOpeningPlacement(sessionId: number, targetRect: DOMRect): boolean {
    const sessions = this.sessionCoordinator();
    if (!sessions.isCurrent(sessionId)) return false;
    const host = this.textEditNode as HTMLElement | null;
    const editor = host?.querySelector<HTMLElement>('.ql-editor') ?? null;
    const aligned = editorContentRectAligned(
      editor?.getBoundingClientRect?.(),
      targetRect,
    );
    if (!host) return false;
    const previousPhase = sessions.snapshot().phase;
    host.dataset.yemindEditSession = String(sessionId);
    host.dataset.yemindGeometryReady = aligned ? 'true' : 'false';
    const snapshot = this.markCurrentEditorReady();
    if (
      aligned
      && snapshot?.phase === 'active'
      && previousPhase !== 'active'
      && this.lastAlignedSessionId !== sessionId
    ) {
      this.lastAlignedSessionId = sessionId;
      // The edit host stays CSS-hidden until geometry and content are ready.
      // Chromium refuses to retain focus on an element that was hidden when
      // the upstream RichText plugin called focus(), so claim focus again as
      // part of the same opening transaction that makes the editor visible.
      this.quill?.root?.focus?.({ preventScroll: true });
      this.scheduleOpeningFocusClaim(sessionId);
      this.mindMap?.emit?.('yemind_text_edit_ready', {
        sessionId,
        uid: this.editingUid,
      });
      if (!this.isInserting) {
        window.requestAnimationFrame(() => {
          if (this.sessionCoordinator().isCurrent(sessionId)) {
            this.emitCurrentSelectionChange();
          }
        });
      }
    }
    return aligned;
  }

  /**
   * SiYuan's host can restore focus to its RootWebArea after the keyboard
   * handler which inserted a node has returned. Keep the opening transaction
   * alive for at most three painted frames and reclaim the Quill surface until
   * it actually owns focus. A real pointer action outside the editor cancels
   * the claim immediately so an intentional click is never stolen back.
   */
  private scheduleOpeningFocusClaim(sessionId: number): void {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;
    this.cancelOpeningFocusClaim();
    this.openingFocusSessionId = sessionId;
    this.openingFocusAttempts = 0;
    window.addEventListener('pointerdown', this.handleOpeningFocusPointerDown, true);
    const tick = (): void => {
      this.openingFocusFrame = null;
      if (
        !this.showTextEdit
        || !this.sessionCoordinator().isCurrent(sessionId)
        || this.openingFocusSessionId !== sessionId
      ) {
        this.cancelOpeningFocusClaim();
        return;
      }
      const root = this.quill?.root as HTMLElement | null;
      if (!root) {
        this.cancelOpeningFocusClaim();
        return;
      }
      if (document.activeElement !== root) {
        root.focus({ preventScroll: true });
        const range = this.range ?? this.pasteUseRange;
        if (range) {
          this.quill.setSelection(range.index, range.length, Quill.sources.SILENT);
        }
      }
      this.openingFocusAttempts += 1;
      if (document.activeElement === root || this.openingFocusAttempts >= 3) {
        this.cancelOpeningFocusClaim();
        return;
      }
      this.openingFocusFrame = window.requestAnimationFrame(tick);
    };
    this.openingFocusFrame = window.requestAnimationFrame(tick);
  }

  private cancelOpeningFocusClaim(): void {
    if (this.openingFocusFrame !== null) {
      window.cancelAnimationFrame?.(this.openingFocusFrame);
      this.openingFocusFrame = null;
    }
    this.openingFocusSessionId = 0;
    this.openingFocusAttempts = 0;
    window.removeEventListener?.('pointerdown', this.handleOpeningFocusPointerDown, true);
  }

  private reconcileEditorPlacement(sessionId: number): boolean {
    if (!this.showTextEdit || !this.sessionCoordinator().isCurrent(sessionId)) return false;
    const previousNode = this.node;
    const liveNode = resolveLiveRenderedNode(this.mindMap, previousNode, this.editingUid);
    if (liveNode) this.node = liveNode;
    const geometry = resolveRenderedTextRect(liveNode);
    if (!geometry) return false;
    this.lastValidNodeRect = snapshotRect(geometry.rect);
    this.lastRectSource = geometry.source;
    this.applyEditorGeometry(liveNode, geometry.rect);
    return this.commitOpeningPlacement(sessionId, geometry.rect);
  }

  /**
   * SVG layout and the detached HTML editor are painted by different runtime
   * layers. A render, fit, host resize or width draft can settle after the
   * event which opened the editor. Keep one session-scoped geometry monitor
   * alive while editing so every painted HTML frame remains anchored to the
   * current renderer node; stale callbacks from an earlier node are rejected
   * by the monotonically increasing session id.
   */
  private startPlacementMonitor(sessionId: number): void {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;
    if (this.placementMonitorFrame !== null) {
      window.cancelAnimationFrame(this.placementMonitorFrame);
      this.placementMonitorFrame = null;
    }
    const tick = (): void => {
      this.placementMonitorFrame = null;
      if (!this.showTextEdit || !this.sessionCoordinator().isCurrent(sessionId)) return;
      this.reconcileEditorPlacement(sessionId);
      this.placementMonitorFrame = window.requestAnimationFrame(tick);
    };
    this.placementMonitorFrame = window.requestAnimationFrame(tick);
  }

  /**
   * A newly inserted node can emit `node_dblclick` from inside the SVG render
   * stack before the browser has flushed its final group transform. The first
   * rectangle can therefore point at the canvas origin even though the node is
   * painted in the correct place. Re-resolve once on the next frame so the
   * HTML editor and SVG text always share the same final geometry.
   */
  private schedulePlacementStabilization(): void {
    this.cancelPlacementStabilization();
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;
    const uid = this.editingUid;
    this.placementFrame = window.requestAnimationFrame(() => {
      this.placementFrame = null;
      if (!this.showTextEdit || this.editingUid !== uid) return;
      this.updateTextEditNode();
    });
  }

  private bindPlacementTracking(): void {
    if (this.placementTracking) return;
    this.placementTracking = true;
    ['resize', 'scale', 'translate', 'node_tree_render_end', 'view_data_change'].forEach((name) => {
      this.mindMap?.on?.(name, this.handlePlacementInvalidation);
    });
    window.addEventListener('resize', this.handlePlacementInvalidation, { passive: true });

    const target = this.mindMap?.opt?.customInnerElsAppendTo as HTMLElement | null | undefined;
    if (typeof ResizeObserver === 'function' && target) {
      this.placementResizeObserver = new ResizeObserver(this.handlePlacementInvalidation);
      this.placementResizeObserver.observe(target);
    }
  }

  private unbindPlacementTracking(): void {
    if (!this.placementTracking) return;
    this.placementTracking = false;
    ['resize', 'scale', 'translate', 'node_tree_render_end', 'view_data_change'].forEach((name) => {
      this.mindMap?.off?.(name, this.handlePlacementInvalidation);
    });
    window.removeEventListener('resize', this.handlePlacementInvalidation);
    this.placementResizeObserver?.disconnect();
    this.placementResizeObserver = null;
    if (this.placementMonitorFrame !== null) {
      window.cancelAnimationFrame?.(this.placementMonitorFrame);
      this.placementMonitorFrame = null;
    }
  }

  private cancelPlacementStabilization(): void {
    if (this.placementFrame === null) return;
    window.cancelAnimationFrame?.(this.placementFrame);
    this.placementFrame = null;
  }

  private bindTextEditingKeyboard(): void {
    const root = this.quill?.root as HTMLElement | null;
    if (!root || root.dataset.yemindTextKeyboard === 'true') return;
    root.dataset.yemindTextKeyboard = 'true';
    root.addEventListener('keydown', (event: KeyboardEvent) => {
      if (
        (event.key === 'Delete' || event.key === 'Backspace')
        && !event.ctrlKey
        && !event.metaKey
        && !event.altKey
      ) {
        if (this.deleteCurrentSelection(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'a') return;
      event.preventDefault();
      event.stopPropagation();
      const length = editableTextLength(this.quill);
      this.quill.setSelection(0, length, Quill.sources.USER);
      this.range = { index: 0, length };
      this.pasteUseRange = this.range;
      this.emitEditingDiagnostic('select-all-shortcut', { length });
    }, true);
  }

  /**
   * Delete the active canvas text selection as one edit transaction.
   *
   * SiYuan can return DOM focus to the plugin host while leaving Quill's
   * native selection visible. Keeping this operation on the rich-text runtime
   * lets the editor-level keyboard router use the saved Quill range before a
   * host shortcut can reinterpret Delete as structural node deletion.
   */
  deleteCurrentSelection(key: 'Delete' | 'Backspace' = 'Delete'): boolean {
    if (!this.showTextEdit || !this.quill) return false;
    const selected = resolveNonCollapsedQuillRange(
      this.quill,
      this.range ?? this.lastRange,
    );
    if (!selected || selected.length <= 0) return false;
    this.quill.deleteText(selected.index, selected.length, Quill.sources.USER);
    this.quill.setSelection(selected.index, 0, Quill.sources.SILENT);
    this.range = null;
    this.lastRange = null;
    this.pasteUseRange = { index: selected.index, length: 0 };
    this.mindMap?.emit?.('rich_text_selection_change', false, null, null);
    this.emitEditingDiagnostic('selection-deleted', {
      key,
      index: selected.index,
      length: selected.length,
    });
    return true;
  }

  private emitEditingDiagnostic(action: string, details: Record<string, unknown> = {}): void {
    const host = this.textEditNode as HTMLElement | null;
    const rawNodeElement = this.node?._textData?.node?.node as SVGGraphicsElement | null | undefined;
    let rawNodeRect: DOMRect | null = null;
    try {
      rawNodeRect = rawNodeElement?.getBoundingClientRect?.() ?? null;
    } catch {
      rawNodeRect = null;
    }
    const hostRect = host?.getBoundingClientRect?.();
    const anchor = this.lastValidNodeRect;
    this.mindMap?.emit?.('yemind_text_edit_diagnostic', {
      action,
      details: {
        ...details,
        position: host?.style.position ?? '',
        hostLeft: hostRect ? Math.round(hostRect.left) : null,
        hostTop: hostRect ? Math.round(hostRect.top) : null,
        rawNodeLeft: rawNodeRect ? Math.round(rawNodeRect.left) : null,
        rawNodeTop: rawNodeRect ? Math.round(rawNodeRect.top) : null,
        rawNodeWidth: rawNodeRect ? Math.round(rawNodeRect.width) : null,
        rawNodeHeight: rawNodeRect ? Math.round(rawNodeRect.height) : null,
        anchorLeft: anchor ? Math.round(anchor.left) : null,
        anchorTop: anchor ? Math.round(anchor.top) : null,
        anchorWidth: anchor ? Math.round(anchor.width) : null,
        anchorHeight: anchor ? Math.round(anchor.height) : null,
        textElementConnected: typeof rawNodeElement?.isConnected === 'boolean' ? rawNodeElement.isConnected : null,
        editingUidLength: this.editingUid.length,
        rectSource: this.lastRectSource,
      },
    });
  }

  initQuillEditor(): void {
    registerYeMindFormats();
    const plugin = this;
    this.bindCanvasInteractionIsolation();
    this.quill = new Quill(this.textEditNode, {
      modules: {
        toolbar: false,
        keyboard: {
          bindings: {
            enter: {
              key: 'Enter',
              handler(): void {
                // Mind-map nodes finish editing with Enter; Shift+Enter inserts a line.
              },
            },
            shiftEnter: {
              key: 'Enter',
              shiftKey: true,
              handler(this: any, range: any, context: any): void {
                const lineFormats = Object.keys(context.format).reduce((formats: Record<string, unknown>, format) => {
                  if (this.quill.scroll.query(format, Scope.BLOCK) && !Array.isArray(context.format[format])) {
                    formats[format] = context.format[format];
                  }
                  return formats;
                }, {});
                const delta = new Delta().retain(range.index).delete(range.length).insert('\n', lineFormats);
                this.quill.updateContents(delta, Quill.sources.USER);
                this.quill.setSelection(range.index + 1, Quill.sources.SILENT);
                this.quill.focus();
                Object.keys(context.format).forEach((name) => {
                  if (lineFormats[name] != null || Array.isArray(context.format[name]) || name === 'code' || name === 'link') return;
                  this.quill.format(name, context.format[name], Quill.sources.USER);
                });
              },
            },
            tab: {
              key: 9,
              handler(this: any, range: any, context: any): boolean {
                if (!context.format?.['code-block']) return false;
                const width = Number(plugin.pluginOpt?.codeBlockTabSize) === 4 ? 4 : 2;
                const spaces = ' '.repeat(width);
                this.quill.insertText(range.index, spaces, Quill.sources.USER);
                this.quill.setSelection(range.index + spaces.length, 0, Quill.sources.SILENT);
                return false;
              },
            },
          },
        },
      },
      formats: [...YEMIND_RICH_TEXT_FORMATS],
      theme: 'snow',
    });
    const quillInstance = this.quill;
    const quillSessionId = this.sessionCoordinator().snapshot().id;

    this.quill.root.addEventListener('copy', (event: ClipboardEvent) => {
      writeQuillSelectionToClipboard(this.quill, event, this.range ?? this.lastRange);
    });
    this.quill.root.addEventListener('cut', (event: ClipboardEvent) => {
      const selected = resolveNonCollapsedQuillRange(
        this.quill,
        this.range ?? this.lastRange,
      );
      if (
        !selected
        || !writeQuillSelectionToClipboard(this.quill, event, selected)
      ) return;
      this.quill.deleteText(
        selected.index,
        selected.length,
        Quill.sources.USER,
      );
      this.quill.setSelection(
        selected.index,
        0,
        Quill.sources.SILENT,
      );
      this.range = null;
      this.lastRange = null;
      this.pasteUseRange = { index: selected.index, length: 0 };
      this.mindMap?.emit?.(
        'rich_text_selection_change',
        false,
        null,
        null,
      );
      this.emitEditingDiagnostic('selection-cut', {
        index: selected.index,
        length: selected.length,
      });
    });

    this.quill.on('selection-change', (range: any) => {
      if (
        this.quill !== quillInstance
        || !this.sessionCoordinator().isCurrent(quillSessionId)
      ) return;
      if (this.isInserting) {
        this.isInserting = false;
        return;
      }
      this.lastRange = this.range;
      this.range = null;
      if (range) {
        this.pasteUseRange = range;
        const bounds = this.quill.getBounds(range.index, range.length);
        const rectInfo = this.selectionViewportRect(bounds);
        const formatInfo = this.quill.getFormat(range.index, range.length);
        const hasRange = range.length > 0;
        if (hasRange) this.range = range;
        const selectionSession = hasRange
          ? this.sessionCoordinator().acceptSelection(quillSessionId)
          : null;
        this.mindMap.emit(
          'rich_text_selection_change',
          hasRange,
          rectInfo,
          formatInfo,
          selectionSession,
        );
      } else {
        this.mindMap.emit('rich_text_selection_change', false, null, null);
      }
    });

    this.quill.on('text-change', (_delta: unknown, _oldDelta: unknown, source: string) => {
      if (source === Quill.sources.USER) {
        markNodeTextEditedData(this.node?.nodeData?.data ?? this.node?.getData?.());
      }
      this.sessionCoordinator().advanceRevision(quillSessionId);
      this.emitLiveTextEditChange(this.pasteTransactionPending ? 'paste' : 'input');
    });

    this.quill.clipboard.addMatcher(Node.ELEMENT_NODE, (_node: Node, delta: any) => {
      const ops: any[] = [];
      const style = this.getPasteTextStyle();
      delta.ops.forEach((op: any) => {
        if (op.insert && typeof op.insert === 'string') {
          ops.push({ attributes: { ...style }, insert: this.formatPasteText(op.insert) });
        }
      });
      delta.ops = ops;
      return delta;
    });

    this.quill.root.addEventListener('paste', (event: ClipboardEvent) => {
      this.pasteTransactionPending = true;
      if (event.clipboardData?.files?.length) event.preventDefault();
      // Quill handles the same event synchronously in its bubble listener and
      // emits `text-change` before this task ends. Keep the marker alive for
      // that one transaction, then clear it without scheduling a second render.
      queueMicrotask(() => {
        this.pasteTransactionPending = false;
      });
    }, true);
  }

  private emitLiveTextEditChange(reason: 'paste' | 'input'): void {
    this.mindMap.emit('node_text_edit_change', {
      node: this.node,
      text: this.getEditText(),
      richText: true,
      reason,
    });
  }


  private bindCanvasInteractionIsolation(): void {
    const host = this.textEditNode as HTMLElement | null;
    if (!host || host.dataset.yemindInteractionIsolation === 'true') return;
    host.dataset.yemindInteractionIsolation = 'true';
    const stopCanvasGesture = (event: Event): void => {
      if (event.type === 'click' && event instanceof MouseEvent) {
        const anchor = event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[data-yemind-link="true"]')
          : null;
        if (anchor) {
          event.preventDefault();
          // Explicit modifier gestures continue to the editor-level navigator;
          // ordinary clicks stay inside the editable text transaction.
          if (shouldActivateRichTextLink(event)) return;
        }
      }
      event.stopPropagation();
    };
    [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'mousedown',
      'mouseup',
      'click',
      'dblclick',
      'contextmenu',
    ].forEach((type) => host.addEventListener(type, stopCanvasGesture));
  }

  formatPasteText(text: string): string {
    const { isSmm, data } = checkSmmFormatData(text) as any;
    if (isSmm && data?.[0]?.data) return getTextFromHtml(data[0].data.text);
    return text;
  }
}
