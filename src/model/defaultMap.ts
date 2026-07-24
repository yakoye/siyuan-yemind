import type { MindMapTree, YeMindMapDocument } from './types';
import { DEFAULT_PROJECT_STYLE } from '../editor/projectStyle';
import { pristineNodeData } from '../editor/textEditingPolicy';

export function createDefaultTree(_title = '未命名导图'): MindMapTree {
  return {
    data: pristineNodeData({ text: '中心主题', expand: true }),
    children: [],
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
    layoutPresetId: 'right-mindmap',
    theme: 'yemind-default',
    lineStyle: 'curve',
    projectStyle: { ...DEFAULT_PROJECT_STYLE },
    data: createDefaultTree(normalizedTitle),
  };
}
