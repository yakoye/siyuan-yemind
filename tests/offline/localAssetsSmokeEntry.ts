import {
  clipartCatalog,
  createMarkerIconList,
  createRuntimeAssetResolver,
  layoutCatalog,
  markerCatalog,
  searchClipart,
} from '../../src/core/localAssetCatalogs';
import { YEMIND_LAYOUT_ASSET_PRESETS } from '../../src/core/layoutAssetPresets';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const assets = createRuntimeAssetResolver('/plugins/siyuan-yemind');
const icons = createMarkerIconList('/plugins/siyuan-yemind');
assert(markerCatalog.total === 126, 'marker count');
assert(clipartCatalog.total === 806, 'clipart count');
assert(layoutCatalog.total === 28, 'layout count');
assert(icons.flatMap((group: any) => group.list).length === 126, 'marker icon list');
assert(searchClipart('河马')[0]?.id === 'animal-001', 'clipart search');
assert(YEMIND_LAYOUT_ASSET_PRESETS.length === 28, 'layout presets');
assert(assets.markerSpriteUrl() === '/plugins/siyuan-yemind/assets/icons/marker-sprite.png', 'runtime URL');

export default {
  markers: markerCatalog.total,
  markerGroups: markerCatalog.groups.length,
  clipart: clipartCatalog.total,
  clipartCategories: clipartCatalog.categories.length,
  layouts: layoutCatalog.total,
  runtimeResolver: true,
  embeddedLargeAssets: false,
};
