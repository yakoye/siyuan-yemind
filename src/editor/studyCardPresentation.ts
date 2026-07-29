import { compactMarkerButtonStyle, markerItemFromValue } from '../core/localAssetCatalogs';
import type { StudyCardSourceSnapshot } from '../review/studyCardSource';

const LEGACY_ICON_LABELS: Record<string, string> = {
  yemind_star: '★',
  yemind_flag: '⚑',
  yemind_question: '?',
  yemind_idea: '✦',
  yemind_check: '✓',
  yemind_warning: '!',
  priority_1: '1',
  priority_2: '2',
  priority_3: '3',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function cssPropertyName(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function styleAttribute(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([key, value]) => `${cssPropertyName(key)}:${value}`)
    .join(';');
}

function renderIcon(value: string, pluginBaseUrl?: string): string {
  const marker = markerItemFromValue(value);
  if (marker) {
    const style = styleAttribute(compactMarkerButtonStyle(pluginBaseUrl, marker, 20));
    return `<span class="ymz-study-source__icon is-marker" title="${escapeHtml(marker.groupLabel)} ${marker.orderInGroup}" style="${escapeHtml(style)}"></span>`;
  }
  return `<span class="ymz-study-source__icon" title="${escapeHtml(value)}">${escapeHtml(LEGACY_ICON_LABELS[value] ?? '•')}</span>`;
}

function renderImage(source: StudyCardSourceSnapshot): string {
  if (!source.image) return '';
  const width = source.image.width ? ` width="${source.image.width}"` : '';
  const height = source.image.height ? ` height="${source.image.height}"` : '';
  return `
    <button type="button" class="ymz-study-source__image" data-study-action="preview-source-image" data-study-image-src="${escapeHtml(source.image.src)}" data-study-image-title="${escapeHtml(source.image.title)}" aria-label="预览${source.image.kind === 'clipart' ? '剪贴图' : '图片'}：${escapeHtml(source.image.title || '未命名')}">
      <img src="${escapeHtml(source.image.src)}" alt="${escapeHtml(source.image.title)}" loading="lazy" draggable="false"${width}${height}>
      ${source.image.title ? `<span>${escapeHtml(source.image.title)}</span>` : ''}
    </button>
  `;
}

export function renderStudyCardSourceFront(
  source: StudyCardSourceSnapshot | undefined,
  pluginBaseUrl?: string,
): string {
  if (!source) return '';
  const icons = source.icons.map((icon) => renderIcon(icon, pluginBaseUrl)).join('');
  const todo = source.todo
    ? `<span class="ymz-study-source__todo${source.todo.checked ? ' is-checked' : ''}"><i>${source.todo.checked ? '✓' : ''}</i>${escapeHtml(source.todo.text || (source.todo.checked ? '已完成' : '待办'))}</span>`
    : '';
  const tags = source.tags.map((tag) => `<span class="ymz-study-source__tag">${escapeHtml(tag)}</span>`).join('');
  const link = source.hyperlink
    ? `<a class="ymz-study-source__link" href="${escapeHtml(source.hyperlink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.hyperlinkTitle || source.hyperlink)} ↗</a>`
    : '';
  const accessories = icons || todo || tags || link
    ? `<div class="ymz-study-source__accessories">${icons}${todo}${tags}${link}</div>`
    : '';
  return `
    <section class="ymz-study-source ymz-study-source--front" data-study-source-front>
      ${accessories}
      ${source.nodeTextHtml ? `<div class="ymz-study-source__rich-text">${source.nodeTextHtml}</div>` : ''}
      ${renderImage(source)}
    </section>
  `;
}

export function renderStudyCardSourceBack(source: StudyCardSourceSnapshot | undefined): string {
  if (!source || (!source.noteHtml && !source.comments.length)) return '';
  return `
    <section class="ymz-study-source ymz-study-source--back" data-study-source-back>
      ${source.noteHtml ? `<div class="ymz-study-source__note"><small>备注</small><div>${source.noteHtml}</div></div>` : ''}
      ${source.comments.length ? `
        <div class="ymz-study-source__comments">
          <small>批注 · ${source.comments.length}</small>
          ${source.comments.map((comment) => `<article><p>${escapeHtml(comment.text)}</p><time>${new Date(comment.updatedAt).toLocaleDateString('zh-CN')}</time></article>`).join('')}
        </div>
      ` : ''}
    </section>
  `;
}
