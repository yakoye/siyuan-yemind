import { layoutCatalog, type LayoutCatalogItem } from './localAssetCatalogs';
import { layoutGeometryForPreset } from './layoutGeometry';

export interface LayoutAssetPreset extends LayoutCatalogItem {
  engineLayout: string;
}

export const YEMIND_LAYOUT_ASSET_PRESETS: LayoutAssetPreset[] = layoutCatalog.items.map((item) => ({
  ...item,
  engineLayout: layoutGeometryForPreset(item.id).engineLayout,
}));

const LEGACY_ENGINE_LAYOUT_PRESETS: Readonly<Record<string, string>> = {
  logicalStructure: 'right-mindmap',
  logicalStructureLeft: 'left-mindmap',
  mindMap: 'mindmap',
  organizationStructure: 'organization-down',
  catalogOrganization: 'tree-right-down',
  timeline: 'timeline-right',
  timeline2: 'timeline-right',
  verticalTimeline: 'timeline-down',
  verticalTimeline2: 'timeline-up',
  verticalTimeline3: 'timeline-s',
  fishbone: 'fishbone-left',
  fishbone2: 'fishbone-left',
  rightFishbone: 'fishbone-right',
  rightFishbone2: 'fishbone-right',
};

export function normalizeLayoutAssetId(value: unknown, engineLayout?: unknown): string {
  const id = String(value ?? '');
  if (YEMIND_LAYOUT_ASSET_PRESETS.some((item) => item.id === id)) return id;
  const engine = String(engineLayout ?? '');
  return YEMIND_LAYOUT_ASSET_PRESETS.find((item) => item.engineLayout === engine)?.id
    ?? LEGACY_ENGINE_LAYOUT_PRESETS[engine]
    ?? 'right-mindmap';
}

export function getLayoutAssetPreset(id: unknown): LayoutAssetPreset {
  const normalized = normalizeLayoutAssetId(id);
  return YEMIND_LAYOUT_ASSET_PRESETS.find((item) => item.id === normalized) ?? YEMIND_LAYOUT_ASSET_PRESETS[0];
}
