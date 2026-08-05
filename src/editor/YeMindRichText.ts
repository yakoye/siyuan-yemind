import BaseRichText from 'simple-mind-map/src/plugins/RichText';
import { checkSmmFormatData, getTextFromHtml, nodeRichTextToTextWithWrap } from 'simple-mind-map/src/utils';
import Quill from 'quill';
import Delta from 'quill-delta';
import { Scope } from 'parchment';
import { markNodeTextEditedData } from './textEditingPolicy';
import { structuredOutlineIsRichHtml } from './structuredOutlineDocument';
import { clearNodeClipboard } from './nodeClipboard';
import { normalizeTreeForUpstreamRichTextInPlace } from '../core/upstreamRichTextData';

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

export interface QuillRange {
  index: number;
  length: number;
}

/**
 * Pick the selection to restore when the editor reclaims focus the host took.
 *
 * Collapsing to the end of the text is the last resort, not the default. The
 * previous code reached it in the common case — `range` only ever holds a
 * non-collapsed selection and `quill.getSelection()` is null while focus is
 * elsewhere — which silently destroyed the full selection a freshly inserted
 * node opens with.
 */
export function resolveFocusRestoreRange(
  candidates: Array<QuillRange | null | undefined>,
  fallbackIndex: number,
): QuillRange {
  for (const candidate of candidates) {
    if (candidate && Number.isFinite(candidate.index)) {
      return { index: candidate.index, length: Number(candidate.length) || 0 };
    }
  }
  return { index: Math.max(0, Number(fallbackIndex) || 0), length: 0 };
}

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
  return String(nodeData?.text ?? '') === payload.text
    && Boolean(nodeData?.richText) === payload.richText;
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
  const discardWhitespace = (): void => {
    while (template.content.firstChild?.nodeType === Node.TEXT_NODE
      && !(template.content.firstChild.textContent ?? '').trim()) template.content.firstChild.remove();
    while (template.content.lastChild?.nodeType === Node.TEXT_NODE
      && !(template.content.lastChild.textContent ?? '').trim()) template.content.lastChild.remove();
  };
  const isEmptyBlock = (node: ChildNode | null): node is HTMLElement => (
    node instanceof HTMLElement
    && (node.tagName === 'P' || node.tagName === 'DIV')
    && !(node.textContent ?? '').replace(/\u00a0/g, ' ').trim()
    && !node.querySelector('img,svg,mjx-container,.ql-formula,[data-formula],iframe,video,audio')
  );
  discardWhitespace();
  while (isEmptyBlock(template.content.firstChild)) {
    template.content.firstChild.remove();
    discardWhitespace();
  }
  while (isEmptyBlock(template.content.lastChild)) {
    template.content.lastChild.remove();
    discardWhitespace();
  }
  return template.innerHTML.trim();
}

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
    text: richText ? source : (plain.trim().length > 0 ? plain : ''),
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
      node.setAttribute('data-language', typeof value === 'string' && value.trim() ? value.trim() : 'plain');
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
 * Thin compatibility adapter over the official simple-mind-map RichText
 * plugin. Upstream exclusively owns editor opening, placement, focus and
 * teardown. YeMind only adds persisted formats and clipboard semantics.
 */
export default class YeMindRichText extends (BaseRichText as any) {
  static instanceName = 'richText';

  private static activeFocusOwner: YeMindRichText | null = null;

  private static activeEditSession: YeMindRichText | null = null;

  private ownsEditFocus = false;

  /**
   * The last selection Quill is known to have had. Quill reports caret moves
   * that follow typing as suppressed events, so this is refreshed from both
   * `selection-change` and `text-change` rather than from either alone.
   */
  private lastKnownRange: { index: number; length: number } | null = null;

