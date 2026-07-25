import type { MindMapNodeData } from '../model/types';
import { compactMarkerButtonStyle, markerItemFromValue } from '../core/localAssetCatalogs';

export interface OutlineAccessoryImage {
  url: string;
  title: string;
  clipartId?: string;
}

export interface OutlineAccessoryTodo {
  checked: boolean;
  text: string;
}

export interface OutlineAccessories {
  icons: string[];
  image: OutlineAccessoryImage | null;
  todo: OutlineAccessoryTodo | null;
  tags: string[];
  link: string;
  hasNote: boolean;
  commentCount: number;
  hasOuterFrame: boolean;
}

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

function escapeAttribute(value: string): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}


function cssPropertyName(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function styleAttribute(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([key, value]) => `${cssPropertyName(key)}:${value}`)
    .join(';');
}

function normalizeIcons(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];
}

function normalizeTags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];
}

function hasMeaningfulNote(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === 'string') return value.replace(/<[^>]*>/g, '').trim().length > 0;
  if (typeof value === 'object') {
    const html = String((value as Record<string, unknown>).html ?? '');
    return html.replace(/<[^>]*>/g, '').trim().length > 0 || /<img\b/i.test(html);
  }
  return false;
}

export function outlineAccessoriesFromData(data: MindMapNodeData | Record<string, unknown>): OutlineAccessories {
  const image = typeof data.image === 'string' && data.image.trim()
    ? {
        url: data.image,
        title: typeof data.imageTitle === 'string' ? data.imageTitle : '',
        ...(typeof data.yemindClipartId === 'string' && data.yemindClipartId
          ? { clipartId: data.yemindClipartId }
          : {}),
      }
    : null;
  const todoValue = data.yemindTodo && typeof data.yemindTodo === 'object'
    ? data.yemindTodo as Record<string, unknown>
    : null;
  const todo = todoValue
    ? { checked: Boolean(todoValue.checked), text: String(todoValue.text ?? '') }
    : null;
  const comments = Array.isArray(data.yemindComments) ? data.yemindComments : [];
  const outerFrame = data.outerFrame && typeof data.outerFrame === 'object'
    ? String((data.outerFrame as Record<string, unknown>).groupId ?? '')
    : '';
  return {
    icons: normalizeIcons(data.icon),
    image,
    todo,
    tags: normalizeTags(data.tag),
    link: typeof data.hyperlink === 'string' ? data.hyperlink : '',
    hasNote: hasMeaningfulNote(data.yemindNote ?? data.note),
    commentCount: comments.length,
    hasOuterFrame: Boolean(outerFrame),
  };
}

function iconHtml(value: string, pluginBaseUrl?: string): string {
  const marker = markerItemFromValue(value);
  if (marker) {
    const style = styleAttribute(compactMarkerButtonStyle(pluginBaseUrl, marker));
    return `<button type="button" class="ymz-outline-accessories__icon ymz-outline-accessories__icon--marker" data-outline-icon-action data-outline-icon="${escapeAttribute(value)}" tabindex="-1" title="${escapeAttribute(marker.groupLabel)} ${marker.orderInGroup}" aria-label="修改图标" style="${escapeAttribute(style)}"></button>`;
  }
  const label = LEGACY_ICON_LABELS[value] ?? '•';
  return `<button type="button" class="ymz-outline-accessories__icon ymz-outline-accessories__icon--legacy" data-outline-icon-action data-outline-icon="${escapeAttribute(value)}" tabindex="-1" title="${escapeAttribute(value)}" aria-label="修改图标">${escapeAttribute(label)}</button>`;
}

function symbolIcon(symbol: string): string {
  const safe = escapeAttribute(symbol);
  return `<svg aria-hidden="true" focusable="false"><use href="#${safe}" xlink:href="#${safe}"></use></svg>`;
}

function statusButton(type: string, title: string, label: string): string {
  return `<button type="button" class="ymz-outline-accessories__status ymz-outline-accessories__status--${escapeAttribute(type)}" data-outline-content="${escapeAttribute(type)}" tabindex="-1" aria-label="${escapeAttribute(title)}">${label}</button>`;
}

export function outlineAccessoriesHtml(accessories: OutlineAccessories, pluginBaseUrl?: string): string {
  const hasAny = accessories.icons.length || accessories.image || accessories.todo || accessories.tags.length
    || accessories.link || accessories.hasNote || accessories.commentCount || accessories.hasOuterFrame;
  if (!hasAny) return '';
  const todo = accessories.todo
    ? `<button type="button" class="ymz-outline-accessories__todo${accessories.todo.checked ? ' is-checked' : ''}" data-outline-content="todo" tabindex="-1" aria-label="${accessories.todo.checked ? '待办已完成' : '待办未完成'}">${accessories.todo.checked ? '✓' : ''}</button>`
    : '';
  const icons = accessories.icons.map((value) => iconHtml(value, pluginBaseUrl)).join('');
  const image = accessories.image
    ? `<button type="button" class="ymz-outline-accessories__image${accessories.image.clipartId ? ' is-clipart' : ''}" data-outline-image-action data-outline-image-kind="${accessories.image.clipartId ? 'clipart' : 'image'}" tabindex="-1" title="${escapeAttribute(accessories.image.title || (accessories.image.clipartId ? '剪贴图：单击编辑，双击查看' : '图片：单击编辑，双击查看'))}"><img src="${escapeAttribute(accessories.image.url)}" alt="" loading="lazy" draggable="false"></button>`
    : '';
  const tags = accessories.tags.length
    ? `<span class="ymz-outline-accessories__tags" data-outline-content="tags" aria-label="标签：${escapeAttribute(accessories.tags.join('、'))}">${accessories.tags.slice(0, 2).map((tag) => `<span>${escapeAttribute(tag)}</span>`).join('')}</span>`
    : '';
  const note = accessories.hasNote ? statusButton('note', '备注', symbolIcon('iconYeMindNote')) : '';
  const comments = accessories.commentCount ? statusButton('comments', `批注 ${accessories.commentCount}`, symbolIcon('iconYeMindComment')) : '';
  const link = accessories.link ? statusButton('link', accessories.link, '↗') : '';
  const outerFrame = accessories.hasOuterFrame ? statusButton('outer-frame', '已有外框', '□') : '';
  return `<span class="ymz-outline-accessories" contenteditable="false" aria-label="节点附加内容">${todo}${icons}${image}${tags}${note}${comments}${link}${outerFrame}</span>`;
}
