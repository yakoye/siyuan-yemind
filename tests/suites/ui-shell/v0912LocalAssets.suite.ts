import { describe, expect, it } from 'vitest';
import {
  clipartCatalog,
  createMarkerIconList,
  createRuntimeAssetResolver,
  layoutCatalog,
  markerCatalog,
  markerItemFromValue,
  markerValue,
  searchClipart,
} from '../../../src/core/localAssetCatalogs';
import { YEMIND_LAYOUT_ASSET_PRESETS, getLayoutAssetPreset } from '../../../src/core/layoutAssetPresets';


describe('v0.9.12 fixed local assets', () => {
  it('uses catalogs as the runtime source of truth', () => {
    expect(markerCatalog.total).toBe(126);
    expect(markerCatalog.groups).toHaveLength(8);
    expect(clipartCatalog.total).toBe(806);
    expect(clipartCatalog.categories).toHaveLength(13);
    expect(layoutCatalog.total).toBe(28);
    expect(YEMIND_LAYOUT_ASSET_PRESETS).toHaveLength(28);
  });

  it('resolves local asset URLs from the real plugin base URL', () => {
    const assets = createRuntimeAssetResolver('/plugins/custom-yemind/');
    expect(assets.markerSpriteUrl()).toBe('/plugins/custom-yemind/assets/icons/marker-sprite.png');
    expect(assets.clipartUrl('clipart/01_动物/001_河马.svg')).toBe('/plugins/custom-yemind/assets/clipart/01_动物/001_河马.svg');
    expect(assets.layoutUrl('layout-thumbnails/01_mindmap/01_mindmap.svg')).toBe('/plugins/custom-yemind/assets/layout-thumbnails/01_mindmap/01_mindmap.svg');
  });

  it('builds all marker icons without embedding the PNG as Base64', () => {
    const list = createMarkerIconList('/plugins/siyuan-yemind');
    const local = list;
    expect(local).toHaveLength(8);
    expect(local.flatMap((group: any) => group.list)).toHaveLength(126);
    const first = markerCatalog.items[0];
    const value = markerValue(first);
    expect(markerItemFromValue(value)?.id).toBe(first.id);
    expect(JSON.stringify(local)).toContain('/plugins/siyuan-yemind/assets/icons/marker-sprite.png');
    expect(JSON.stringify(local)).not.toContain('data:image/png;base64');
  });

  it('searches clipart by label and category', () => {
    expect(searchClipart('河马').some((item) => item.id === 'animal-001')).toBe(true);
    expect(searchClipart('', 'animal')).toHaveLength(60);
    expect(searchClipart('河马', 'technology')).toHaveLength(0);
  });

  it('maps each visual layout preset to a supported engine layout', () => {
    for (const preset of YEMIND_LAYOUT_ASSET_PRESETS) {
      expect(preset.engineLayout).toBeTruthy();
      expect(preset.relativePath.endsWith('.svg')).toBe(true);
    }
    expect(getLayoutAssetPreset('right-mindmap').engineLayout).toBe('logicalStructure');
    expect(getLayoutAssetPreset('fishbone-right').engineLayout).toContain('Fishbone');
  });
});
