export type LayoutGrowthDirection = 'left' | 'right' | 'top' | 'bottom' | 'radial';
export type LayoutSiblingAxis = 'x' | 'y' | 'radial';
export type LayoutGeometryKind = 'native' | 'derived' | 'specialized';
export type LayoutBranchMode = 'fixed' | 'horizontal' | 'vertical' | 'fishbone' | 'radial';

export interface LayoutGeometryDefinition {
  presetId: string;
  engineLayout: string;
  baseLayout: string;
  kind: LayoutGeometryKind;
  rootGrowth: LayoutGrowthDirection;
  nodeGrowth: LayoutGrowthDirection;
  siblingAxis: LayoutSiblingAxis;
  branchMode: LayoutBranchMode;
  transform?: 'mirror-x' | 'mirror-y' | 'mirror-xy';
}

const definitions: readonly LayoutGeometryDefinition[] = [
  { presetId: 'right-mindmap', engineLayout: 'yemindRightMindMap', baseLayout: 'logicalStructure', kind: 'native', rootGrowth: 'right', nodeGrowth: 'right', siblingAxis: 'y', branchMode: 'fixed' },
  { presetId: 'left-mindmap', engineLayout: 'yemindLeftMindMap', baseLayout: 'logicalStructureLeft', kind: 'native', rootGrowth: 'left', nodeGrowth: 'left', siblingAxis: 'y', branchMode: 'fixed' },
  { presetId: 'mindmap', engineLayout: 'yemindMindMap', baseLayout: 'mindMap', kind: 'native', rootGrowth: 'right', nodeGrowth: 'right', siblingAxis: 'y', branchMode: 'horizontal' },
  { presetId: 'reverse-mindmap', engineLayout: 'yemindReverseMindMap', baseLayout: 'mindMap', kind: 'derived', rootGrowth: 'left', nodeGrowth: 'left', siblingAxis: 'y', branchMode: 'horizontal', transform: 'mirror-x' },
  { presetId: 'balanced-down', engineLayout: 'yemindBalancedDown', baseLayout: 'organizationStructure', kind: 'specialized', rootGrowth: 'bottom', nodeGrowth: 'bottom', siblingAxis: 'x', branchMode: 'vertical' },

  { presetId: 'tree-right-down', engineLayout: 'yemindTreeRightDown', baseLayout: 'catalogOrganization', kind: 'native', rootGrowth: 'bottom', nodeGrowth: 'right', siblingAxis: 'y', branchMode: 'fixed' },
  { presetId: 'tree-left-down', engineLayout: 'yemindTreeLeftDown', baseLayout: 'catalogOrganization', kind: 'derived', rootGrowth: 'bottom', nodeGrowth: 'left', siblingAxis: 'y', branchMode: 'fixed', transform: 'mirror-x' },
  { presetId: 'tree-down-symmetric', engineLayout: 'yemindTreeDownSymmetric', baseLayout: 'organizationStructure', kind: 'native', rootGrowth: 'bottom', nodeGrowth: 'bottom', siblingAxis: 'x', branchMode: 'fixed' },
  { presetId: 'tree-up-symmetric', engineLayout: 'yemindTreeUpSymmetric', baseLayout: 'organizationStructure', kind: 'derived', rootGrowth: 'top', nodeGrowth: 'top', siblingAxis: 'x', branchMode: 'fixed', transform: 'mirror-y' },
  { presetId: 'tree-right-up', engineLayout: 'yemindTreeRightUp', baseLayout: 'catalogOrganization', kind: 'derived', rootGrowth: 'top', nodeGrowth: 'right', siblingAxis: 'y', branchMode: 'fixed', transform: 'mirror-y' },
  { presetId: 'tree-left-up', engineLayout: 'yemindTreeLeftUp', baseLayout: 'catalogOrganization', kind: 'derived', rootGrowth: 'top', nodeGrowth: 'left', siblingAxis: 'y', branchMode: 'fixed', transform: 'mirror-xy' },

  { presetId: 'timeline-right', engineLayout: 'yemindTimelineRight', baseLayout: 'timeline', kind: 'native', rootGrowth: 'right', nodeGrowth: 'bottom', siblingAxis: 'y', branchMode: 'fixed' },
  { presetId: 'timeline-left', engineLayout: 'yemindTimelineLeft', baseLayout: 'timeline', kind: 'derived', rootGrowth: 'left', nodeGrowth: 'bottom', siblingAxis: 'y', branchMode: 'fixed', transform: 'mirror-x' },
  { presetId: 'timeline-down', engineLayout: 'yemindTimelineDown', baseLayout: 'verticalTimeline', kind: 'native', rootGrowth: 'bottom', nodeGrowth: 'bottom', siblingAxis: 'y', branchMode: 'fixed' },
  { presetId: 'timeline-up', engineLayout: 'yemindTimelineUp', baseLayout: 'verticalTimeline', kind: 'derived', rootGrowth: 'top', nodeGrowth: 'top', siblingAxis: 'y', branchMode: 'fixed', transform: 'mirror-y' },
  { presetId: 'timeline-s', engineLayout: 'yemindTimelineS', baseLayout: 'timeline', kind: 'specialized', rootGrowth: 'right', nodeGrowth: 'right', siblingAxis: 'x', branchMode: 'horizontal' },

  { presetId: 'organization-down', engineLayout: 'yemindOrganizationDown', baseLayout: 'organizationStructure', kind: 'native', rootGrowth: 'bottom', nodeGrowth: 'bottom', siblingAxis: 'x', branchMode: 'fixed' },
  { presetId: 'organization-bidirectional', engineLayout: 'yemindOrganizationBidirectional', baseLayout: 'organizationStructure', kind: 'specialized', rootGrowth: 'bottom', nodeGrowth: 'bottom', siblingAxis: 'x', branchMode: 'vertical' },
  { presetId: 'organization-up', engineLayout: 'yemindOrganizationUp', baseLayout: 'organizationStructure', kind: 'derived', rootGrowth: 'top', nodeGrowth: 'top', siblingAxis: 'x', branchMode: 'fixed', transform: 'mirror-y' },

  { presetId: 'fishbone-left', engineLayout: 'yemindFishboneLeft', baseLayout: 'fishbone2', kind: 'native', rootGrowth: 'right', nodeGrowth: 'right', siblingAxis: 'y', branchMode: 'fishbone' },
  { presetId: 'fishbone-right', engineLayout: 'yemindFishboneRight', baseLayout: 'rightFishbone2', kind: 'derived', rootGrowth: 'left', nodeGrowth: 'left', siblingAxis: 'y', branchMode: 'fishbone', transform: 'mirror-x' },

  { presetId: 'tree-table-top-title', engineLayout: 'yemindTreeTableTop', baseLayout: 'organizationStructure', kind: 'specialized', rootGrowth: 'bottom', nodeGrowth: 'bottom', siblingAxis: 'x', branchMode: 'fixed' },
  { presetId: 'tree-table-left-title', engineLayout: 'yemindTreeTableLeft', baseLayout: 'logicalStructure', kind: 'specialized', rootGrowth: 'right', nodeGrowth: 'right', siblingAxis: 'y', branchMode: 'fixed' },

  { presetId: 'radial-sector', engineLayout: 'yemindRadialSector', baseLayout: 'mindMap', kind: 'specialized', rootGrowth: 'radial', nodeGrowth: 'radial', siblingAxis: 'radial', branchMode: 'radial' },
  { presetId: 'circle', engineLayout: 'yemindCircle', baseLayout: 'mindMap', kind: 'specialized', rootGrowth: 'radial', nodeGrowth: 'radial', siblingAxis: 'radial', branchMode: 'radial' },
  { presetId: 'bubble', engineLayout: 'yemindBubble', baseLayout: 'mindMap', kind: 'specialized', rootGrowth: 'radial', nodeGrowth: 'radial', siblingAxis: 'radial', branchMode: 'radial' },
  { presetId: 'bracket-right', engineLayout: 'yemindBracketRight', baseLayout: 'logicalStructure', kind: 'specialized', rootGrowth: 'right', nodeGrowth: 'right', siblingAxis: 'y', branchMode: 'fixed' },
  { presetId: 'bracket-left', engineLayout: 'yemindBracketLeft', baseLayout: 'logicalStructureLeft', kind: 'specialized', rootGrowth: 'left', nodeGrowth: 'left', siblingAxis: 'y', branchMode: 'fixed' },
] as const;

