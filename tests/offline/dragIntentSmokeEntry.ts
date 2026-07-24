import {
  emptyOfficialDragCandidate,
  isOfficialDragCandidateNoop,
  resolveOfficialDragCandidate,
  resolveOfficialDragGrowthDirection,
  resolveOfficialDragSiblingAxis,
  supportsOfficialDragGeometry,
} from '../../src/core/officialDragIntent';
import { resolveOutlinePointerDropIntent } from '../../src/editor/outlineDrag';
import { createStableTreeDropState, updateStableTreeDropIntent } from '../../src/core/treeDropIntent';
import {
  createShiftedIncomingLineOverlays,
  restoreShiftedIncomingLineOverlays,
} from '../../src/core/dragPreviewEdges';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function node(uid: string, rect: { x: number; y: number; width: number; height: number }, parent: any = null) {
  return {
    uid,
    rect,
    parent,
    children: [] as any[],
    layerIndex: parent ? Number(parent.layerIndex ?? 0) + 1 : 0,
    dir: 'right',
    getData(key: string) { return key === 'uid' ? uid : undefined; },
  };
}

const parent = node('parent', { x: 20, y: 100, width: 80, height: 40 });
const first = node('first', { x: 160, y: 70, width: 100, height: 36 }, parent);
const second = node('second', { x: 160, y: 180, width: 100, height: 36 }, parent);
parent.children = [first, second];
const options = {
  layout: 'logicalStructure',
  nodes: [parent, first, second],
  current: emptyOfficialDragCandidate(),
  getRect: (value: any) => value.rect,
};

const nearest = resolveOfficialDragCandidate({ ...options, pointer: { x: 290, y: 142 } });
assert(nearest.kind === 'after' && nearest.parentNode === parent && nearest.targetNode === first, 'canvas nearest local target mismatch');
const before = resolveOfficialDragCandidate({ ...options, pointer: { x: 210, y: 179 } });
assert(before.kind === 'before' && before.nextNode === second && before.index === 1, 'canvas BEFORE slot mismatch');
const child = resolveOfficialDragCandidate({ ...options, pointer: { x: 278, y: 88 } });
assert(child.kind === 'child' && child.parentNode === first, 'canvas child tail mismatch');

const source = node('source', { x: 160, y: 10, width: 100, height: 36 }, parent);
parent.children = [source, first, second];
const noopBeforeFirst = resolveOfficialDragCandidate({
  ...options,
  nodes: [first, second],
  pointer: { x: 210, y: 70 },
});
assert(isOfficialDragCandidateNoop(noopBeforeFirst, [source]), 'same canvas slot must be a no-op');


const leftRoot = node('left-root', { x: 360, y: 100, width: 80, height: 32 });
const leftTarget = node('left-target', { x: 220, y: 100, width: 80, height: 32 }, leftRoot);
leftRoot.children = [leftTarget];
const leftOptions = {
  layout: 'logicalStructureLeft',
  nodes: [leftRoot, leftTarget],
  current: emptyOfficialDragCandidate(),
  getRect: (value: any) => value.rect,
};
const leftChild = resolveOfficialDragCandidate({ ...leftOptions, pointer: { x: 206, y: 116 } });
assert(leftChild.kind === 'child' && leftChild.parentNode === leftTarget, 'left logical child zone must mirror the right layout');
const leftBefore = resolveOfficialDragCandidate({ ...leftOptions, pointer: { x: 292, y: 102 } });
assert(leftBefore.kind === 'before' && leftBefore.targetNode === leftTarget, 'left logical sibling zone must mirror the right layout');
const timelineRoot = node('timeline-root', { x: 160, y: 160, width: 90, height: 36 });
const timelineParent = node('timeline-parent', { x: 300, y: 160, width: 90, height: 36 }, timelineRoot);
timelineRoot.children = [timelineParent];
timelineParent.layerIndex = 1;
timelineParent.dir = 'top';
const timelineNativeFirst = node('timeline-native-first', { x: 340, y: 230, width: 80, height: 32 }, timelineParent);
timelineNativeFirst.dir = 'top';
const timelineNativeSecond = node('timeline-native-second', { x: 340, y: 100, width: 80, height: 32 }, timelineParent);
timelineNativeSecond.dir = 'top';
timelineParent.children = [timelineNativeFirst, timelineNativeSecond];
const timelineOptions = {
  layout: 'timeline2',
  nodes: [timelineRoot, timelineParent, timelineNativeFirst, timelineNativeSecond],
  current: emptyOfficialDragCandidate(),
  getRect: (value: any) => value.rect,
};
const timelineBefore = resolveOfficialDragCandidate({ ...timelineOptions, pointer: { x: 380, y: 104 } });
assert(timelineBefore.kind === 'before' && timelineBefore.index === 2, 'top timeline visual/native sibling order mismatch');
const timelineChild = resolveOfficialDragCandidate({ ...timelineOptions, pointer: { x: 380, y: 70 } });
assert(timelineChild.kind === 'child' && timelineChild.parentNode === timelineNativeSecond, 'top timeline child tail mismatch');

