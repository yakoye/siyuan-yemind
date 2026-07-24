import { Dialog, showMessage } from 'siyuan';
import type { MindMapTree } from '../model/types';
import {
  applyOutlineImport,
  OUTLINE_TREE_IMPORT_PLACEHOLDERS,
  parseOutlineTreeText,
  type OutlineTreeImportInsertMode,
  type OutlineTreeImportMode,
  type OutlineTreeImportResult,
} from '../editor/outlineTreeImport';

export interface TextToMapDialogOptions {
  targetUid: string;
  getTree(): MindMapTree;
  onApply(tree: MindMapTree, result: OutlineTreeImportResult, insertMode: OutlineTreeImportInsertMode): boolean;
}

const MODES: Array<[OutlineTreeImportMode, string]> = [
  ['auto', '自动识别'],
  ['unicode-tree', 'Unicode 树形符号'],
  ['windows-tree', 'Windows Tree'],
  ['indent', '空格/Tab 缩进'],
  ['markdown', 'Markdown 列表'],
  ['numbered', '编号大纲'],
  ['plain', '普通多行文本'],
];

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function previewRowsHtml(result: OutlineTreeImportResult): string {
  if (!result.lines.length) {
    return '<div class="ymz-text-map-dialog__empty">等待粘贴文本…<small>解析后将在此显示移除树形符号后的节点层级。</small></div>';
  }
  return result.lines.map((line) => {
    const text = escapeHtml(line.text).replaceAll('\n', '<br>');
    return `<div class="ymz-text-map-dialog__preview-row" style="--ymz-import-depth:${Math.max(0, line.depth)}" data-import-depth="${Math.max(0, line.depth)}"><span>${text}</span></div>`;
  }).join('');
}

function resultStatus(result: OutlineTreeImportResult): string {
  const detected = MODES.find(([id]) => id === result.detectedMode)?.[1] ?? result.detectedMode;
  const parts = [
    `已识别：${detected}`,
    `节点：${result.nodeCount}`,
    `最大层级：${result.maxDepth}`,
  ];
  if (result.ignoredBlankLines) parts.push(`忽略空行：${result.ignoredBlankLines}`);
  if (result.continuationLines) parts.push(`续行合并：${result.continuationLines}`);
  return parts.join('　');
}

export function openTextToMapDialog(options: TextToMapDialogOptions): void {
  const dialog = new Dialog({
    title: '文本转导图',
    width: 'min(980px, calc(100vw - 48px))',
    height: 'min(700px, calc(100vh - 64px))',
    content: `<div class="b3-dialog__content ymz-text-map-dialog">
      <div class="ymz-text-map-dialog__toolbar">
        <label>识别方式
          <select class="b3-select" data-field="mode">
            ${MODES.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}
          </select>
        </label>
        <label>插入方式
          <select class="b3-select" data-field="insert-mode">
            <option value="append-under-current">当前节点作为根</option>
            <option value="replace-current">首个节点替换当前节点</option>
          </select>
        </label>
      </div>
      <div class="ymz-text-map-dialog__body">
        <section class="ymz-text-map-dialog__pane">
          <div class="ymz-text-map-dialog__heading">原始文本</div>
          <textarea class="b3-text-field ymz-text-map-dialog__input" data-field="source" spellcheck="false"></textarea>
        </section>
        <section class="ymz-text-map-dialog__pane">
          <div class="ymz-text-map-dialog__heading">解析预览</div>
          <div class="ymz-text-map-dialog__preview" data-role="preview"><div class="ymz-text-map-dialog__empty">等待粘贴文本…<small>解析后将在此显示移除树形符号后的节点层级。</small></div></div>
        </section>
      </div>
      <div class="ymz-text-map-dialog__status" data-role="status">粘贴文本后将自动预览。</div>
      <div class="ymz-text-map-dialog__messages" data-role="messages"></div>
    </div>
    <div class="b3-dialog__action">
      <button class="b3-button b3-button--cancel" data-action="cancel">取消</button>
      <div class="fn__space"></div>
      <button class="b3-button b3-button--text" data-action="apply" disabled>转换为导图</button>
    </div>`,
  });
  const source = dialog.element.querySelector<HTMLTextAreaElement>('[data-field="source"]')!;
  const mode = dialog.element.querySelector<HTMLSelectElement>('[data-field="mode"]')!;
  const insertMode = dialog.element.querySelector<HTMLSelectElement>('[data-field="insert-mode"]')!;
  const preview = dialog.element.querySelector<HTMLElement>('[data-role="preview"]')!;
  const status = dialog.element.querySelector<HTMLElement>('[data-role="status"]')!;
  const messages = dialog.element.querySelector<HTMLElement>('[data-role="messages"]')!;
  const apply = dialog.element.querySelector<HTMLButtonElement>('[data-action="apply"]')!;
  let current = parseOutlineTreeText('', 'auto');

  const refresh = (): void => {
    const selectedMode = mode.value as OutlineTreeImportMode;
    source.placeholder = OUTLINE_TREE_IMPORT_PLACEHOLDERS[selectedMode];
    current = parseOutlineTreeText(source.value, selectedMode);
    preview.innerHTML = previewRowsHtml(current);
    status.textContent = source.value.trim() ? resultStatus(current) : '粘贴文本后将自动预览。';
    messages.innerHTML = [
      ...current.errors.map((text) => `<div class="ymz-text-map-dialog__error">${escapeHtml(text)}</div>`),
      ...current.warnings.map((text) => `<div class="ymz-text-map-dialog__warning">${escapeHtml(text)}</div>`),
    ].join('');
    apply.disabled = !source.value.trim() || current.lines.length === 0 || current.errors.length > 0;
  };

  source.addEventListener('input', refresh);
  mode.addEventListener('change', refresh);
  dialog.element.querySelector('[data-action="cancel"]')?.addEventListener('click', () => dialog.destroy());
  apply.addEventListener('click', () => {
    if (apply.disabled) return;
    const selectedInsertMode = insertMode.value as OutlineTreeImportInsertMode;
    const next = applyOutlineImport(options.getTree(), options.targetUid, current, selectedInsertMode);
    if (!options.onApply(next, current, selectedInsertMode)) {
      showMessage('文本转换未能应用到导图，请重试', 4000, 'error');
      return;
    }
    dialog.destroy();
    showMessage(`已转换 ${current.nodeCount} 个节点`);
  });
  refresh();
  source.focus();
}