const byPreset = new Map(definitions.map((definition) => [definition.presetId, definition]));
const byEngine = new Map(definitions.map((definition) => [definition.engineLayout, definition]));

export const YEMIND_LAYOUT_GEOMETRIES = definitions;
export const YEMIND_LAYOUT_ENGINE_IDS = definitions.map((definition) => definition.engineLayout);

export function layoutGeometryForPreset(presetId: unknown): LayoutGeometryDefinition {
  return byPreset.get(String(presetId ?? '')) ?? byPreset.get('right-mindmap')!;
}

export function layoutGeometryByEngine(engineLayout: unknown): LayoutGeometryDefinition | null {
  return byEngine.get(String(engineLayout ?? '')) ?? null;
}

function normalizedDirection(value: unknown): 'left' | 'right' | 'top' | 'bottom' | null {
  const direction = String(value ?? '').toLowerCase();
  if (direction === 'left' || direction === 'right' || direction === 'top' || direction === 'bottom') {
    return direction;
  }
  return null;
}

export function resolveLayoutGrowthDirection(
  engineLayout: unknown,
  node: any,
): 'left' | 'right' | 'top' | 'bottom' | null {
  const geometry = layoutGeometryByEngine(engineLayout);
  if (!geometry) return null;
  const layer = Number(node?.layerIndex ?? 0);
  if (layer === 0 || node?.isRoot) {
    return geometry.rootGrowth === 'radial' ? 'right' : geometry.rootGrowth;
  }
  const direction = normalizedDirection(
    node?.dir
      ?? node?.direction
      ?? node?.getData?.('dir')
      ?? node?.getData?.('direction'),
  );
  if (geometry.branchMode === 'horizontal' && (direction === 'left' || direction === 'right')) {
    return direction;
  }
  if (geometry.branchMode === 'vertical' && (direction === 'top' || direction === 'bottom')) {
    return direction;
  }
  if (geometry.branchMode === 'fishbone' && (direction === 'top' || direction === 'bottom')) {
    return direction;
  }
  if (geometry.branchMode === 'radial' && direction) return direction;
  return geometry.nodeGrowth === 'radial' ? geometry.rootGrowth === 'radial' ? 'right' : geometry.rootGrowth : geometry.nodeGrowth;
}

export function resolveLayoutSiblingAxis(
  engineLayout: unknown,
): 'x' | 'y' | null {
  const axis = layoutGeometryByEngine(engineLayout)?.siblingAxis;
  return axis === 'radial' || !axis ? null : axis;
}
