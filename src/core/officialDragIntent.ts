import {
  clamp,
  distanceToRange,
  type TreeDropIntent,
} from './treeDropIntent';

export interface OfficialDragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OfficialDragPoint {
  x: number;
  y: number;
}

export interface OfficialDragCandidate extends TreeDropIntent<any> {
  overlapNode: any | null;
  prevNode: any | null;
  nextNode: any | null;
  targetNode: any | null;
  parentNode: any | null;
  score: number;
}

export interface ResolveOfficialDragCandidateOptions {
  layout: string;
  pointer?: OfficialDragPoint;
  /** Compatibility fallback for older tests/callers. Only its center is used. */
  ghost?: OfficialDragRect;
  nodes: any[];
  excludedNodes?: any[];
  current: OfficialDragCandidate;
  getRect: (node: any) => OfficialDragRect | null;
}

export type OfficialDragGrowthDirection = 'left' | 'right' | 'top' | 'bottom';
type SiblingAxis = 'x' | 'y';

interface SlotIntent {
  parent: any;
  siblings: any[];
  nativeSiblings: any[];
  visualIndex: number;
  nativeIndex: number;
  score: number;
  axisDistance: number;
  targetNode: any | null;
  kind: 'before' | 'after';
}

interface ChildIntent {
  node: any;
  score: number;
  fromTail: boolean;
  insideBody: boolean;
}

const CHILD_TAIL_LENGTH = 54;
const CHILD_CROSS_PADDING = 9;
const CHILD_BODY_PADDING = 4;
const SIBLING_SLOT_RADIUS = 7;
const SIBLING_CROSS_PADDING = 38;

const OFFICIAL_GEOMETRY_LAYOUTS = new Set([
  'logicalStructure',
  'logicalStructureLeft',
  'mindMap',
  'organizationStructure',
  'catalogOrganization',
  'timeline',
  'timeline2',
  'verticalTimeline',
  'verticalTimeline2',
  'verticalTimeline3',
]);

export function supportsOfficialDragGeometry(layout: string): boolean {
  return OFFICIAL_GEOMETRY_LAYOUTS.has(String(layout));
}

export function emptyOfficialDragCandidate(): OfficialDragCandidate {
  return {
    key: 'none',
    kind: 'none',
    target: null,
    parent: null,
    index: -1,
    overlapNode: null,
    prevNode: null,
    nextNode: null,
    targetNode: null,
    parentNode: null,
    score: Number.POSITIVE_INFINITY,
  };
}

