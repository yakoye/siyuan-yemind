import { loadImageFileSelection } from './imageFileLoading';
import { Dialog, confirm, showMessage } from 'siyuan';
import type { YeMindCommands } from '../core/commands';
import type { RichTextFormattingTarget } from '../editor/richTextTarget';
import {
  addComment,
  editComment,
  normalizeStringList,
  removeComment,
  type NodeComment,
  type NodeTodo,
} from '../content/nodeContentState';
import { bindDialogResize } from './dialogResize';
import { buildCommentsListHtml, requestClearAllComments } from './commentsPresentation';
import { normalizeInlineLink } from '../editor/inlineLink';
import { normalizeNodeNote, updateNodeNote } from '../content/nodeNoteState';

function activeData(commands: YeMindCommands): Record<string, any> {
  return commands.getPrimaryNodeData() ?? {};
}

function actionButtons(): string {
  return `<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel" data-dialog-action="cancel">取消</button>
    <div class="fn__space"></div>
    <button class="b3-button b3-button--text" data-dialog-action="save">保存</button>
  </div>`;
}

function bindDialogActions(dialog: Dialog, onSave: () => void): void {
  dialog.element.querySelector('[data-dialog-action="cancel"]')?.addEventListener('click', () => dialog.destroy());
  dialog.element.querySelector('[data-dialog-action="save"]')?.addEventListener('click', () => {
    onSave();
    dialog.destroy();
  });
}


export function openTodoDialog(commands: YeMindCommands): void {
  const existing = (activeData(commands).yemindTodo ?? null) as NodeTodo | null;
  const dialog = new Dialog({
    title: '待办',
    content: `<div class="b3-dialog__content ymz-node-dialog">
      <label>待办内容</label><input class="b3-text-field fn__block" data-field="todo-text" placeholder="输入待办内容">
      <label class="ymz-checkbox-row"><input type="checkbox" data-field="todo-checked"> 已完成</label>
      <button class="b3-button b3-button--outline" data-action="remove-todo">移除待办</button>
    </div>${actionButtons()}`,
    width: '440px',
  });
  const text = dialog.element.querySelector<HTMLInputElement>('[data-field="todo-text"]')!;
  const checked = dialog.element.querySelector<HTMLInputElement>('[data-field="todo-checked"]')!;
  text.value = existing?.text ?? '';
  checked.checked = Boolean(existing?.checked);
  dialog.element.querySelector('[data-action="remove-todo"]')?.addEventListener('click', () => {
    commands.setTodo(null);
    dialog.destroy();
  });
  bindDialogActions(dialog, () => commands.setTodo({ checked: checked.checked, text: text.value.trim() }));
  text.focus();
}

export function openTagsDialog(commands: YeMindCommands): void {
  const data = activeData(commands);
  const dialog = new Dialog({
    title: '标签',
    content: `<div class="b3-dialog__content ymz-node-dialog">
      <label>标签</label><input class="b3-text-field fn__block" data-field="tags" placeholder="PCIe, ATS, 重点">
      <div class="b3-label__text">使用逗号或换行分隔；留空可删除全部标签。</div>
    </div>${actionButtons()}`,
    width: '440px',
  });
  const input = dialog.element.querySelector<HTMLInputElement>('[data-field="tags"]')!;
  input.value = normalizeStringList(data.tag).join(', ');
  bindDialogActions(dialog, () => commands.setTags(normalizeStringList(input.value.split(/[,，\n]/g))));
  input.focus();
}

const ICON_OPTIONS = [
  ['yemind_star', '★ 重点'],
  ['yemind_flag', '⚑ 标记'],
  ['yemind_question', '? 疑问'],
  ['yemind_idea', '✦ 灵感'],
  ['yemind_check', '✓ 完成'],
  ['yemind_warning', '! 警告'],
  ['priority_1', '优先级 1'],
  ['priority_2', '优先级 2'],
  ['priority_3', '优先级 3'],
] as const;

