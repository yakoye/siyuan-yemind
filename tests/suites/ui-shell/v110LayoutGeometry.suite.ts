import { describe, expect, it } from 'vitest';
import MindMap from 'simple-mind-map';
import { layoutCatalog } from '../../../src/core/localAssetCatalogs';
import {
  normalizeLayoutAssetId,
  YEMIND_LAYOUT_ASSET_PRESETS,
} from '../../../src/core/layoutAssetPresets';
import {
  layoutGeometryByEngine,
  layoutGeometryForPreset,
} from '../../../src/core/layoutGeometry';
import { registerMindMapLayouts } from '../../../src/core/registerLayouts';
import { PRESET_LAYOUT_CLASSES } from '../../../src/core/PresetLayouts';

describe('v1.1.0 layout geometry catalog', () => {
  it('orders the first structure group as right, left, mind map, reverse and balanced down', () => {
    expect(layoutCatalog.items.slice(0, 5).map((item) => item.id)).toEqual([
      'right-mindmap',
      'left-mindmap',
      'mindmap',
      'reverse-mindmap',
      'balanced-down',
    ]);
  });

  it('gives every gallery preset an explicit geometry contract', () => {
    expect(YEMIND_LAYOUT_ASSET_PRESETS).toHaveLength(28);
    for (const preset of YEMIND_LAYOUT_ASSET_PRESETS) {
      const geometry = layoutGeometryForPreset(preset.id);
      expect(geometry.presetId).toBe(preset.id);
      expect(geometry.engineLayout).toBe(preset.engineLayout);
      expect(['left', 'right', 'top', 'bottom', 'radial']).toContain(geometry.rootGrowth);
      expect(layoutGeometryByEngine(geometry.engineLayout)).toBe(geometry);
    }
  });

  it('does not disguise specialized structures as the old nearest native layout', () => {
    const specialized = [
      'tree-left-down',
      'tree-up-symmetric',
      'tree-right-up',
      'tree-left-up',
      'timeline-left',
      'timeline-up',
      'organization-bidirectional',
      'organization-up',
      'tree-table-top-title',
      'tree-table-left-title',
      'radial-sector',
      'circle',
      'bubble',
    ];
    for (const presetId of specialized) {
      expect(layoutGeometryForPreset(presetId).kind).not.toBe('native');
    }
  });

  it('keeps legacy document layout ids on their closest v1.1.0 preset', () => {
    expect(normalizeLayoutAssetId('', 'logicalStructure')).toBe('right-mindmap');
    expect(normalizeLayoutAssetId('', 'logicalStructureLeft')).toBe('left-mindmap');
    expect(normalizeLayoutAssetId('', 'organizationStructure')).toBe('organization-down');
    expect(normalizeLayoutAssetId('', 'verticalTimeline2')).toBe('timeline-up');
    expect(normalizeLayoutAssetId('', 'rightFishbone2')).toBe('fishbone-right');
  });

  it('lets registered preset ids pass the upstream runtime layout whitelist', () => {
    registerMindMapLayouts();
    const calls: string[] = [];
    const runtime = {
      opt: { layout: 'logicalStructure' },
      view: { reset: () => calls.push('reset') },
      renderer: { setLayout: () => calls.push('set-layout') },
      render: () => calls.push('render'),
      emit: (_event: string, layout: string) => calls.push(`emit:${layout}`),
    };

    (MindMap.prototype as any).setLayout.call(runtime, 'yemindTreeUpSymmetric');

    expect(runtime.opt.layout).toBe('yemindTreeUpSymmetric');
    expect(calls).toEqual(['reset', 'set-layout', 'render', 'emit:yemindTreeUpSymmetric']);
  });

  it('uses dedicated renderers for shapes that are not native upstream layouts', () => {
    expect(PRESET_LAYOUT_CLASSES.yemindTimelineS.name).toBe('SerpentineTimeline');
    expect(PRESET_LAYOUT_CLASSES.yemindTreeTableTop.name).toBe('TreeTableTopLayout');
    expect(PRESET_LAYOUT_CLASSES.yemindTreeTableLeft.name).toBe('TreeTableLeftLayout');
    expect(PRESET_LAYOUT_CLASSES.yemindBracketRight.name).toBe('BracketRightLayout');
    expect(PRESET_LAYOUT_CLASSES.yemindBracketLeft.name).toBe('BracketLeftLayout');
  });
});