  bindEvent(): void {
    super.bindEvent();
    this.beginEditFocusOwnership = this.beginEditFocusOwnership.bind(this);
    this.releaseEditFocusOwnership = this.releaseEditFocusOwnership.bind(this);
    this.handleHostFocusIn = this.handleHostFocusIn.bind(this);
    this.handleFocusOwnershipPointerDown = this.handleFocusOwnershipPointerDown.bind(this);
    this.mindMap.on('before_show_text_edit', this.beginEditFocusOwnership);
    this.mindMap.on('hide_text_edit', this.releaseEditFocusOwnership);
    document.addEventListener('focusin', this.handleHostFocusIn, true);
    window.addEventListener('pointerdown', this.handleFocusOwnershipPointerDown, true);
  }

  unbindEvent(): void {
    super.unbindEvent();
    this.releaseEditFocusOwnership();
    if (YeMindRichText.activeEditSession === this) {
      YeMindRichText.activeEditSession = null;
    }
    this.mindMap.off('before_show_text_edit', this.beginEditFocusOwnership);
    this.mindMap.off('hide_text_edit', this.releaseEditFocusOwnership);
    document.removeEventListener('focusin', this.handleHostFocusIn, true);
    window.removeEventListener('pointerdown', this.handleFocusOwnershipPointerDown, true);
  }

  private beginEditFocusOwnership(): void {
    const previous = YeMindRichText.activeEditSession;
    if (previous && previous !== this) {
      if (previous.showTextEdit) previous.hideEditText();
      else previous.releaseEditFocusOwnership();
    }
    YeMindRichText.activeEditSession = this;
    YeMindRichText.activeFocusOwner = this;
    this.ownsEditFocus = true;
  }

  private releaseEditFocusOwnership(): void {
    this.ownsEditFocus = false;
    if (YeMindRichText.activeFocusOwner === this) {
      YeMindRichText.activeFocusOwner = null;
    }
    if (!this.showTextEdit && YeMindRichText.activeEditSession === this) {
      YeMindRichText.activeEditSession = null;
    }
  }

  private handleFocusOwnershipPointerDown(event: PointerEvent): void {
    if (!this.ownsEditFocus) return;
    const root = this.quill?.root as HTMLElement | null | undefined;
    const target = event.target;
    if (root && target instanceof Node && root.contains(target)) return;
    this.releaseEditFocusOwnership();
  }

  private handleHostFocusIn(event: FocusEvent): void {
    if (!this.showTextEdit || !this.ownsEditFocus) return;
    const root = this.quill?.root as HTMLElement | null | undefined;
    const target = event.target;
    if (!root || (target instanceof Node && root.contains(target))) return;
    // Reclaiming focus must restore the selection the user actually had.
    // `this.range` only ever holds a *non-collapsed* selection and is cleared
    // on every keystroke, and `quill.getSelection()` returns null while focus
    // is elsewhere -- so collapsing to the end of the text was the common
    // case, not the exception. It silently destroyed the full selection a
    // freshly inserted node opens with, which is why typing into a brand new
    // node appended to `新节点` instead of replacing it whenever the host
    // touched focus first.
    const range = resolveFocusRestoreRange(
      [this.range, this.pasteUseRange, this.quill?.getSelection?.(), this.lastKnownRange],
      this.quill.getLength(),
    );
    root.focus({ preventScroll: true });
    this.quill.setSelection(range.index, range.length, Quill.sources.SILENT);
  }

  handleDataToRichTextOnInit(): void {
    const tree = this.mindMap.renderer.renderTree ?? this.mindMap.opt.data;
    if (tree) normalizeTreeForUpstreamRichTextInPlace(tree);
  }

  handleSetData<T>(data: T): T {
    if (data && typeof data === 'object') normalizeTreeForUpstreamRichTextInPlace(data as any);
    return data;
  }

