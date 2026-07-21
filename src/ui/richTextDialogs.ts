import { Dialog, showMessage } from 'siyuan';
import type { RichTextFormattingTarget } from '../editor/richTextTarget';
import type { YeMindSettings } from '../settings/SettingsStore';
import { normalizeInlineLink } from '../editor/inlineLink';

const CODE_LANGUAGES = [
  ['plain', '纯文本'],
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['json', 'JSON'],
  ['html', 'HTML'],
  ['css', 'CSS'],
  ['bash', 'Bash / Shell'],
  ['python', 'Python'],
  ['c', 'C'],
  ['cpp', 'C++'],
  ['rust', 'Rust'],
  ['go', 'Go'],
  ['java', 'Java'],
  ['sql', 'SQL'],
  ['markdown', 'Markdown'],
  ['yaml', 'YAML'],
] as const;

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function openInlineLinkDialog(commands: RichTextFormattingTarget, settings: YeMindSettings): void {
  const selectedText = commands.getSelectedText();
  const existing = commands.getSelectedInlineLink();
  if (!selectedText && !existing) {
    showMessage('请先在节点中选择要添加链接的文字', 2800, 'info');
    return;
  }
  const dialog = new Dialog({
    title: existing ? '编辑行内链接' : '添加行内链接',
    width: '480px',
    content: `<div class="b3-dialog__content ymz-node-dialog">
      <label>选中文字</label>
      <div class="ymz-selection-preview">${escapeHtml(selectedText || '当前链接')}</div>
      <label>链接地址</label>
      <input class="b3-text-field fn__block" data-field="inline-link" placeholder="https://…、example.com 或 siyuan://blocks/…">
      <div class="b3-label__text">支持网页、邮箱、电话和思源块链接。</div>
    </div>
    <div class="b3-dialog__action">
      <button class="b3-button b3-button--outline" data-action="remove-link" ${existing ? '' : 'disabled'}>移除链接</button>
      <div class="fn__space"></div>
      <button class="b3-button b3-button--cancel" data-action="cancel">取消</button>
      <button class="b3-button b3-button--text" data-action="save">应用</button>
    </div>`,
  });
  const input = dialog.element.querySelector<HTMLInputElement>('[data-field="inline-link"]')!;
  input.value = existing;
  dialog.element.querySelector('[data-action="cancel"]')?.addEventListener('click', () => dialog.destroy());
  dialog.element.querySelector('[data-action="remove-link"]')?.addEventListener('click', () => {
    commands.setInlineLink(null);
    dialog.destroy();
  });
  const apply = (): void => {
    const normalized = normalizeInlineLink(input.value, settings.inlineLinkAutoHttps);
    if (!normalized) {
      showMessage('链接地址无效或协议不受支持', 3000, 'error');
      input.focus();
      return;
    }
    commands.setInlineLink(normalized);
    dialog.destroy();
  };
  dialog.element.querySelector('[data-action="save"]')?.addEventListener('click', apply);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); apply(); }
    if (event.key === 'Escape') dialog.destroy();
  });
  requestAnimationFrame(() => { input.focus(); input.select(); });
}

export function openCodeBlockDialog(commands: RichTextFormattingTarget, settings: YeMindSettings): void {
  const existing = commands.getCodeBlock();
  const selected = existing?.code ?? commands.getSelectedText();
  if (!existing && !selected) {
    showMessage('请先在节点中选择要转换为代码块的文字', 2800, 'info');
    return;
  }
  const dialog = new Dialog({
    title: existing ? '编辑代码块' : '插入代码块',
    width: '680px',
    content: `<div class="b3-dialog__content ymz-node-dialog ymz-code-dialog">
      <div class="ymz-code-dialog__head">
        <label>语言</label>
        <select class="b3-select" data-field="code-language">
          ${CODE_LANGUAGES.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
        </select>
      </div>
      <label>代码</label>
      <textarea class="b3-text-field fn__block ymz-code-editor" data-field="code" rows="16" spellcheck="false" placeholder="输入或粘贴代码"></textarea>
      <div class="b3-label__text">Tab 会按设置插入空格；保存后双击代码块或重新选择即可再次编辑。</div>
    </div>
    <div class="b3-dialog__action">
      <button class="b3-button b3-button--outline" data-action="remove-format" ${existing ? '' : 'disabled'}>转为普通文本</button>
      <button class="b3-button b3-button--outline b3-button--danger" data-action="delete-block" ${existing ? '' : 'disabled'}>删除代码块</button>
      <div class="fn__space"></div>
      <button class="b3-button b3-button--cancel" data-action="cancel">取消</button>
      <button class="b3-button b3-button--text" data-action="save">保存</button>
    </div>`,
  });
  const language = dialog.element.querySelector<HTMLSelectElement>('[data-field="code-language"]')!;
  const editor = dialog.element.querySelector<HTMLTextAreaElement>('[data-field="code"]')!;
  language.value = existing?.language || settings.defaultCodeLanguage;
  if (!Array.from(language.options).some((option) => option.value === language.value)) language.value = 'plain';
  editor.value = selected;
  editor.style.fontSize = `${settings.codeBlockFontSize}px`;
  editor.style.tabSize = String(settings.codeBlockTabSize);
  editor.wrap = settings.codeBlockWrap ? 'soft' : 'off';
  editor.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const spaces = ' '.repeat(settings.codeBlockTabSize);
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText(spaces, start, end, 'end');
  });
  dialog.element.querySelector('[data-action="cancel"]')?.addEventListener('click', () => dialog.destroy());
  dialog.element.querySelector('[data-action="remove-format"]')?.addEventListener('click', () => {
    commands.removeCodeBlockFormat();
    dialog.destroy();
  });
  dialog.element.querySelector('[data-action="delete-block"]')?.addEventListener('click', () => {
    commands.deleteCodeBlock();
    dialog.destroy();
  });
  dialog.element.querySelector('[data-action="save"]')?.addEventListener('click', () => {
    commands.saveCodeBlock(editor.value, language.value || 'plain');
    dialog.destroy();
  });
  requestAnimationFrame(() => { editor.focus(); if (!existing) editor.select(); });
}

export { CODE_LANGUAGES };
