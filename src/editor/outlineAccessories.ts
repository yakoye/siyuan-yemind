import type { MindMapNodeData } from '../model/types';
import { createRuntimeAssetResolver, markerItemFromValue, markerSvg } from '../core/localAssetCatalogs';

export interface OutlineAccessoryImage {
  url: string;
  title: string;
  clipartId?: string;
}

export interface OutlineAccessories {
  icons: string[];
  image: OutlineAccessoryImage | null;
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

function normalizeIcons(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];
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
  return { icons: normalizeIcons(data.icon), image };
}

function iconHtml(value: string, pluginBaseUrl?: string): string {
  const marker = markerItemFromValue(value);
  if (marker) {
    const resolver = createRuntimeAssetResolver(pluginBaseUrl);
    return `<span class="ymz-outline-accessories__icon ymz-outline-accessories__icon--marker" data-outline-icon="${escapeAttribute(value)}" title="${escapeAttribute(marker.id)}">${markerSvg(resolver.markerSpriteUrl(), marker)}</span>`;
  }
  const label = LEGACY_ICON_LABELS[value] ?? '•';
  return `<span class="ymz-outline-accessories__icon ymz-outline-accessories__icon--legacy" data-outline-icon="${escapeAttribute(value)}" title="${escapeAttribute(value)}">${escapeAttribute(label)}</span>`;
}

export function outlineAccessoriesHtml(accessories: OutlineAccessories, pluginBaseUrl?: string): string {
  if (!accessories.icons.length && !accessories.image) return '';
  const icons = accessories.icons.map((value) => iconHtml(value, pluginBaseUrl)).join('');
  const image = accessories.image
    ? `<button type="button" class="ymz-outline-accessories__image${accessories.image.clipartId ? ' is-clipart' : ''}" data-outline-image-preview tabindex="-1" title="${escapeAttribute(accessories.image.title || (accessories.image.clipartId ? '剪贴图' : '图片'))}"><img src="${escapeAttribute(accessories.image.url)}" alt="" loading="lazy" draggable="false"></button>`
    : '';
  return `<span class="ymz-outline-accessories" contenteditable="false" aria-label="节点附加内容">${icons}${image}</span>`;
}