function finiteRect(rect: OfficialDragRect | null | undefined): rect is OfficialDragRect {
  return Boolean(
    rect &&
      [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
      rect.width > 0 &&
      rect.height > 0,
  );
}

function nodeUid(node: any): string {
  if (!node) return '';
  const value = typeof node.getData === 'function' ? node.getData('uid') : node.uid;
  return String(value ?? '');
}

function rectCenter(rect: OfficialDragRect): OfficialDragPoint {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function containsPoint(rect: OfficialDragRect, point: OfficialDragPoint): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function expandRect(rect: OfficialDragRect, x: number, y = x): OfficialDragRect {
  return {
    x: rect.x - x,
    y: rect.y - y,
    width: rect.width + x * 2,
    height: rect.height + y * 2,
  };
}

function pointFromOptions(options: ResolveOfficialDragCandidateOptions): OfficialDragPoint | null {
  if (options.pointer && Number.isFinite(options.pointer.x) && Number.isFinite(options.pointer.y)) {
    return options.pointer;
  }
  return finiteRect(options.ghost) ? rectCenter(options.ghost) : null;
}

function normalizedDirection(value: unknown): OfficialDragGrowthDirection | null {
  const direction = String(value ?? '').toLowerCase();
  if (direction === 'left' || direction === 'right' || direction === 'top' || direction === 'bottom') {
    return direction;
  }
  return null;
}

export function resolveOfficialDragGrowthDirection(layout: string, node: any): OfficialDragGrowthDirection {
  switch (layout) {
    case 'logicalStructureLeft':
      return 'left';
    case 'mindMap':
      return normalizedDirection(node?.dir) === 'left' ? 'left' : 'right';
    case 'organizationStructure':
    case 'catalogOrganization':
      return 'bottom';
    case 'timeline':
      return Number(node?.layerIndex ?? 0) === 0 ? 'right' : 'bottom';
    case 'timeline2': {
      const layer = Number(node?.layerIndex ?? 0);
      if (layer === 0) return 'right';
      return normalizedDirection(node?.dir) === 'top' ? 'top' : 'bottom';
    }
    case 'verticalTimeline':
    case 'verticalTimeline2':
    case 'verticalTimeline3':
      return Number(node?.layerIndex ?? 0) === 0
        ? 'bottom'
        : normalizedDirection(node?.dir) ?? 'right';
    case 'logicalStructure':
    default:
      return 'right';
  }
}

export function resolveOfficialDragGuideOrientation(
  layout: string,
  node: any,
): 'horizontal' | 'vertical' {
  const direction = resolveOfficialDragGrowthDirection(layout, node);
  return direction === 'top' || direction === 'bottom' ? 'vertical' : 'horizontal';
}

function siblingAxis(layout: string, parent: any): SiblingAxis {
  switch (layout) {
    case 'organizationStructure':
      return 'x';
    case 'catalogOrganization':
    case 'timeline':
    case 'timeline2':
      return Number(parent?.layerIndex ?? 0) === 0 ? 'x' : 'y';
    default:
      return 'y';
  }
}

function reversesVisualSiblingOrder(layout: string, parent: any): boolean {
  return (
    layout === 'timeline2' &&
    Number(parent?.layerIndex ?? 0) === 1 &&
    normalizedDirection(parent?.dir) === 'top'
  );
}

function tailRect(
  rect: OfficialDragRect,
  direction: OfficialDragGrowthDirection,
): OfficialDragRect {
  switch (direction) {
    case 'left':
      return {
        x: rect.x - CHILD_TAIL_LENGTH,
        y: rect.y - CHILD_CROSS_PADDING,
        width: CHILD_TAIL_LENGTH,
        height: rect.height + CHILD_CROSS_PADDING * 2,
      };
    case 'top':
      return {
        x: rect.x - CHILD_CROSS_PADDING,
        y: rect.y - CHILD_TAIL_LENGTH,
        width: rect.width + CHILD_CROSS_PADDING * 2,
        height: CHILD_TAIL_LENGTH,
      };
    case 'bottom':
      return {
        x: rect.x - CHILD_CROSS_PADDING,
        y: rect.y + rect.height,
        width: rect.width + CHILD_CROSS_PADDING * 2,
        height: CHILD_TAIL_LENGTH,
      };
    case 'right':
    default:
      return {
        x: rect.x + rect.width,
        y: rect.y - CHILD_CROSS_PADDING,
        width: CHILD_TAIL_LENGTH,
        height: rect.height + CHILD_CROSS_PADDING * 2,
      };
  }
}

function branchFilteredSiblings(
  layout: string,
  parent: any,
  siblings: any[],
  pointer: OfficialDragPoint,
  getRect: (node: any) => OfficialDragRect | null,
): any[] {
  if (layout !== 'mindMap') return siblings;
  const parentRect = getRect(parent);
  if (!finiteRect(parentRect)) return siblings;
  const branch = pointer.x < rectCenter(parentRect).x ? 'left' : 'right';
  const filtered = siblings.filter((node) => {
    const direction = normalizedDirection(node?.dir);
    if (direction === 'left' || direction === 'right') return direction === branch;
    const rect = getRect(node);
    return finiteRect(rect)
      ? (rectCenter(rect).x < rectCenter(parentRect).x ? 'left' : 'right') === branch
      : false;
  });
  return filtered.length > 0 ? filtered : siblings;
}

function orderedSiblings(
  layout: string,
  parent: any,
  available: Set<any>,
  pointer: OfficialDragPoint,
  getRect: (node: any) => OfficialDragRect | null,
): any[] {
  let siblings = Array.isArray(parent?.children)
    ? parent.children.filter((child: any) => available.has(child) && finiteRect(getRect(child)))
    : [];
  siblings = branchFilteredSiblings(layout, parent, siblings, pointer, getRect);
  const axis = siblingAxis(layout, parent);
  return [...siblings].sort((a, b) => {
    const aRect = getRect(a)!;
    const bRect = getRect(b)!;
    const delta = axis === 'x'
      ? rectCenter(aRect).x - rectCenter(bRect).x
      : rectCenter(aRect).y - rectCenter(bRect).y;
    return Math.abs(delta) > 0.5 ? delta : nodeUid(a).localeCompare(nodeUid(b));
  });
}

function resolveSiblingSlot(
  options: ResolveOfficialDragCandidateOptions,
  pointer: OfficialDragPoint,
): SlotIntent | null {
  const excluded = new Set(options.excludedNodes ?? []);
  const available = new Set(options.nodes.filter((node) => !excluded.has(node)));
  const seenParents = new Set<any>();
  let best: SlotIntent | null = null;

  options.nodes.forEach((node) => {
    if (excluded.has(node)) return;
    const parent = node?.parent;
    if (!parent || seenParents.has(parent)) return;
    seenParents.add(parent);
    const siblings = orderedSiblings(options.layout, parent, available, pointer, options.getRect);
    if (siblings.length === 0) return;
    const nativeSiblings = Array.isArray(parent.children)
      ? parent.children.filter((child: any) => siblings.includes(child))
      : [];
    const axis = siblingAxis(options.layout, parent);
    const rects = siblings.map(options.getRect).filter(finiteRect);
    const minCross = Math.min(...rects.map((rect) => axis === 'y' ? rect.x : rect.y));
    const maxCross = Math.max(...rects.map((rect) => axis === 'y' ? rect.x + rect.width : rect.y + rect.height));
    const crossValue = axis === 'y' ? pointer.x : pointer.y;
    const crossDistance = distanceToRange(
      crossValue,
      minCross - SIBLING_CROSS_PADDING,
      maxCross + SIBLING_CROSS_PADDING,
    );
    if (crossDistance > SIBLING_CROSS_PADDING) return;

    const slots: Array<{ coordinate: number; visualIndex: number; targetNode: any; kind: 'before' | 'after' }> = [];
    siblings.forEach((sibling, index) => {
      const rect = options.getRect(sibling);
      if (!finiteRect(rect)) return;
      slots.push({
        coordinate: axis === 'y' ? rect.y : rect.x,
        visualIndex: index,
        targetNode: sibling,
        kind: 'before',
      });
      if (index === siblings.length - 1) {
        slots.push({
          coordinate: axis === 'y' ? rect.y + rect.height : rect.x + rect.width,
          visualIndex: siblings.length,
          targetNode: sibling,
          kind: 'after',
        });
      }
    });

    const axisValue = axis === 'y' ? pointer.y : pointer.x;
    slots.forEach((slot) => {
      const axisDistance = Math.abs(axisValue - slot.coordinate);
      if (axisDistance > SIBLING_SLOT_RADIUS) return;
      const reverse = reversesVisualSiblingOrder(options.layout, parent);
      const nativeIndex = reverse ? siblings.length - slot.visualIndex : slot.visualIndex;
      const score = axisDistance + crossDistance * 0.18;
      const candidate: SlotIntent = {
        parent,
        siblings,
        nativeSiblings,
        visualIndex: slot.visualIndex,
        nativeIndex,
        score,
        axisDistance,
        targetNode: slot.targetNode,
        kind: slot.kind,
      };
      if (!best || score < best.score) best = candidate;
    });
  });
  return best;
}

function resolveChildTarget(
  options: ResolveOfficialDragCandidateOptions,
  pointer: OfficialDragPoint,
): ChildIntent | null {
  const excluded = new Set(options.excludedNodes ?? []);
  let best: ChildIntent | null = null;
  options.nodes.forEach((node) => {
    if (excluded.has(node)) return;
    const rect = options.getRect(node);
    if (!finiteRect(rect) || node?.isGeneralization) return;
    const insideBody = containsPoint(expandRect(rect, CHILD_BODY_PADDING), pointer);
    const fromTail = containsPoint(
      tailRect(rect, resolveOfficialDragGrowthDirection(options.layout, node)),
      pointer,
    );
    if (!insideBody && !fromTail) return;
    const center = rectCenter(rect);
    const score = Math.hypot(pointer.x - center.x, pointer.y - center.y) - (fromTail ? 20 : 0);
    const candidate = { node, score, fromTail, insideBody };
    if (!best || score < best.score) best = candidate;
  });
  return best;
}

function slotCandidate(
  slot: SlotIntent,
  kind: 'before' | 'after' = slot.kind,
): OfficialDragCandidate {
  const nextNode = slot.nativeIndex < slot.nativeSiblings.length
    ? slot.nativeSiblings[slot.nativeIndex] ?? null
    : null;
  const prevNode = slot.nativeIndex > 0
    ? slot.nativeSiblings[slot.nativeIndex - 1] ?? null
    : null;
  return {
    key: `${kind}:${nodeUid(slot.parent)}:${slot.nativeIndex}`,
    kind,
    target: slot.targetNode,
    parent: slot.parent,
    index: slot.nativeIndex,
    overlapNode: null,
    prevNode: nextNode ? null : prevNode,
    nextNode,
    targetNode: slot.targetNode,
    parentNode: slot.parent,
    score: slot.score,
  };
}

function childCandidate(
  options: ResolveOfficialDragCandidateOptions,
  pointer: OfficialDragPoint,
  child: ChildIntent,
): OfficialDragCandidate {
  const excluded = new Set(options.excludedNodes ?? []);
  const available = new Set(options.nodes.filter((node) => !excluded.has(node)));
  const children = orderedSiblings(options.layout, child.node, available, pointer, options.getRect);
  if (children.length === 0) {
    return {
      key: `child:${nodeUid(child.node)}:0`,
      kind: 'child',
      target: child.node,
      parent: child.node,
      index: 0,
      overlapNode: child.node,
      prevNode: null,
      nextNode: null,
      targetNode: child.node,
      parentNode: child.node,
      score: child.score,
    };
  }

  const axis = siblingAxis(options.layout, child.node);
  const value = axis === 'y' ? pointer.y : pointer.x;
  let visualIndex = 0;
  for (const item of children) {
    const rect = options.getRect(item);
    if (!finiteRect(rect)) continue;
    const center = axis === 'y' ? rectCenter(rect).y : rectCenter(rect).x;
    if (value < center) break;
    visualIndex += 1;
  }
  const reverse = reversesVisualSiblingOrder(options.layout, child.node);
  const nativeIndex = reverse ? children.length - visualIndex : visualIndex;
  const nativeChildren = Array.isArray(child.node.children)
    ? child.node.children.filter((item: any) => children.includes(item))
    : [];
  const nextNode = nativeIndex < nativeChildren.length ? nativeChildren[nativeIndex] ?? null : null;
  const prevNode = nativeIndex > 0 ? nativeChildren[nativeIndex - 1] ?? null : null;
  return {
    key: `child:${nodeUid(child.node)}:${nativeIndex}`,
    kind: 'child',
    target: child.node,
    parent: child.node,
    index: nativeIndex,
    overlapNode: null,
    prevNode: nextNode ? null : prevNode,
    nextNode,
    targetNode: child.node,
    parentNode: child.node,
    score: child.score,
  };
}

/**
 * Pointer-based tree intent. The dragged clone never participates in hit
 * testing, so a large image node cannot trigger a target while the pointer is
 * still in the neutral gap between nodes.
 */
export function resolveOfficialDragCandidate(
  options: ResolveOfficialDragCandidateOptions,
): OfficialDragCandidate {
  const pointer = pointFromOptions(options);
  if (!pointer) return emptyOfficialDragCandidate();

  const sibling = resolveSiblingSlot(options, pointer);
  const child = resolveChildTarget(options, pointer);

  // A precise sibling edge wins over a body hit. Entering the outward tail is
  // an explicit hierarchy gesture and therefore wins over a nearby slot.
  if (child?.fromTail) return childCandidate(options, pointer, child);
  if (sibling && sibling.axisDistance <= SIBLING_SLOT_RADIUS) return slotCandidate(sibling);
  if (child) return childCandidate(options, pointer, child);
  return emptyOfficialDragCandidate();
}

export function officialCandidateParent(candidate: OfficialDragCandidate): any | null {
  return candidate.parentNode ?? candidate.overlapNode ?? candidate.prevNode?.parent ?? candidate.nextNode?.parent ?? null;
}

export function isOfficialDragCandidateNoop(
  candidate: OfficialDragCandidate,
  sources: any[],
): boolean {
  if (candidate.kind === 'none' || !candidate.parentNode || sources.length === 0) return true;
  const sourceSet = new Set(sources);
  if (!sources.every((node) => node?.parent === candidate.parentNode)) return false;
  const original = Array.isArray(candidate.parentNode.children)
    ? candidate.parentNode.children
    : [];
  const firstSourceIndex = original.findIndex((node: any) => sourceSet.has(node));
  if (firstSourceIndex < 0) return false;
  const insertionIndex = original
    .slice(0, firstSourceIndex)
    .filter((node: any) => !sourceSet.has(node)).length;
  const sourceOrder = original.filter((node: any) => sourceSet.has(node));
  return insertionIndex === candidate.index && sourceOrder.every((node: any, index: number) => node === sources[index]);
}

export interface OfficialInsertionGuide {
  path: string;
  squareX: number;
  squareY: number;
  orientation: 'horizontal' | 'vertical';
}

function lineFromSlot(
  rect: OfficialDragRect,
  axis: SiblingAxis,
  before: boolean,
): OfficialInsertionGuide {
  if (axis === 'y') {
    const y = before ? rect.y : rect.y + rect.height;
    const x1 = rect.x - 8;
    const x2 = rect.x + rect.width + 24;
    return { path: `M ${x1} ${y} L ${x2} ${y}`, squareX: x1, squareY: y, orientation: 'horizontal' };
  }
  const x = before ? rect.x : rect.x + rect.width;
  const y1 = rect.y - 8;
  const y2 = rect.y + rect.height + 24;
  return { path: `M ${x} ${y1} L ${x} ${y2}`, squareX: x, squareY: y1, orientation: 'vertical' };
}

export function calculateOfficialInsertionGuide(
  candidate: OfficialDragCandidate,
  layout: string,
  getRect: (node: any) => OfficialDragRect | null,
): OfficialInsertionGuide | null {
  if (candidate.kind === 'none' || !candidate.parentNode) return null;
  const axis = siblingAxis(layout, candidate.parentNode);
  if (candidate.nextNode) {
    const rect = getRect(candidate.nextNode);
    return finiteRect(rect) ? lineFromSlot(rect, axis, true) : null;
  }
  if (candidate.prevNode) {
    const rect = getRect(candidate.prevNode);
    return finiteRect(rect) ? lineFromSlot(rect, axis, false) : null;
  }
  const parentRect = getRect(candidate.parentNode);
  if (!finiteRect(parentRect)) return null;
  const direction = resolveOfficialDragGrowthDirection(layout, candidate.parentNode);
  if (direction === 'left') {
    const x = parentRect.x - 34;
    const y1 = parentRect.y - 7;
    const y2 = parentRect.y + parentRect.height + 7;
    return { path: `M ${x} ${y1} L ${x} ${y2}`, squareX: x, squareY: y1, orientation: 'vertical' };
  }
  if (direction === 'top') {
    const y = parentRect.y - 34;
    const x1 = parentRect.x - 7;
    const x2 = parentRect.x + parentRect.width + 7;
    return { path: `M ${x1} ${y} L ${x2} ${y}`, squareX: x1, squareY: y, orientation: 'horizontal' };
  }
  if (direction === 'bottom') {
    const y = parentRect.y + parentRect.height + 34;
    const x1 = parentRect.x - 7;
    const x2 = parentRect.x + parentRect.width + 7;
    return { path: `M ${x1} ${y} L ${x2} ${y}`, squareX: x1, squareY: y, orientation: 'horizontal' };
  }
  const x = parentRect.x + parentRect.width + 34;
  const y1 = parentRect.y - 7;
  const y2 = parentRect.y + parentRect.height + 7;
  return { path: `M ${x} ${y1} L ${x} ${y2}`, squareX: x, squareY: y1, orientation: 'vertical' };
}

export function clampOfficialIndex(value: number, length: number): number {
  return clamp(value, 0, Math.max(0, length));
}
