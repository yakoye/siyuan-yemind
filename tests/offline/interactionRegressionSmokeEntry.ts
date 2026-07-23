import { hasActiveNodeWidthDrag, LiveNodeWidthLayoutController } from '../../src/editor/liveNodeWidthLayout';
import { shouldPassivelySyncOutline } from '../../src/editor/editingSurfaceCoordinator';
import { markerCatalog, markerSvg } from '../../src/core/localAssetCatalogs';
import { nodeInsertIcon, nodeStyleIcon } from '../../src/editor/projectControls';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const draggingChild = { isDragHandleMousedown: true, children: [] };
const root = { isDragHandleMousedown: false, children: [{ isDragHandleMousedown: false, children: [draggingChild] }] };
assert(hasActiveNodeWidthDrag(root), 'descendant width drag must trigger live layout');
assert(!hasActiveNodeWidthDrag({ children: [{ children: [] }] }), 'idle tree must not trigger live layout');

let mousemove: EventListener | null = null;
let frameCallback: FrameRequestCallback | null = null;
let renderCount = 0;
const widthController = new LiveNodeWidthLayoutController(
  { renderer: { root }, render: () => { renderCount += 1; } },
  {
    addEventListener: (_name: string, listener: EventListenerOrEventListenerObject) => { mousemove = listener as EventListener; },
    removeEventListener: () => { mousemove = null; },
  } as any,
  {
    request: (callback) => { frameCallback = callback; return 1; },
    cancel: () => undefined,
  },
);
mousemove?.({} as Event);
if (renderCount !== 0 || !frameCallback) throw new Error('full layout must be animation-frame throttled');
(frameCallback as FrameRequestCallback)(0);
if (Number(renderCount) !== 1) throw new Error('drag frame must render the complete tree once');
widthController.destroy();

assert(shouldPassivelySyncOutline('canvas'), 'canvas activation must be passive');
assert(shouldPassivelySyncOutline('none'), 'initial map activation must be passive');
assert(!shouldPassivelySyncOutline('outline'), 'outline-owned activation must preserve editor selection');

const svg = markerSvg('/plugins/siyuan-yemind/assets/icons/marker-sprite.png', markerCatalog.items[0]);
assert(svg.includes('overflow="hidden"'), 'marker root must clip visual and hit-test overflow');
assert(svg.includes('pointer-events="none"'), 'sprite image must not create an oversized hit target');

assert(nodeInsertIcon('sibling').includes('ymz-icon-insert-sibling'), 'sibling insertion icon');
assert(nodeInsertIcon('child').includes('ymz-icon-insert-child'), 'child insertion icon');
assert(nodeInsertIcon('parent').includes('ymz-icon-insert-parent'), 'parent insertion icon');
assert(nodeStyleIcon().includes('ymz-menu-icon ymz-icon-node-style'), 'node style icon must use menu geometry');

export default {
  liveWidthDragDetected: true,
  liveWidthTreeRender: true,
  passiveCanvasOutlineSync: true,
  markerHitAreaClipped: true,
  insertionIcons: true,
};
