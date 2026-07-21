import BaseRichText from 'simple-mind-map/src/plugins/RichText';
import { checkSmmFormatData, getTextFromHtml, nodeRichTextToTextWithWrap } from 'simple-mind-map/src/utils';
import Quill from 'quill';
import Delta from 'quill-delta';
import { Scope } from 'parchment';

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

    this.quill.root.addEventListener('copy', (event: ClipboardEvent) => {
      event.preventDefault();
      const selection = window.getSelection();
      const original = selection?.toString() ?? '';
      try {
        const range = selection?.getRangeAt(0);
        if (!range) throw new Error('No selection');
        const div = document.createElement('div');
        div.appendChild(range.cloneContents());
        event.clipboardData?.setData('text/plain', nodeRichTextToTextWithWrap(div.innerHTML));
      } catch {
        event.clipboardData?.setData('text/plain', original);
      }
    });

    this.quill.on('selection-change', (range: any) => {
      if (this.isInserting) {
        this.isInserting = false;
        return;
      }
      this.lastRange = this.range;
      this.range = null;
      if (range) {
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
        const formatInfo = this.quill.getFormat(range.index, range.length);
        const hasRange = range.length > 0;
        if (hasRange) this.range = range;
        this.mindMap.emit('rich_text_selection_change', hasRange, rectInfo, formatInfo);
      } else {
        this.mindMap.emit('rich_text_selection_change', false, null, null);
      }
    });

    this.quill.on('text-change', () => {
      this.mindMap.emit('node_text_edit_change', {
        node: this.node,
        text: this.getEditText(),
        richText: true,
      });
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
    const stopCanvasGesture = (event: Event): void => event.stopPropagation();
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
