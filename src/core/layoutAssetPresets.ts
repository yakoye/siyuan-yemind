import { layoutCatalog, type LayoutCatalogItem } from './localAssetCatalogs';
import { normalizeLayoutId } from './layoutPresets';

export interface LayoutAssetPreset extends LayoutCatalogItem {
  engineLayout: string;
}

const ENGINE_LAYOUT_BY_ASSET_ID: Record<string, string> = {
  mindmap: 'mindMap',
  'reverse-mindmap': 'logicalStructureLeft',
  'balanced-down': 'mindMap',
  'right-mindmap': 'logicalStructure',
  'left-mindmap': 'logicalStructureLeft',
  'tree-right-down': 'catalogOrganization',
  'tree-left-down': 'catalogOrganization',
  'tree-down-symmetric': 'organizationStructure',
  'tree-up-symmetric': 'organizationStructure',
  'tree-right-up': 'catalogOrganization',
  'tree-left-up': 'catalogOrganization',
  'timeline-right': 'timeline',
  'timeline-left': 'timeline2',
  'timeline-down': 'verticalTimeline',
  'timeline-up': 'verticalTimeline2',
  'timeline-s': 'verticalTimeline3',
  'organization-down': 'organizationStructure',
  'organization-bidirectional': 'catalogOrganization',
  'organization-up': 'organizationStructure',
  'fishbone-left': 'fishbone2',
  'fishbone-right': 'rightFishbone2',
  'tree-table-top-title': 'catalogOrganization',
  'tree-table-left-title': 'logicalStructure',
  'radial-sector': 'mindMap',
  circle: 'mindMap',
  bubble: 'mindMap',
  'bracket-right': 'logicalStructure',
  'bracket-left': 'logicalStructureLeft',
};

export const YEMIND_LAYOUT_ASSET_PRESETS: LayoutAssetPreset[] = layoutCatalog.items.map((item) => ({
  ...item,
  engineLayout: normalizeLayoutId(ENGINE_LAYOUT_BY_ASSET_ID[item.id] ?? 'logicalStructure'),
}));

export function normalizeLayoutAssetId(value: unknown, engineLayout?: unknown): string {
  const id = String(value ?? '');
  if (YEMIND_LAYOUT_ASSET_PRESETS.some((item) => item.id === id)) return id;
  const engine = normalizeLayoutId(engineLayout);
  return YEMIND_LAYOUT_ASSET_PRESETS.find((item) => item.engineLayout === engine)?.id ?? 'right-mindmap';
}

export function getLayoutAssetPreset(id: unknown): LayoutAssetPreset {
  const normalized = normalizeLayoutAssetId(id);
  return YEMIND_LAYOUT_ASSET_PRESETS.find((item) => item.id === normalized) ?? YEMIND_LAYOUT_ASSET_PRESETS[0];
}
