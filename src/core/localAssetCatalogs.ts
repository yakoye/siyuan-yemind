import markerCatalogJson from '../data/marker-catalog.json';
import clipartCatalogJson from '../data/clipart-catalog.json';
import layoutCatalogJson from '../data/layout-catalog.local.json';
import {
  createYemindAssetResolver,
  getYemindMarkerStyle,
  type MarkerCatalogItem,
} from '../config/yemind-local-assets';

export interface MarkerGroup {
  id: string;
  label: string;
  count: number;
  startIndex: number;
}

export interface MarkerItem extends MarkerCatalogItem {
  id: string;
  groupId: string;
  groupLabel: string;
  orderInGroup: number;
  globalIndex: number;
}

export interface ClipartCategory {
  id: string;
  label: string;
  folder: string;
  count: number;
}

export interface ClipartItem {
  id: string;
  categoryId: string;
  categoryLabel: string;
  folder: string;
  index: number;
  label: string;
  fileName: string;
  relativePath: string;
}

export interface LayoutCatalogItem {
  id: string;
  groupId: string;
  groupLabel: string;
  title: string;
  fileName: string;
  relativePath: string;
}

export const markerCatalog = markerCatalogJson as {
  version: string;
  image: string;
  displaySize: { width: number; height: number };
  iconSize: { width: number; height: number };
  total: number;
  groups: MarkerGroup[];
  items: MarkerItem[];
};

export const clipartCatalog = clipartCatalogJson as {
  version: string;
  total: number;
  categories: ClipartCategory[];
  items: ClipartItem[];
};

export const layoutCatalog = layoutCatalogJson as {
  version: string;
  total: number;
  items: LayoutCatalogItem[];
};

export type YemindAssetResolver = ReturnType<typeof createYemindAssetResolver>;

export function normalizePluginBaseUrl(value: string | undefined): string {
  const normalized = String(value ?? '').trim().replace(/\/+$/g, '');
  return normalized || '/plugins/siyuan-yemind';
}

export function createRuntimeAssetResolver(pluginBaseUrl?: string): YemindAssetResolver {
  return createYemindAssetResolver(normalizePluginBaseUrl(pluginBaseUrl));
}

export function markerValue(item: MarkerItem): string {
  return `yemarker${item.groupId}_${item.id}`;
}

export function markerIdFromValue(value: string): string | null {
  const text = String(value ?? '');
  if (!text.startsWith('yemarker')) return null;
  const separator = text.indexOf('_');
  if (separator < 0) return null;
  const id = text.slice(separator + 1);
  return markerCatalog.items.some((item) => item.id === id) ? id : null;
}

export function markerItemFromValue(value: string): MarkerItem | null {
  const id = markerIdFromValue(value);
  return id ? markerCatalog.items.find((item) => item.id === id) ?? null : null;
}

export function markerGroupForValue(value: string): string | null {
  return markerItemFromValue(value)?.groupId ?? null;
}

function parsePosition(value: string): [number, number] {
  const parts = value.trim().split(/\s+/g).map((part) => Number.parseFloat(part));
  return [Number.isFinite(parts[0]) ? parts[0] : 0, Number.isFinite(parts[1]) ? parts[1] : 0];
}

function xmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function markerSvg(spriteUrl: string, item: MarkerItem): string {
  const [x, y] = parsePosition(item.backgroundPosition);
  const width = markerCatalog.iconSize.width;
  const height = markerCatalog.iconSize.height;
  const patternId = `ymz-marker-${item.groupId}-${item.id}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><defs><pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${width}" height="${height}"><image href="${xmlAttribute(spriteUrl)}" x="${x}" y="${y}" width="${markerCatalog.displaySize.width}" height="${markerCatalog.displaySize.height}" preserveAspectRatio="none"/></pattern></defs><rect width="${width}" height="${height}" fill="url(#${patternId})"/></svg>`;
}

export function createMarkerIconList(pluginBaseUrl?: string): Array<Record<string, unknown>> {
  const resolver = createRuntimeAssetResolver(pluginBaseUrl);
  const sprite = resolver.markerSpriteUrl();
  const groups = markerCatalog.groups.map((group) => ({
    name: group.label,
    type: `yemarker${group.id}`,
    list: markerCatalog.items
      .filter((item) => item.groupId === group.id)
      .map((item) => ({ name: item.id, icon: markerSvg(sprite, item) })),
  }));
  return groups;
}

export function markerButtonStyle(pluginBaseUrl: string | undefined, item: MarkerItem): Record<string, string> {
  return getYemindMarkerStyle(createRuntimeAssetResolver(pluginBaseUrl).markerSpriteUrl(), item);
}

export function searchClipart(query: string, categoryId?: string): ClipartItem[] {
  const keyword = query.trim().toLocaleLowerCase();
  return clipartCatalog.items.filter((item) => {
    if (categoryId && item.categoryId !== categoryId) return false;
    return !keyword || item.label.toLocaleLowerCase().includes(keyword);
  });
}

export function groupLayouts(): Array<{ id: string; label: string; items: LayoutCatalogItem[] }> {
  const output: Array<{ id: string; label: string; items: LayoutCatalogItem[] }> = [];
  for (const item of layoutCatalog.items) {
    let group = output.find((entry) => entry.id === item.groupId);
    if (!group) {
      group = { id: item.groupId, label: item.groupLabel, items: [] };
      output.push(group);
    }
    group.items.push(item);
  }
  return output;
}