assert(resolveOfficialDragSiblingAxis('organizationStructure', leftRoot) === 'x', 'organization siblings must open room horizontally');
assert(resolveOfficialDragGrowthDirection('rightFishbone2', { layerIndex: 0 }) === 'left', 'right fishbone must grow left from the root');
['fishbone', 'fishbone2', 'rightFishbone', 'rightFishbone2'].forEach((layout) => {
  assert(supportsOfficialDragGeometry(layout), `${layout} must use official drag geometry`);
});


const mindRoot = node('mind-root', { x: 400, y: 250, width: 100, height: 50 });
(mindRoot as any).isRoot = true;
const rightOne = node('right-one', { x: 600, y: 160, width: 90, height: 36 }, mindRoot);
const rightTwo = node('right-two', { x: 600, y: 330, width: 90, height: 36 }, mindRoot);
const leftOne = node('left-one', { x: 210, y: 160, width: 90, height: 36 }, mindRoot);
const leftTwo = node('left-two', { x: 210, y: 330, width: 90, height: 36 }, mindRoot);
leftOne.dir = 'left';
leftTwo.dir = 'left';
mindRoot.children = [rightOne, rightTwo, leftOne, leftTwo];
const mindOptions = {
  layout: 'mindMap',
  nodes: [mindRoot, rightOne, rightTwo, leftOne, leftTwo],
  excludedNodes: [rightTwo],
  current: emptyOfficialDragCandidate(),
  getRect: (value: any) => value.rect,
};
const crossBefore = resolveOfficialDragCandidate({ ...mindOptions, pointer: { x: 250, y: 150 } });
assert(crossBefore.kind === 'before' && crossBefore.nextNode === leftOne && crossBefore.branchDirection === 'left', 'right-to-left BEFORE must use the mirrored left branch');
const crossAfter = resolveOfficialDragCandidate({ ...mindOptions, pointer: { x: 250, y: 205 } });
assert(crossAfter.kind === 'after' && crossAfter.nextNode === leftTwo && crossAfter.branchDirection === 'left', 'right-to-left AFTER must preserve left visual order');
const crossChild = resolveOfficialDragCandidate({ ...mindOptions, pointer: { x: 190, y: 178 } });
assert(crossChild.kind === 'child' && crossChild.parentNode === leftOne && crossChild.branchDirection === 'left', 'right-to-left CHILD must inherit the target branch');
const rootLeft = resolveOfficialDragCandidate({ ...mindOptions, pointer: { x: 370, y: 275 } });
assert(rootLeft.kind === 'child' && rootLeft.parentNode === mindRoot && rootLeft.branchDirection === 'left', 'root left tail must create a left root child');
const rootRight = resolveOfficialDragCandidate({ ...mindOptions, excludedNodes: [leftTwo], pointer: { x: 530, y: 275 } });
assert(rootRight.kind === 'child' && rootRight.parentNode === mindRoot && rootRight.branchDirection === 'right', 'root right tail must create a right root child');
assert(crossBefore.key !== resolveOfficialDragCandidate({ ...mindOptions, pointer: { x: 640, y: 150 } }).key, 'left and right root slots must have distinct candidate keys');
assert(!isOfficialDragCandidateNoop(crossBefore, [rightTwo]), 'cross-root branch change must never be discarded as a no-op');
assert(!isOfficialDragCandidateNoop(crossAfter, [rightTwo]), 'branch-local AFTER index must be compared through target references, not the global source index');

