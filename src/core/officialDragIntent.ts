export interface OfficialDragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OfficialDragCandidate {
  key: string;
  overlapNode: any | null;
  prevNode: any | null;
  nextNode: any | null;
}

export interface ResolveOfficialDragCandidateOptions {
  layout: string;
  ghost: OfficialDragRect;
  nodes: any[];
  current: OfficialDragCandidate;
  getRect: (node: any) => OfficialDragRect | null;
}

export type OfficialDragGrowthDirection = 'left' | 'right' | 'top' | 'bottom';
type SiblingAxis = 'x' | 'y';

interface ChildIntent {
  node: any;
  score: number;
  fromTail: boolean;
  centerInsideTarget: boolean;
}

interface SiblingIntent {
  parent: any;
  siblings: any[];
  index: number;
  nativeIndex: number;
  reverse: boolean;
  score: number;
}

const CHILD_TAIL_SIZE = 80;
const CHILD_ENTER_PADDING = 8;
const CHILD_LEAVE_PADDING = 22;
const SIBLING_LANE_PADDING = 44;
const SIBLING_LANE_PADDING_ACTIVE = 72;
const SIBLING_END_PADDING = 44;
const SIBLING_END_PADDING_ACTIVE = 72;

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

function finiteRect(rect: OfficialDragRect | null | undefined): rect is OfficialDragRect {
  return Boolean(
    rect
      && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
      && rect.width > 0
      && rect.height > 0,
  );
}

function nodeUid(node: any): string {
  if (!node) return '';
  const value = typeof node.getData === 'function' ? node.getData('uid') : node.uid;
  return String(value ?? '');
}

function expandRect(rect: OfficialDragRect, xPadding: number, yPadding = xPadding): OfficialDragRect {
  return {
    x: rect.x - xPadding,
    y: rect.y - yPadding,
    width: rect.width + xPadding * 2,
    height: rect.height + yPadding * 2,
  };
}

function intersectionArea(a: OfficialDragRect, b: OfficialDragRect): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const width = right - left;
  const height = bottom - top;
  return width <= 0 || height <= 0 ? 0 : width * height;
}

