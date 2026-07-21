import type { YeMindCommands } from '../core/commands';
import { YEMIND_FONT_VALUES, YEMIND_SIZE_VALUES } from './YeMindRichText';
import {
  isClozeFormat,
  nextToggleFormat,
  type RichTextBooleanFormat,
} from './richTextActions';

export interface RichTextSelectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width?: number;
}

export interface RichTextToolbarCallbacks {
  onFormula?: () => void;
  onLink?: () => void;
  onCodeBlock?: () => void;
  onAction?: (action: string) => void;
}

function option(value: string, label: string): string {
  return `<option value="${value.replaceAll('&', '&amp;').replaceAll('\"', '&quot;')}">${label}</option>`;
}

function sizeOptions(): string {
  return YEMIND_SIZE_VALUES.map((value) => option(value, value.replace('px', ''))).join('');
}

function fontOptions(): string {
  const labels = ['无衬线', '衬线', '微软雅黑', '宋体', '等宽'];
  return YEMIND_FONT_VALUES.map((value, index) => option(value, labels[index] ?? value)).join('');
}

export class RichTextToolbar {
  private readonly element: HTMLElement;
  private formatInfo: Record<string, unknown> = {};
  private enabled = true;
  private interacting = false;
  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    if (!this.element.contains(event.target as Node)) this.hide();
  };
  private readonly onWindowMouseUp = (): void => {
    window.setTimeout(() => { this.interacting = false; }, 0);
  };

  constructor(
    private readonly root: HTMLElement,
    private readonly commands: YeMindCommands,
    private readonly callbacks: RichTextToolbarCallbacks = {},
  ) {
    this.element = document.createElement('div');
    this.element.className = 'ymz-rich-toolbar';
    this.element.hidden = true;
    this.element.innerHTML = `
      <button type="button" data-rich-action="bold" title="加粗"><b>B</b></button>
      <button type="button" data-rich-action="italic" title="斜体"><i>I</i></button>
      <button type="button" data-rich-action="underline" title="下划线"><u>U</u></button>
      <button type="button" data-rich-action="strike" title="删除线"><s>S</s></button>
      <button type="button" data-rich-action="inline-code" title="行内代码">&lt;/&gt;</button>
      <button type="button" data-rich-action="code-block" title="代码块">代码块</button>
      <span class="ymz-rich-toolbar__separator"></span>
      <label class="ymz-rich-color" title="文字颜色">A<input type="color" data-rich-field="color" value="#172033"></label>
      <button type="button" data-rich-action="clear-color" title="清除文字颜色">×</button>
      <label class="ymz-rich-color" title="背景颜色">Bg<input type="color" data-rich-field="background" value="#fff1a8"></label>
      <button type="button" data-rich-action="clear-background" title="清除背景颜色">×</button>
      <select data-rich-field="size" title="字号">
        <option value="">自动</option>${sizeOptions()}
      </select>
      <select data-rich-field="font" title="字体">
        <option value="">继承</option>${fontOptions()}
      </select>
      <span class="ymz-rich-toolbar__separator"></span>
      <button type="button" data-rich-action="link" title="行内链接">链接</button>
      <button type="button" data-rich-action="cloze" title="挖空/取消挖空">挖空</button>
      <button type="button" data-rich-action="formula" title="插入公式">Fx</button>
      <button type="button" data-rich-action="clear" title="清除格式">清除</button>`;
    document.body.appendChild(this.element);
    document.addEventListener('mousedown', this.onDocumentMouseDown, true);
    window.addEventListener('mouseup', this.onWindowMouseUp, true);
    this.bind();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.hide();
  }

  update(
    hasRange: boolean,
    rectInfo?: RichTextSelectionRect | null,
    formatInfo?: Record<string, unknown> | null,
  ): void {
    if (!this.enabled) {
      this.hide();
      return;
    }
    if (!hasRange || !rectInfo) {
      if (!this.interacting) this.hide();
      return;
    }
    this.formatInfo = formatInfo ?? {};
    this.syncState();
    this.element.hidden = false;
    this.position(rectInfo);
  }

  hide(): void {
    this.element.hidden = true;
  }

  destroy(): void {
    document.removeEventListener('mousedown', this.onDocumentMouseDown, true);
    window.removeEventListener('mouseup', this.onWindowMouseUp, true);
    this.element.remove();
  }

  private bind(): void {
    this.element.addEventListener('mousedown', (event) => {
      this.interacting = true;
      if ((event.target as HTMLElement).closest('button')) event.preventDefault();
      event.stopPropagation();
    });
    this.element.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-rich-action]');
      if (!button) return;
      const action = button.dataset.richAction;
      if (action) this.callbacks.onAction?.(action);
      if (['bold', 'italic', 'underline', 'strike'].includes(String(action))) {
        this.commands.formatText(nextToggleFormat(action as RichTextBooleanFormat, this.formatInfo));
        this.formatInfo[action!] = !Boolean(this.formatInfo[action!]);
        this.syncState();
        return;
      }
      switch (action) {
        case 'inline-code':
          this.commands.toggleInlineCode();
          this.formatInfo.code = !Boolean(this.formatInfo.code);
          this.syncState();
          break;
        case 'code-block':
          this.hide();
          this.callbacks.onCodeBlock?.();
          break;
        case 'link':
          this.hide();
          this.callbacks.onLink?.();
          break;
        case 'cloze': {
          const next = !isClozeFormat(this.formatInfo);
          this.commands.setCloze(next);
          this.formatInfo.color = next ? 'transparent' : undefined;
          this.formatInfo.background = next ? '#f5dfa0' : undefined;
          this.syncState();
          break;
        }
        case 'formula':
          this.hide();
          this.callbacks.onFormula?.();
          break;
        case 'clear':
          this.commands.clearTextFormat();
          this.formatInfo = {};
          this.syncState();
          break;
        case 'clear-color':
          this.commands.formatText({ color: false });
          this.formatInfo.color = undefined;
          break;
        case 'clear-background':
          this.commands.formatText({ background: false });
          this.formatInfo.background = undefined;
          break;
      }
    });
    this.element.querySelector<HTMLInputElement>('[data-rich-field="color"]')?.addEventListener('input', (event) => {
      this.callbacks.onAction?.('color');
      this.commands.formatText({ color: (event.target as HTMLInputElement).value });
    });
    this.element.querySelector<HTMLInputElement>('[data-rich-field="background"]')?.addEventListener('input', (event) => {
      this.callbacks.onAction?.('background');
      this.commands.formatText({ background: (event.target as HTMLInputElement).value });
    });
    this.element.querySelector<HTMLSelectElement>('[data-rich-field="size"]')?.addEventListener('change', (event) => {
      this.callbacks.onAction?.('size');
      this.commands.formatText({ size: (event.target as HTMLSelectElement).value || false });
    });
    this.element.querySelector<HTMLSelectElement>('[data-rich-field="font"]')?.addEventListener('change', (event) => {
      this.callbacks.onAction?.('font');
      this.commands.formatText({ font: (event.target as HTMLSelectElement).value || false });
    });
  }

  private syncState(): void {
    ['bold', 'italic', 'underline', 'strike'].forEach((name) => {
      this.element.querySelector(`[data-rich-action="${name}"]`)?.classList.toggle('is-active', Boolean(this.formatInfo[name]));
    });
    this.element.querySelector('[data-rich-action="inline-code"]')?.classList.toggle('is-active', Boolean(this.formatInfo.code));
    this.element.querySelector('[data-rich-action="link"]')?.classList.toggle('is-active', Boolean(this.formatInfo.link));
    this.element.querySelector('[data-rich-action="code-block"]')?.classList.toggle('is-active', Boolean(this.formatInfo['code-block']));
    this.element.querySelector('[data-rich-action="cloze"]')?.classList.toggle('is-active', isClozeFormat(this.formatInfo));
    const size = this.element.querySelector<HTMLSelectElement>('[data-rich-field="size"]');
    if (size) size.value = typeof this.formatInfo.size === 'string' ? this.formatInfo.size : '';
    const font = this.element.querySelector<HTMLSelectElement>('[data-rich-field="font"]');
    if (font) font.value = typeof this.formatInfo.font === 'string' ? this.formatInfo.font : '';
  }

  private position(rect: RichTextSelectionRect): void {
    const width = Math.min(this.element.scrollWidth || 820, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left + ((rect.width ?? 0) / 2) - (width / 2), window.innerWidth - width - 8));
    const measuredHeight = this.element.offsetHeight || 44;
    const below = rect.bottom + 8;
    const top = below + measuredHeight < window.innerHeight ? below : Math.max(8, rect.top - measuredHeight - 8);
    this.element.style.left = `${Math.round(left)}px`;
    this.element.style.top = `${Math.round(top)}px`;
    this.element.style.maxWidth = `${window.innerWidth - 16}px`;
  }
}
