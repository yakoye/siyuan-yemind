import { shouldPassivelySyncOutline } from '../../src/editor/editingSurfaceCoordinator';
import { markerCatalog, markerSvg } from '../../src/core/localAssetCatalogs';
import { nodeInsertIcon, nodeStyleIcon } from '../../src/editor/projectControls';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(shouldPassivelySyncOutline('canvas'), 'canvas activation must be passive');
assert(shouldPassivelySyncOutline('none'), 'initial map activation must be passive');
assert(!shouldPassivelySyncOutline('outline'), 'outline-owned activation must preserve editor selection');

const svg = markerSvg('/plugins/siyuan-yemind/assets/icons/marker-sprite.png', markerCatalog.items[0]);
assert(svg.includes('overflow="hidden"'), 'marker root must clip visual and hit-test overflow');
assert(svg.includes('pointer-events="none"'), 'sprite image must not create an oversized hit target');

assert(nodeInsertIcon('sibling').includes('ymz-icon-insert-sibling'), 'sibling insertion icon');
assert(nodeInsertIcon('child').includes('ymz-icon-insert-child'), 'child insertion icon');
assert(nodeInsertIcon('parent').includes('ymz-icon-insert-parent'), 'parent insertion icon');
assert(nodeStyleIcon().includes('ymz-menu-icon') && nodeStyleIcon().includes('ymz-icon-node-style'), 'node style icon must use menu geometry');

export default {
  passiveCanvasOutlineSync: true,
  markerHitAreaClipped: true,
  insertionIcons: true,
};
