import type { MindMapTree, YeMindMapDocument } from './types';
import { DEFAULT_PROJECT_STYLE } from '../editor/projectStyle';
import { pristineNodeData } from '../editor/textEditingPolicy';

export function createDefaultTree(title: string): MindMapTree {
  return {
    data: pristineNodeData({ text: title, expand: true }),
    children: [
      { data: pristineNodeData({ text: '主要主题', expand: true }), children: [] },
      { data: pristineNodeData({ text: '另一个主题', expand: true }), children: [] },
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
    projectStyle: { ...DEFAULT_PROJECT_STYLE },
    data: createDefaultTree(normalizedTitle),
  };
}
