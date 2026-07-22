import {
  emptyOfficialDragCandidate,
  isOfficialDragCandidateNoop,
  resolveOfficialDragCandidate,
} from '../../src/core/officialDragIntent';
import { resolveOutlinePointerDropIntent } from '../../src/editor/outlineDrag';
import { createStableTreeDropState, updateStableTreeDropIntent } from '../../src/core/treeDropIntent';

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

export default {
  canvasNearestLocalTarget: true,
  canvasBefore: true,
  canvasChild: true,
  canvasNoop: true,
  outlineFullRowTarget: true,
  outlineParentAlignment: true,
  hierarchyDwell: true,
  staleTargetCleared: true,
};