const outlineBase = {
  sourceUid: 'source',
  targetUid: 'target',
  clientX: 120,
  clientY: 120,
  rect: { top: 100, height: 40 },
  targetTextLeft: 120,
  targetDepth: 2,
  indentWidth: 22,
  targetAncestors: [
    { uid: 'root', depth: 0 },
    { uid: 'parent', depth: 1 },
    { uid: 'target', depth: 2 },
  ],
};
assert(resolveOutlinePointerDropIntent(outlineBase)?.kind === 'after', 'outline lower half must remain a stable AFTER target');
assert(resolveOutlinePointerDropIntent({ ...outlineBase, clientY: 103 })?.kind === 'before', 'outline BEFORE mismatch');
assert(resolveOutlinePointerDropIntent({ ...outlineBase, clientX: 154 })?.kind === 'child', 'outline CHILD mismatch');
assert(resolveOutlinePointerDropIntent({ ...outlineBase, clientX: 96, clientY: 138 })?.targetUid === 'parent', 'outline parent alignment mismatch');

let state = createStableTreeDropState(emptyOfficialDragCandidate());
state = updateStableTreeDropIntent(state, child, 0);
state = updateStableTreeDropIntent(state, child, 80);
assert(state.stable.kind === 'none', 'child must require dwell');
state = updateStableTreeDropIntent(state, child, 151);
assert(state.stable.key === child.key, 'child dwell did not stabilise');
state = updateStableTreeDropIntent(state, emptyOfficialDragCandidate(), 160);
assert(state.stable.kind === 'none', 'NONE must clear stale target immediately');

const createdLines: any[] = [];
const line = () => ({
  shown: true,
  removed: false,
  renderedTop: -1,
  visible() { return this.shown; },
  fill() { return this; },
  attr() { return this; },
  hide() { this.shown = false; return this; },
  show() { this.shown = true; return this; },
  remove() { this.removed = true; return this; },
});
const firstPreview = { left: 10, top: 10 } as any;
const secondPreview = { left: 40, top: 40 } as any;
const thirdPreview = { left: 70, top: 70 } as any;
const originalLines = [line(), line(), line()];
const previewParent: any = {
  children: [firstPreview, secondPreview, thirdPreview],
  _lines: originalLines,
  lineDraw: { path: () => { const item = line(); createdLines.push(item); return item; } },
  renderer: {
    layout: {
      renderLine(value: any, overlays: any[]) {
        value.children.forEach((item: any, index: number) => {
          overlays[index].renderedTop = item.top;
        });
      },
    },
  },
  style: { getStyle: () => 'curve' },
  styleLine() {},
};
[firstPreview, secondPreview, thirdPreview].forEach((item) => { item.parent = previewParent; });
const previewLines = createShiftedIncomingLineOverlays({ mindMap: {} }, [secondPreview, thirdPreview], { deltaX: 30, deltaY: 50 });
assert(originalLines[0].shown, 'unaffected incoming edge must stay visible');
assert(!originalLines[1].shown && !originalLines[2].shown, 'shifted original edges must be replaced temporarily');
assert(createdLines[1].renderedTop === 90 && createdLines[2].renderedTop === 120, 'preview edges must use shifted endpoints');
assert(secondPreview.left === 40 && thirdPreview.left === 70, 'horizontal preview must restore node geometry');
assert(secondPreview.top === 40 && thirdPreview.top === 70, 'vertical preview must restore node geometry');
restoreShiftedIncomingLineOverlays(previewLines);
assert(originalLines.every((item) => item.shown), 'original edges must restore after preview cleanup');
assert(previewLines.every((item) => item.overlay.removed), 'temporary preview edges must be removed');

export default {
  canvasNearestLocalTarget: true,
  canvasBefore: true,
  canvasChild: true,
  canvasNoop: true,
  outlineFullRowTarget: true,
  outlineParentAlignment: true,
  hierarchyDwell: true,
  staleTargetCleared: true,
  incomingEdgesPreserved: true,
  leftLogicalMirror: true,
  multiLayoutParity: true,
  sameAxisLayoutParity: true,
  vectorRoomPreview: true,
  mindMapCrossRootMirror: true,
};