export function openIconsDialog(commands: YeMindCommands): void {
  const selected = new Set(normalizeStringList(activeData(commands).icon));
  const dialog = new Dialog({
    title: '图标',
    content: `<div class="b3-dialog__content ymz-node-dialog"><div class="ymz-icon-grid">
      ${ICON_OPTIONS.map(([value, label]) => `<label><input type="checkbox" value="${value}"> <span>${label}</span></label>`).join('')}
    </div></div>${actionButtons()}`,
    width: '440px',
  });
  dialog.element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
    input.checked = selected.has(input.value);
  });
  bindDialogActions(dialog, () => {
    const values = Array.from(dialog.element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')).map((input) => input.value);
    commands.setIcons(values);
  });
}

export function openLinkDialog(commands: YeMindCommands, autoHttps = true): void {
  const data = activeData(commands);
  const dialog = new Dialog({
    title: '链接',
    content: `<div class="b3-dialog__content ymz-node-dialog">
      <label>链接地址</label><input class="b3-text-field fn__block" data-field="url" placeholder="https://… 或 siyuan://blocks/…">
      <label>显示提示</label><input class="b3-text-field fn__block" data-field="title" placeholder="可选">
      <div class="b3-label__text">支持 HTTP、HTTPS、邮件、电话和思源链接；清空后保存即可删除。</div>
    </div>${actionButtons()}`,
    width: '480px',
  });
  const url = dialog.element.querySelector<HTMLInputElement>('[data-field="url"]')!;
  const title = dialog.element.querySelector<HTMLInputElement>('[data-field="title"]')!;
  url.value = String(data.hyperlink ?? '');
  title.value = String(data.hyperlinkTitle ?? '');
  dialog.element.querySelector('[data-dialog-action="cancel"]')?.addEventListener('click', () => dialog.destroy());
  dialog.element.querySelector('[data-dialog-action="save"]')?.addEventListener('click', () => {
    const raw = url.value.trim();
    if (!raw) {
      commands.setLink('', title.value.trim());
      dialog.destroy();
      return;
    }
    const normalized = normalizeInlineLink(raw, autoHttps);
    if (!normalized) {
      showMessage('链接地址无效或协议不受支持', 3500, 'error');
      url.focus();
      url.select();
      return;
    }
    commands.setLink(normalized, title.value.trim());
    dialog.destroy();
  });
  url.focus();
}

export function openFormulaDialog(commands: RichTextFormattingTarget): void {
  const dialog = new Dialog({
    title: '公式',
    content: `<div class="b3-dialog__content ymz-node-dialog">
      <div class="ymz-formula-mode" role="group" aria-label="公式模式">
        <label><input type="radio" name="formula-mode" value="inline" checked> 行内</label>
        <label><input type="radio" name="formula-mode" value="block"> 块级</label>
      </div>
      <label>LaTeX</label><textarea class="b3-text-field fn__block" data-field="formula" rows="4" placeholder="e=mc^2"></textarea>
      <div class="ymz-formula-preview" data-role="preview">输入公式后预览</div>
    </div>${actionButtons()}`,
    width: '500px',
  });
  const input = dialog.element.querySelector<HTMLTextAreaElement>('[data-field="formula"]')!;
  const preview = dialog.element.querySelector<HTMLElement>('[data-role="preview"]')!;
  input.value = commands.getSelectedText();
  const update = (): void => {
    const value = input.value.trim();
    if (!value) {
      preview.textContent = '输入公式后预览';
      return;
    }
    try {
      const katex = (window as any).katex;
      preview.innerHTML = katex?.renderToString ? katex.renderToString(value, { throwOnError: false }) : escapeHtml(value);
    } catch {
      preview.textContent = value;
    }
  };
  input.addEventListener('input', update);
  update();
  bindDialogActions(dialog, () => {
    const value = input.value.trim();
    if (value) {
      const mode = dialog.element.querySelector<HTMLInputElement>('input[name="formula-mode"]:checked')?.value === 'block' ? 'block' : 'inline';
      commands.insertFormula(value, mode);
    }
  });
  input.focus();
}

