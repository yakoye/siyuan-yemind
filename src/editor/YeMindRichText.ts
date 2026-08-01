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
  editorOverlayPosition,
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
  private placementTracking = false;
  private placementResizeObserver: ResizeObserver | null = null;
  private lastAlignedSessionId = 0;
  private openingFocusFrame: number | null = null;
  private openingFocusSessionId = 0;
  private openingFocusRoot: HTMLElement | null = null;
  /**
   * True once the current opening transaction has committed a determinate
   * width/height for the edit host. `focus()` is called synchronously by the
   * upstream base class before that has happened; while this is false, focus
   * intent is only recorded (see `pendingFocusIntent`), never applied, so
   * Quill cannot claim focus/selection on a host the CSS gate still hides.
   */
  private openingGeometryReady = false;
  private pendingFocusIntent: { selectAll: boolean } | null = null;
  private hostContentWidth = 0;
  private hostContentHeight = 0;
  private readonly handlePlacementInvalidation = (): void => {
    if (!this.showTextEdit) return;
    this.schedulePlacementStabilization();
  };
  private readonly handleOpeningFocusPointerDown = (_event: PointerEvent): void => {
    // Any real pointer action is user intent. Inside the editor the browser
    // focuses Quill itself; outside it YeMind must not steal focus back.
    this.cancelOpeningFocusClaim();
  };
  private readonly handleOpeningFocusWindowBlur = (): void => {
    // Never fight an OS-level application/window switch.
    this.cancelOpeningFocusClaim();
  };
  private readonly handleOpeningFocusOut = (): void => {
    const sessionId = this.openingFocusSessionId;
    if (
      !sessionId
      || !this.showTextEdit
      || !this.sessionCoordinator().isCurrent(sessionId)
    ) return;
    this.scheduleOpeningFocusReclaim(sessionId);
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
    // `host.dataset.yemindGeometryReady` is set by the caller from the same
    // structural check (editorStructurallyReady) immediately before this
    // runs. Re-measuring a live getBoundingClientRect() here duplicated that
    // gate with the browser's own paint, which can lag or never converge for
    // some node shapes — the exact "double-click and no cursor appears" bug.
    return sessions.markEditorReady(current.id, {
      geometryReady: Boolean(host && host.dataset.yemindGeometryReady === 'true'),
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
    const sourceNode = params?.node ?? null;
    const requestedUid = renderedNodeUid(sourceNode)
      || renderedNodeUid(resolveLiveRenderedNode(this.mindMap, sourceNode));
    if (this.showTextEdit) {
      const session = this.sessionCoordinator().snapshot();
      const sameNode = Boolean(requestedUid) && session.uid === requestedUid;
      if (sameNode && session.phase === 'active') {
        // Already editing this exact node: reclaim focus instead of tearing
        // the transaction down and losing in-progress geometry/content.
        this.focus();
        return;
      }
      if (!sameNode) return;
      // Same node, but the previous opening transaction never reached
      // 'active' (stuck half-open: invisible/unfocusable host, dblclick
      // otherwise silently ignored forever). Discard it without committing
      // any text or history, then fall through to open a fresh session.
      this.abortOpeningSession('reopen-half-open-session');
    }
    this.openingGeometryReady = false;
    this.pendingFocusIntent = null;
    const pendingHost = this.textEditNode as HTMLElement | null;
    if (pendingHost) pendingHost.dataset.yemindGeometryReady = 'false';
    const uid = requestedUid;
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
    // A newly inserted node can emit node_dblclick before the browser flushes
    // its final group transform (see schedulePlacementStabilization's own
    // comment). One synchronous pass above plus one more scheduled frame here
    // covers that without a permanent per-frame monitor: every other geometry
    // change is already covered by bindPlacementTracking's event subscriptions
    // (resize/scale/translate/node_tree_render_end/view_data_change) and by the
    // width-drag frame loop in liveNodeWidthLayout.ts.
    this.schedulePlacementStabilization();
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
      this.openingGeometryReady = false;
      this.pendingFocusIntent = null;
    }
  }

  /**
   * Recover from a previous opening transaction that never became active
   * (host stayed CSS-hidden and unfocusable). Only discards in-flight
   * open-session state; never commits text and never touches undo history.
   */
  private abortOpeningSession(_reason: string): void {
    this.unbindPlacementTracking();
    this.cancelPlacementStabilization();
    this.cancelOpeningFocusClaim();
    const host = this.textEditNode as HTMLElement | null;
    if (host) {
      host.style.display = 'none';
      host.dataset.yemindGeometryReady = 'false';
    }
    this.setIsShowTextEdit(false);
    this.node = null;
    this.range = null;
    this.lastRange = null;
    this.lastAlignedSessionId = 0;
    this.openingGeometryReady = false;
    this.pendingFocusIntent = null;
    this.lastValidNodeRect = null;
    this.lastRectSource = 'none';
    const sessions = this.sessionCoordinator();
    sessions.close(sessions.snapshot().id);
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
      this.openingGeometryReady = false;
      this.pendingFocusIntent = null;
    }
  }

  setQuillContainerMinHeight(minHeight: number): void {
    const editor = (this.textEditNode as HTMLElement | null)?.querySelector<HTMLElement>('.ql-editor');
    if (editor) editor.style.minHeight = `${Math.max(0, Number(minHeight) || 0)}px`;
  }

  /**
   * The upstream base class calls `this.focus(start)` synchronously while
   * still inside `showEditText`, before the opening transaction has a
   * determinate width/height (see `openingGeometryReady`). Record the edit
   * intent now — using the already-reliable `isInserting` flag rather than
   * inferring "select all" from `start === 0` (upstream only ever passes 0
   * for that same isInserting case once selectTextOnEnterEditText is false,
   * but branching on the literal number instead of the real flag is fragile
   * and easy to misread as "place caret at position 0") — and only touch the
   * DOM once geometry has actually committed, so Quill never claims focus or
   * a visible selection on a host the CSS gate still hides.
   */
  focus(_start?: number): void {
    if (!this.quill) return;
    const liveNode = resolveLiveRenderedNode(this.mindMap, this.node, this.editingUid);
    if (liveNode) this.node = liveNode;
    const data = this.node?.nodeData?.data ?? this.node?.getData?.() ?? null;
    const selectAll = this.isInserting || isPristineNodeTextData(data);
    this.pendingFocusIntent = { selectAll };
    if (!this.openingGeometryReady) return;
    this.applyPendingFocusIntent();
  }

  private applyPendingFocusIntent(): void {
    if (!this.pendingFocusIntent || !this.quill) return;
    const { selectAll } = this.pendingFocusIntent;
    this.pendingFocusIntent = null;
    const length = editableTextLength(this.quill);
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
    // An absolutely/fixed-positioned block with only min/max-width still
    // resolves `width: auto` by shrink-to-fit, which can round the content
    // box to a hair narrower or wider than the static SVG text's own layout
    // width. That divergence is enough to move the last word of a line
    // across the wrap boundary the moment editing opens, even though nothing
    // was typed. Writing the exact same content width to `width` removes
    // that ambiguity: the host box is deterministic before Quill's own
    // layout ever has a chance to disagree with the static text.
    const hostWidth = originWidth + this.textNodePaddingX * 2;
    host.style.width = `${hostWidth}px`;
    host.style.minWidth = `${hostWidth}px`;
    host.style.minHeight = `${originHeight}px`;
    this.hostContentWidth = hostWidth;
    this.hostContentHeight = originHeight;
    // The upstream plugin only sets max-width once, at the moment editing
    // opens (RichText.js#showEditText). If the node's wrap boundary changes
    // while editing stays open — most commonly a width-drag performed on an
    // already-selected/editing node — that stale max-width is never
    // refreshed. Quill then keeps wrapping the live text at the OLD width
    // while the static SVG text (which recomputes on every commit) wraps at
    // the CURRENT, narrower one, so the two layers can show completely
    // different line breaks stacked on top of each other. Keep max-width
    // live on every geometry sync, not just at open.
    const hasCustomWidth = Boolean(node?.hasCustomWidth?.());
    const customTextWidth = Number(node?.customTextWidth);
    const defaultWrapWidth = Number(this.mindMap?.opt?.textAutoWrapWidth);
    const wrapWidth = hasCustomWidth && Number.isFinite(customTextWidth) && customTextWidth > 0
      ? customTextWidth
      : (Number.isFinite(defaultWrapWidth) && defaultWrapWidth > 0 ? defaultWrapWidth : null);
    if (wrapWidth !== null) {
      host.style.maxWidth = `${wrapWidth + this.textNodePaddingX * 2}px`;
    }
    this.setQuillContainerMinHeight(originHeight);
    this.applyEditorHorizontalMargin(node, rect);
    this.normalizeEditorPlacement(rect);
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
    const style = window.getComputedStyle(host);
    const marginLeft = Number.parseFloat(style.marginLeft) || 0;
    const marginTop = Number.parseFloat(style.marginTop) || 0;
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
    const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
    if (!target || target === document.body || host.parentElement === document.body) {
      host.style.position = 'fixed';
      host.style.left = `${nodeRect.left - marginLeft - borderLeft - paddingLeft}px`;
      host.style.top = `${nodeRect.top - marginTop - borderTop - paddingTop}px`;
      return;
    }
    const containingBlock = host.offsetParent instanceof HTMLElement
      ? host.offsetParent
      : target;
    const blockRect = containingBlock.getBoundingClientRect();
    const position = editorOverlayPosition(nodeRect, {
      left: blockRect.left,
      top: blockRect.top,
      width: blockRect.width,
      height: blockRect.height,
      offsetWidth: containingBlock.offsetWidth,
      offsetHeight: containingBlock.offsetHeight,
      clientLeft: containingBlock.clientLeft,
      clientTop: containingBlock.clientTop,
      scrollLeft: containingBlock.scrollLeft,
      scrollTop: containingBlock.scrollTop,
    }, {
      marginLeft,
      marginTop,
      paddingLeft,
      paddingTop,
      borderLeft,
      borderTop,
    });
    host.style.position = 'absolute';
    host.style.left = `${position.left}px`;
    host.style.top = `${position.top}px`;
  }

  /**
   * Structural readiness replaces the old pixel-alignment gate. Two
   * independent HTML/SVG layout engines can legitimately disagree by a
   * sub-pixel amount forever for some node shapes (custom width, icon/todo
   * prefixes, certain zoom levels) without that meaning the editor is the
   * wrong live surface — that was a real bug: some nodes' editor rect never
   * converged with the target rect, so `data-yemind-geometry-ready` stayed
   * 'false' forever and the CSS gate kept the host permanently invisible and
   * (in Chromium) unfocusable, i.e. "double-click and nothing happens".
   * Readiness now depends only on facts we already know synchronously from
   * the geometry we ourselves computed and wrote in `applyEditorGeometry`,
   * not on a fresh, possibly-never-matching browser measurement.
   */
  private editorStructurallyReady(host: HTMLElement, editor: HTMLElement | null): boolean {
    if (!host.isConnected || !editor || !editor.isConnected) return false;
    if (!(this.hostContentWidth > 0.5) || !(this.hostContentHeight > 0.5)) return false;
    return this.editorContentReady();
  }

  private commitOpeningPlacement(sessionId: number, targetRect: DOMRect): boolean {
    const sessions = this.sessionCoordinator();
    if (!sessions.isCurrent(sessionId)) return false;
    const host = this.textEditNode as HTMLElement | null;
    if (!host) return false;
    const editor = host.querySelector<HTMLElement>('.ql-editor') ?? null;
    // Diagnostic-only from here on (see yemind_text_edit_diagnostic below):
    // never used to gate visibility, focus or the active phase.
    const aligned = editorContentRectAligned(editor?.getBoundingClientRect?.(), targetRect);
    const previousPhase = sessions.snapshot().phase;
    const wasAlreadyActive = previousPhase === 'active';
    const structurallyReady = wasAlreadyActive || this.editorStructurallyReady(host, editor);
    host.dataset.yemindEditSession = String(sessionId);
    // Once the one-time live-text handoff has happened (the session reached
    // 'active'), a later per-keystroke miss must not flip this back to
    // 'false': that attribute drives the CSS rule that hides (and, in
    // Chromium, unfocuses) the edit host, which would silently swallow every
    // keystroke typed after the miss. Position still keeps updating via
    // applyEditorGeometry/normalizeEditorPlacement on every commit; only the
    // visibility/focus gate becomes sticky once active.
    host.dataset.yemindGeometryReady = structurallyReady ? 'true' : 'false';
    const snapshot = this.markCurrentEditorReady();
    if (
      structurallyReady
      && snapshot?.phase === 'active'
      && previousPhase !== 'active'
      && this.lastAlignedSessionId !== sessionId
    ) {
      this.lastAlignedSessionId = sessionId;
      this.openingGeometryReady = true;
      // The edit host stays CSS-hidden until geometry and content are ready.
      // Apply the focus/selection intent `focus()` recorded earlier as part
      // of the same opening transaction that makes the editor visible — the
      // one authoritative focus claim for this transaction.
      this.applyPendingFocusIntent();
      // Chromium can still drop a focus claimed while the host was hidden.
      // scheduleOpeningFocusClaim below is a single, bounded fallback check
      // on the next frame, never a repeated retry loop.
      this.scheduleOpeningFocusClaim(sessionId);
      this.mindMap?.emit?.('yemind_text_edit_ready', {
        sessionId,
        uid: this.editingUid,
        aligned,
      });
      // `isInserting` has now served its only purpose: deciding (inside
      // focus()/applyPendingFocusIntent) whether this one opening
      // transaction should auto-show the toolbar and select all text.
      this.isInserting = false;
    }
    return structurallyReady;
  }

  /**
   * Start a focus-ownership lease for the opening edit transaction. SiYuan
   * can restore its RootWebArea focus after YeMind's first painted frame, so
   * a one-frame retry is not a sufficient handoff contract. The lease reacts
   * to actual focus loss and ends on the first explicit pointer/key action.
   */
  private scheduleOpeningFocusClaim(sessionId: number): void {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;
    this.cancelOpeningFocusClaim();
    this.openingFocusSessionId = sessionId;
    this.openingFocusRoot = this.quill?.root as HTMLElement | null;
    window.addEventListener('pointerdown', this.handleOpeningFocusPointerDown, true);
    window.addEventListener('blur', this.handleOpeningFocusWindowBlur);
    this.openingFocusRoot?.addEventListener('focusout', this.handleOpeningFocusOut);
    this.scheduleOpeningFocusReclaim(sessionId);
  }

  private scheduleOpeningFocusReclaim(sessionId: number): void {
    if (this.openingFocusFrame !== null) {
      window.cancelAnimationFrame?.(this.openingFocusFrame);
    }
    this.openingFocusFrame = window.requestAnimationFrame(() => {
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
      if (!root || !root.isConnected) {
        this.cancelOpeningFocusClaim();
        return;
      }
      if (document.activeElement !== root) {
        root.focus({ preventScroll: true });
        const range = this.range ?? this.pasteUseRange;
        if (range) this.quill.setSelection(range.index, range.length, Quill.sources.SILENT);
      }
    });
  }

  private cancelOpeningFocusClaim(): void {
    if (this.openingFocusFrame !== null) {
      window.cancelAnimationFrame?.(this.openingFocusFrame);
      this.openingFocusFrame = null;
    }
    this.openingFocusSessionId = 0;
    this.openingFocusRoot?.removeEventListener('focusout', this.handleOpeningFocusOut);
    this.openingFocusRoot = null;
    window.removeEventListener?.('pointerdown', this.handleOpeningFocusPointerDown, true);
    window.removeEventListener?.('blur', this.handleOpeningFocusWindowBlur);
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
      // A key reaching Quill proves the opening focus handoff succeeded.
      // From this point normal browser/user focus rules take over.
      this.cancelOpeningFocusClaim();
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
        // Quill's Selection#update() deliberately emits the caret move that
        // follows typing with Emitter.sources.SILENT and skips the public
        // 'selection-change' event for it (node_modules/quill/core/selection.js).
        // `this.range`/`this.lastRange` are only refreshed from that event, so
        // without this they keep whatever was selected *before* the user
        // started typing (e.g. the initial double-click select-all, or an
        // earlier real click). Delete/Backspace/copy/cut below fall back to
        // that stale, often much larger range instead of acting at the real
        // caret, which can silently delete most of the node's text. Any
        // user-driven text change invalidates the cached selection.
        this.range = null;
        this.lastRange = null;
      }
      this.sessionCoordinator().advanceRevision(quillSessionId);
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
      if (event.clipboardData?.files?.length) event.preventDefault();
    }, true);
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