  initQuillEditor(): void {
    registerYeMindFormats();
    const plugin = this;
    this.quill = new Quill(this.textEditNode, {
      modules: {
        toolbar: false,
        keyboard: {
          bindings: {
            enter: {
              key: 'Enter',
              handler(): void {},
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
              },
            },
            tab: {
              key: 9,
              handler(this: any, range: any, context: any): boolean {
                if (!context.format?.['code-block']) return false;
                const spaces = ' '.repeat(Number(plugin.pluginOpt?.codeBlockTabSize) === 4 ? 4 : 2);
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

    this.quill.root.addEventListener('copy', (event: ClipboardEvent) => {
      writeQuillSelectionToClipboard(this.quill, event, this.range ?? this.lastRange);
    });
    this.quill.root.addEventListener('cut', (event: ClipboardEvent) => {
      const selected = resolveNonCollapsedQuillRange(this.quill, this.range ?? this.lastRange);
      if (!selected || !writeQuillSelectionToClipboard(this.quill, event, selected)) return;
      this.quill.deleteText(selected.index, selected.length, Quill.sources.USER);
      this.quill.setSelection(selected.index, 0, Quill.sources.SILENT);
      this.range = null;
      this.lastRange = null;
      this.pasteUseRange = { index: selected.index, length: 0 };
      this.mindMap.emit('rich_text_selection_change', false, null, null);
    });

    this.quill.on('selection-change', (range: any) => {
      // Recorded before the `isInserting` short-circuit below: that branch
      // exists only to keep the insertion's own initial selection from opening
      // the formatting toolbar, but it used to drop the selection from every
      // record too, leaving nothing to restore when the host stole focus.
      if (range) this.lastKnownRange = { index: range.index, length: range.length };
      if (this.isInserting) {
        this.isInserting = false;
        this.pasteUseRange = range ?? this.pasteUseRange;
        return;
      }
      this.lastRange = this.range;
      this.range = null;
      if (!range) {
        this.mindMap.emit('rich_text_selection_change', false, null, null);
        return;
      }
      this.pasteUseRange = range;
      const bounds = this.quill.getBounds(range.index, range.length);
      const rect = this.textEditNode.getBoundingClientRect();
      const rectInfo = {
        left: bounds.left + rect.left,
        top: bounds.top + rect.top,
        right: bounds.right + rect.left,
        bottom: bounds.bottom + rect.top,
        width: bounds.width,
      };
      const hasRange = range.length > 0;
      if (hasRange) this.range = range;
      this.mindMap.emit(
        'rich_text_selection_change',
        hasRange,
        rectInfo,
        this.quill.getFormat(range.index, range.length),
      );
    });

    this.quill.on('text-change', (_delta: unknown, _oldDelta: unknown, source: string) => {
      if (source === Quill.sources.USER) {
        markNodeTextEditedData(this.node?.nodeData?.data ?? this.node?.getData?.());
        this.range = null;
        this.lastRange = null;
        // Quill emits the caret move that follows typing as a suppressed event,
        // so `selection-change` alone would leave `lastKnownRange` pointing at
        // whatever was selected *before* the user started typing -- restoring
        // that after a focus steal would re-select text the user had already
        // replaced, and the next keystroke would wipe it.
        this.lastKnownRange = this.quill?.getSelection?.() ?? null;
      }
      this.mindMap.emit('node_text_edit_change', {
        node: this.node,
        text: this.getEditText(),
        richText: true,
      });
    });

    this.quill.clipboard.addMatcher(Node.ELEMENT_NODE, (_node: Node, delta: any) => {
      const style = this.getPasteTextStyle();
      delta.ops = delta.ops.flatMap((op: any) => (
        op.insert && typeof op.insert === 'string'
          ? [{ attributes: { ...style }, insert: this.formatPasteText(op.insert) }]
          : []
      ));
      return delta;
    });
    this.quill.root.addEventListener('paste', (event: ClipboardEvent) => {
      if (event.clipboardData?.files?.length) event.preventDefault();
    }, true);
  }

  formatPasteText(text: string): string {
    const { isSmm, data } = checkSmmFormatData(text) as any;
    if (isSmm && data?.[0]?.data) return getTextFromHtml(data[0].data.text);
    return text;
  }
}