export function openImageDialog(commands: YeMindCommands): void {
  let fileData = '';
  let fileSize = { width: 0, height: 0 };
  const data = activeData(commands);
  const dialog = new Dialog({
    title: '图片',
    content: `<div class="b3-dialog__content ymz-node-dialog">
      <label>图片地址</label><input class="b3-text-field fn__block" data-field="url" placeholder="https://… 或 data:image/…">
      <label>或者选择本地图片</label><input type="file" data-field="file" accept="image/*">
      <label>图片说明</label><input class="b3-text-field fn__block" data-field="title" placeholder="可选">
      <div class="ymz-image-preview" data-role="preview"></div>
      <button class="b3-button b3-button--outline" data-action="remove-image">移除图片</button>
    </div>${actionButtons()}`,
    width: '520px',
  });
  const url = dialog.element.querySelector<HTMLInputElement>('[data-field="url"]')!;
  const file = dialog.element.querySelector<HTMLInputElement>('[data-field="file"]')!;
  const title = dialog.element.querySelector<HTMLInputElement>('[data-field="title"]')!;
  const preview = dialog.element.querySelector<HTMLElement>('[data-role="preview"]')!;
  url.value = String(data.image ?? '');
  title.value = String(data.imageTitle ?? '');
  if (url.value) preview.innerHTML = `<img src="${escapeAttribute(url.value)}" alt="">`;
  file.addEventListener('change', async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    const loaded = await loadImageFileSelection(selected, {
      read: readFileAsDataUrl,
      measure: getImageSize,
      onError: (error) => {
        console.error('[YeMind Zen] local image read failed', error);
        showMessage('图片读取失败，请重新选择文件', 4000, 'error');
      },
    });
    if (!loaded) {
      file.value = '';
      fileData = '';
      fileSize = { width: 0, height: 0 };
      return;
    }
    fileData = loaded.dataUrl;
    fileSize = loaded.size;
    preview.innerHTML = `<img src="${escapeAttribute(fileData)}" alt="">`;
  });
  dialog.element.querySelector('[data-action="remove-image"]')?.addEventListener('click', () => {
    commands.setImage({ url: null });
    dialog.destroy();
  });
  bindDialogActions(dialog, () => {
    const source = fileData || url.value.trim();
    if (!source) {
      commands.setImage({ url: null });
      return;
    }
    commands.setImage({
      url: source,
      title: title.value.trim(),
      width: fileSize.width || Number(data.imageSize?.width) || 240,
      height: fileSize.height || Number(data.imageSize?.height) || 160,
      custom: false,
    });
  });
}


export function openNoteDialog(commands: YeMindCommands, options: { readonly?: boolean } = {}): void {
  const readonly = Boolean(options.readonly);
  const data = activeData(commands);
  const current = normalizeNodeNote(data.yemindNote ?? data.note);
  const width = Math.max(420, current?.width ?? 560);
  const height = Math.max(280, current?.height ?? 380);
  const dialog = new Dialog({
    title: readonly ? '备注（只读）' : '备注',
    content: `<div class="b3-dialog__content ymz-node-dialog ymz-note-dialog">
      <div class="ymz-note-editor" data-field="note" contenteditable="${readonly ? 'false' : 'true'}" role="textbox" aria-multiline="true" data-placeholder="输入长篇备注；可粘贴文字和图片…"></div>
      ${readonly ? '' : '<div class="b3-label__text">备注支持多段文字和图片粘贴，窗口大小会随备注一同保存。</div>'}
    </div>${readonly ? '<div class="b3-dialog__action"><div class="fn__space"></div><button class="b3-button b3-button--cancel" data-dialog-action="cancel">关闭</button></div>' : actionButtons()}`,
    width: `${width}px`,
    height: `${height}px`,
  });
  const editor = dialog.element.querySelector<HTMLElement>('[data-field="note"]')!;
  editor.innerHTML = current?.html ?? '';
  const container = dialog.element.querySelector<HTMLElement>('.b3-dialog__container') ?? dialog.element;
  const resizeHandle = document.createElement('button');
  resizeHandle.type = 'button';
  resizeHandle.className = 'ymz-note-resize-handle';
  resizeHandle.title = '拖动调整备注窗口大小';
  resizeHandle.setAttribute('aria-label', resizeHandle.title);
  container.appendChild(resizeHandle);
  bindDialogResize(resizeHandle, container);
  editor.addEventListener('paste', (event) => {
    if (readonly) return;
    const image = Array.from(event.clipboardData?.items ?? []).find((item) => item.type.startsWith('image/'))?.getAsFile();
    if (!image) return;
    event.preventDefault();
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const source = typeof reader.result === 'string' ? reader.result : '';
      if (!source) return;
      document.execCommand('insertHTML', false, `<img src="${escapeAttribute(source)}" alt="">`);
    });
    reader.readAsDataURL(image);
  });
  dialog.element.querySelector('[data-dialog-action="cancel"]')?.addEventListener('click', () => dialog.destroy());
  if (!readonly) {
    dialog.element.querySelector('[data-dialog-action="save"]')?.addEventListener('click', () => {
      const rect = dialog.element.querySelector<HTMLElement>('.b3-dialog__container')?.getBoundingClientRect()
        ?? dialog.element.getBoundingClientRect();
      commands.setNote(updateNodeNote(current, editor.innerHTML, Date.now(), { width: rect.width, height: rect.height }));
      dialog.destroy();
    });
    editor.focus();
  }
}