function rectCenter(rect: OfficialDragRect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function containsPoint(rect: OfficialDragRect, point: { x: number; y: number }): boolean {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height;
}

function unionRects(rects: OfficialDragRect[]): OfficialDragRect | null {
  if (rects.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  rects.forEach((rect) => {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  });
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function tailRect(rect: OfficialDragRect, direction: OfficialDragGrowthDirection): OfficialDragRect {
  switch (direction) {
    case 'left':
      return { x: rect.x - CHILD_TAIL_SIZE, y: rect.y, width: CHILD_TAIL_SIZE, height: rect.height };
    case 'top':
      return { x: rect.x, y: rect.y - CHILD_TAIL_SIZE, width: rect.width, height: CHILD_TAIL_SIZE };
    case 'bottom':
      return { x: rect.x, y: rect.y + rect.height, width: rect.width, height: CHILD_TAIL_SIZE };
    case 'right':
    default:
      return { x: rect.x + rect.width, y: rect.y, width: CHILD_TAIL_SIZE, height: rect.height };
  }
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
      return 'bottom';
    case 'catalogOrganization':
      return 'bottom';
    case 'timeline':
      return Number(node?.layerIndex ?? 0) === 0 ? 'right' : 'bottom';
    case 'timeline2': {
      const layer = Number(node?.layerIndex ?? 0);
      if (layer === 0) return 'right';
      const direction = normalizedDirection(node?.dir);
      return direction === 'top' ? 'top' : 'bottom';
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
  return layout === 'timeline2'
    && Number(parent?.layerIndex ?? 0) === 1
    && normalizedDirection(parent?.dir) === 'top';
}

function sameNode(a: any, b: any): boolean {
  if (a === b) return true;
  const aUid = nodeUid(a);
  return Boolean(aUid && aUid === nodeUid(b));
}

function currentSiblingParent(current: OfficialDragCandidate): any | null {
  return current.prevNode?.parent ?? current.nextNode?.parent ?? null;
}

function resolveChildIntent(options: ResolveOfficialDragCandidateOptions): ChildIntent | null {
  const center = rectCenter(options.ghost);
  let best: ChildIntent | null = null;

  options.nodes.forEach((node) => {
    const uid = nodeUid(node);
    const rect = options.getRect(node);
    if (!uid || !finiteRect(rect) || node?.isGeneralization) return;

    const active = sameNode(options.current.overlapNode, node);
    const padding = active ? CHILD_LEAVE_PADDING : CHILD_ENTER_PADDING;
    const bodyScore = intersectionArea(options.ghost, expandRect(rect, padding));
    const tailScore = intersectionArea(
      options.ghost,
      expandRect(tailRect(rect, resolveOfficialDragGrowthDirection(options.layout, node)), padding),
    );
    const score = Math.max(bodyScore, tailScore);
    if (score <= 0) return;

    const intent: ChildIntent = {
      node,
      score,
      fromTail: tailScore > 0 && bodyScore <= 0,
      centerInsideTarget: containsPoint(rect, center),
    };
    if (!best || intent.score > best.score) {
      best = intent;
    }
  });

  return best;
}

function branchFilteredSiblings(
  layout: string,
  parent: any,
  siblings: any[],
  ghost: OfficialDragRect,
  getRect: (node: any) => OfficialDragRect | null,
): any[] {
  if (layout !== 'mindMap') return siblings;
  const parentRect = getRect(parent);
  if (!finiteRect(parentRect)) return siblings;
  const branch = rectCenter(ghost).x < rectCenter(parentRect).x ? 'left' : 'right';
  const filtered = siblings.filter((node) => {
    const direction = normalizedDirection(node?.dir);
    if (direction === 'left' || direction === 'right') return direction === branch;
    const rect = getRect(node);
    return finiteRect(rect) ? (rectCenter(rect).x < rectCenter(parentRect).x ? 'left' : 'right') === branch : false;
  });
  return filtered.length > 0 ? filtered : siblings;
}

function resolveSiblingIntent(options: ResolveOfficialDragCandidateOptions): SiblingIntent | null {
  const available = new Set(options.nodes);
  const seenParents = new Set<any>();
  const activeParent = currentSiblingParent(options.current);
  let best: SiblingIntent | null = null;

  options.nodes.forEach((node) => {
    const parent = node?.parent;
    if (!parent || seenParents.has(parent)) return;
    seenParents.add(parent);

    let siblings = Array.isArray(parent.children)
      ? parent.children.filter((child: any) => available.has(child) && finiteRect(options.getRect(child)))
      : [];
    siblings = branchFilteredSiblings(options.layout, parent, siblings, options.ghost, options.getRect);
    if (siblings.length === 0) return;

    const rects = siblings.map(options.getRect).filter(finiteRect);
    const bounds = unionRects(rects);
    if (!bounds) return;

    const active = sameNode(activeParent, parent);
    const lane = active ? SIBLING_LANE_PADDING_ACTIVE : SIBLING_LANE_PADDING;
    const end = active ? SIBLING_END_PADDING_ACTIVE : SIBLING_END_PADDING;
    const axis = siblingAxis(options.layout, parent);
    const laneBounds = axis === 'y'
      ? expandRect(bounds, lane, end)
      : expandRect(bounds, end, lane);
    const overlap = intersectionArea(options.ghost, laneBounds);
    if (overlap <= 0) return;

    const score = overlap / Math.max(1, laneBounds.width * laneBounds.height);
    const center = rectCenter(options.ghost);
    const ordered = [...siblings].sort((a, b) => {
      const aRect = options.getRect(a)!;
      const bRect = options.getRect(b)!;
      const delta = axis === 'x'
        ? rectCenter(aRect).x - rectCenter(bRect).x
        : rectCenter(aRect).y - rectCenter(bRect).y;
      return Math.abs(delta) > 0.5 ? delta : nodeUid(a).localeCompare(nodeUid(b));
    });
    let index = 0;
    for (const sibling of ordered) {
      const rect = options.getRect(sibling);
      if (!finiteRect(rect)) continue;
      const siblingCenter = rectCenter(rect);
      const before = axis === 'x' ? center.x < siblingCenter.x : center.y < siblingCenter.y;
      if (before) break;
      index += 1;
    }

    const reverse = reversesVisualSiblingOrder(options.layout, parent);
    const nativeIndex = reverse ? ordered.length - index : index;
    const intent: SiblingIntent = {
      parent,
      siblings: ordered,
      index,
      nativeIndex,
      reverse,
      score,
    };
    if (!best || intent.score > best.score) {
      best = intent;
    }
  });

  return best;
}

function childCandidate(intent: ChildIntent): OfficialDragCandidate {
  return {
    key: `child:${nodeUid(intent.node)}`,
    overlapNode: intent.node,
    prevNode: null,
    nextNode: null,
  };
}

function siblingCandidate(intent: SiblingIntent): OfficialDragCandidate {
  const prevNode = intent.reverse
    ? (intent.index < intent.siblings.length ? intent.siblings[intent.index] ?? null : null)
    : (intent.index > 0 ? intent.siblings[intent.index - 1] ?? null : null);
  const nextNode = intent.reverse
    ? (intent.index > 0 ? intent.siblings[intent.index - 1] ?? null : null)
    : (intent.index < intent.siblings.length ? intent.siblings[intent.index] ?? null : null);
  if (!prevNode && !nextNode) {
    return { key: 'none', overlapNode: null, prevNode: null, nextNode: null };
  }
  return {
    key: `sibling:${nodeUid(intent.parent)}:${intent.nativeIndex}`,
    overlapNode: null,
    prevNode,
    nextNode,
  };
}

export function resolveOfficialDragCandidate(options: ResolveOfficialDragCandidateOptions): OfficialDragCandidate {
  if (!finiteRect(options.ghost)) {
    return { key: 'none', overlapNode: null, prevNode: null, nextNode: null };
  }

  const child = resolveChildIntent(options);
  const sibling = resolveSiblingIntent(options);
  if (child?.fromTail) return childCandidate(child);
  if (sibling && (!child || !child.centerInsideTarget)) return siblingCandidate(sibling);
  if (child) return childCandidate(child);
  if (sibling) return siblingCandidate(sibling);
  return { key: 'none', overlapNode: null, prevNode: null, nextNode: null };
}
