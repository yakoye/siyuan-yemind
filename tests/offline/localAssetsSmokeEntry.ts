import { fitClipartSize, parseSvgIntrinsicSize } from '../../src/core/clipartGeometry';
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
assert(clipartCatalog.total === 764, 'clipart count');
assert(layoutCatalog.total === 28, 'layout count');
assert(icons.flatMap((group: any) => group.list).length === 126, 'marker icon list');
assert(searchClipart('河马')[0]?.id === 'animal-001', 'clipart search');
assert(YEMIND_LAYOUT_ASSET_PRESETS.length === 28, 'layout presets');
assert(assets.markerSpriteUrl() === '/plugins/siyuan-yemind/assets/icons/marker-sprite.png', 'runtime URL');
const landscape = parseSvgIntrinsicSize('<svg width="160" height="80"></svg>');
const portrait = parseSvgIntrinsicSize('<svg viewBox="0 0 80 160"></svg>');
assert(landscape?.width === 160 && landscape.height === 80, 'explicit SVG geometry');
assert(portrait?.width === 80 && portrait.height === 160, 'viewBox SVG geometry');
const landscapeFit = fitClipartSize(landscape!);
const portraitFit = fitClipartSize(portrait!);
assert(landscapeFit.width === 48 && landscapeFit.height === 24, 'landscape ratio');
assert(portraitFit.width === 24 && portraitFit.height === 48, 'portrait ratio');

export default {
  markers: markerCatalog.total,
  markerGroups: markerCatalog.groups.length,
  clipart: clipartCatalog.total,
  clipartCategories: clipartCatalog.categories.length,
  layouts: layoutCatalog.total,
  runtimeResolver: true,
  embeddedLargeAssets: false,
  proportionalClipartGeometry: true,
};