export function openCommentsDialog(commands: YeMindCommands, options: { readonly?: boolean } = {}): void {
  const readonly = Boolean(options.readonly);
  let comments = ((activeData(commands).yemindComments ?? []) as NodeComment[]).map((item) => ({ ...item }));
  let editingId: string | null = null;
  const dialog = new Dialog({
    title: readonly ? '批注（只读）' : '批注',
    content: `<div class="b3-dialog__content ymz-node-dialog ymz-comments-dialog">
      <div data-role="comments"></div>
      <textarea class="b3-text-field fn__block" data-field="new-comment" rows="3" placeholder="新增批注…"></textarea>
      <div class="ymz-comments-dialog__footer">
        <button class="b3-button b3-button--cancel" data-action="clear-comments">清空全部</button>
        <div class="fn__space"></div>
        <button class="b3-button b3-button--text" data-action="add-comment">添加</button>
      </div>
    </div>`,
    width: '500px',
  });
  const list = dialog.element.querySelector<HTMLElement>('[data-role="comments"]')!;
  const input = dialog.element.querySelector<HTMLTextAreaElement>('[data-field="new-comment"]')!;
  const clearButton = dialog.element.querySelector<HTMLButtonElement>('[data-action="clear-comments"]')!;
  const footer = dialog.element.querySelector<HTMLElement>('.ymz-comments-dialog__footer')!;
  input.hidden = readonly;
  footer.hidden = readonly;

  const persist = (): void => commands.setComments(comments.filter((comment) => comment.text.trim()));
  const render = (): void => {
    list.innerHTML = buildCommentsListHtml(comments, editingId);
    clearButton.hidden = readonly || comments.length === 0;
    if (readonly) {
      list.querySelectorAll<HTMLElement>('button, textarea').forEach((control) => { control.hidden = true; });
      return;
    }
    list.querySelectorAll<HTMLElement>('[data-comment-id]').forEach((row) => {
      const id = row.dataset.commentId!;
      row.querySelector('[data-action="edit-comment"]')?.addEventListener('click', () => {
        editingId = id;
        render();
        list.querySelector<HTMLElement>(`[data-comment-id="${CSS.escape(id)}"]`)
          ?.querySelector<HTMLTextAreaElement>('[data-field="edit-comment"]')?.focus();
      });
      row.querySelector('[data-action="save-comment"]')?.addEventListener('click', () => {
        const value = row.querySelector<HTMLTextAreaElement>('[data-field="edit-comment"]')?.value ?? '';
        comments = value.trim() ? editComment(comments, id, value) : removeComment(comments, id);
        editingId = null;
        persist();
        render();
      });
      row.querySelector('[data-action="cancel-edit-comment"]')?.addEventListener('click', () => {
        editingId = null;
        render();
      });
      row.querySelector('[data-action="delete-comment"]')?.addEventListener('click', () => {
        comments = removeComment(comments, id);
        editingId = null;
        persist();
        render();
      });
    });
  };

  render();
  dialog.element.querySelector('[data-action="add-comment"]')?.addEventListener('click', () => {
    if (!input.value.trim()) return;
    comments = addComment(comments, input.value);
    input.value = '';
    persist();
    render();
    input.focus();
  });
  clearButton.addEventListener('click', () => {
    requestClearAllComments(confirm, () => {
      comments = [];
      editingId = null;
      persist();
      render();
    });
  });
  if (!readonly) input.focus();
}

export function showNodeActionUnavailable(): void {
  showMessage('请先选择一个节点', 2500, 'info');
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 240, height: 160 });
    image.src = url;
  });
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
