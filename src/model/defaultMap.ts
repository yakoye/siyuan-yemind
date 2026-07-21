import type { MindMapTree, YeMindMapDocument } from './types';

export function createDefaultTree(title: string): MindMapTree {
  return {
    data: { text: title, expand: true },
    children: [
      { data: { text: '主要主题', expand: true }, children: [] },
      { data: { text: '另一个主题', expand: true }, children: [] },
    ],
  };
}

export function createDefaultMap(
  title = '未命名导图',
  id: string = globalThis.crypto?.randomUUID?.() ?? `map-${Date.now()}`,
  now = Date.now(),
): YeMindMapDocument {
  const normalizedTitle = title.trim() || '未命名导图';
  return {
    id,
    title: normalizedTitle,
    createdAt: now,
    updatedAt: now,
    layout: 'logicalStructure',
    theme: 'kmind-default',
    lineStyle: 'curve',
    data: createDefaultTree(normalizedTitle),
  };
}
