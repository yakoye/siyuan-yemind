import Drag from 'simple-mind-map/src/plugins/Drag';
import {
  calculateOfficialInsertionGuide,
  emptyOfficialDragCandidate,
  isOfficialDragCandidateNoop,
  officialCandidateParent,
  resolveOfficialDragCandidate,
  resolveOfficialDragGuideOrientation,
  supportsOfficialDragGeometry,
  type OfficialDragCandidate,
} from './officialDragIntent';
import {
  createStableTreeDropState,
  updateStableTreeDropIntent,
} from './treeDropIntent';

export interface DragGuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DragGuideOrientation = 'horizontal' | 'vertical';

export type DragCandidate = OfficialDragCandidate;

export interface DragCandidateState {
  stable: DragCandidate;
  pending: {
    candidate: DragCandidate;
    since: number;
    frames: number;
  } | null;
}

export interface IncomingDragLineSnapshot {
  line: any;
  wasVisible: boolean;
}

function lineIsVisible(line: any): boolean {
  if (!line) return false;
  if (typeof line.visible === 'function') {
    try {
      return Boolean(line.visible());
    } catch {
      return true;
    }
  }
  const display = line.node?.style?.display ?? line.attr?.('display');
  return display !== 'none';
}

export function captureIncomingDragLines(nodes: any[]): IncomingDragLineSnapshot[] {
  const snapshots: IncomingDragLineSnapshot[] = [];
  const seen = new Set<any>();
  (nodes ?? []).forEach((node) => {
    const parent = node?.parent;
    const index = Array.isArray(parent?.children) ? parent.children.indexOf(node) : -1;
    const line = index >= 0 ? parent?._lines?.[index] : null;
    if (!line || seen.has(line)) return;
    seen.add(line);
    snapshots.push({ line, wasVisible: lineIsVisible(line) });
    line.hide?.();
  });
  return snapshots;
}

export function restoreIncomingDragLines(snapshots: IncomingDragLineSnapshot[]): void {
  (snapshots ?? []).forEach(({ line, wasVisible }) => {
    if (!line) return;
    if (wasVisible) line.show?.();
    else line.hide?.();
  });
}

export function resolveDragGuideTarget(state: {
  overlapNode?: any;
  prevNode?: any;
  nextNode?: any;
  mousedownNode?: any;
}): any | null {
  if (state.overlapNode) return state.overlapNode;
  const sibling = state.prevNode ?? state.nextNode;
  if (sibling?.parent) return sibling.parent;
  return state.mousedownNode?.parent ?? null;
}

export function createDragCandidateState(stable: DragCandidate): DragCandidateState {
  return createStableTreeDropState(stable) as DragCandidateState;
}

export function updateStableDragCandidate(
  state: DragCandidateState,
  candidate: DragCandidate,
  now: number,
  minimumDurationMs?: number,
  minimumFrames?: number,
): DragCandidateState {
  const options = minimumDurationMs === undefined
    ? undefined
    : {
        siblingDurationMs: minimumDurationMs,
        siblingFrames: minimumFrames ?? 3,
        childDurationMs: minimumDurationMs,
        childFrames: minimumFrames ?? 3,
      };
  return updateStableTreeDropIntent(state as any, candidate as any, now, options) as DragCandidateState;
}

export function calculateDragGuidePath(
  parent: DragGuideRect,
  ghost: DragGuideRect,
  orientation: DragGuideOrientation,
): string {
  if (orientation === 'vertical') {
    const startX = parent.x + parent.width / 2;
    const startY = parent.y + parent.height;
    const endX = ghost.x + ghost.width / 2;
    const endY = ghost.y;
    return `M ${startX} ${startY} C ${startX} ${startY + 40}, ${endX} ${endY - 40}, ${endX} ${endY}`;
  }
  const startX = parent.x + parent.width;
  const startY = parent.y + parent.height / 2;
  const endX = ghost.x;
  const endY = ghost.y + ghost.height / 2;
  return `M ${startX} ${startY} C ${startX + 40} ${startY}, ${endX - 40} ${endY}, ${endX} ${endY}`;
}

export function calculateOriginalParentGuideStyle(distance: number): { width: number; opacity: number } {
  const normalized = Math.max(0, Math.min(1, Number(distance) / 140));
  return {
    width: 2 - 1.1 * normalized,
    opacity: 0.3 + 0.6 * normalized,
  };
}

function normalizeRect(rect: any): DragGuideRect | null {
  if (!rect) return null;
  const x = Number(rect.x);
  const y = Number(rect.y);
  const width = Number(rect.width);
  const height = Number(rect.height);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function nodeUid(node: any): string {
  if (!node) return '';
  const value = typeof node.getData === 'function' ? node.getData('uid') : node.uid;
  return String(value ?? '');
}


function collectDragExcludedNodes(sources: any[]): any[] {
  const excluded = new Set<any>();
  const visit = (node: any): void => {
    if (!node || excluded.has(node)) return;
    excluded.add(node);
    (node.children ?? []).forEach(visit);
  };
  (sources ?? []).forEach(visit);
  return [...excluded];
}

function candidateFromPlugin(plugin: any): DragCandidate {
  if (plugin.overlapNode) {
    const parent = plugin.overlapNode;
    return {
      key: `child:${nodeUid(parent)}`,
      kind: 'child',
      target: parent,
      parent,
      index: Array.isArray(parent.children) ? parent.children.length : 0,
      overlapNode: parent,
      prevNode: null,
      nextNode: null,
      targetNode: parent,
      parentNode: parent,
      score: 0,
    };
  }
  if (plugin.prevNode) {
    const parent = plugin.prevNode.parent ?? null;
    const index = Array.isArray(parent?.children) ? parent.children.indexOf(plugin.prevNode) + 1 : -1;
    return {
      key: `after:${nodeUid(plugin.prevNode)}`,
      kind: 'after',
      target: plugin.prevNode,
      parent,
      index,
      overlapNode: null,
      prevNode: plugin.prevNode,
      nextNode: null,
      targetNode: plugin.prevNode,
      parentNode: parent,
      score: 0,
    };
  }
  if (plugin.nextNode) {
    const parent = plugin.nextNode.parent ?? null;
    const index = Array.isArray(parent?.children) ? parent.children.indexOf(plugin.nextNode) : -1;
    return {
      key: `before:${nodeUid(plugin.nextNode)}`,
      kind: 'before',
      target: plugin.nextNode,
      parent,
      index,
      overlapNode: null,
      prevNode: null,
      nextNode: plugin.nextNode,
      targetNode: plugin.nextNode,
      parentNode: parent,
      score: 0,
    };
  }
  return emptyOfficialDragCandidate();
}

function applyCandidate(plugin: any, candidate: DragCandidate): void {
  plugin.overlapNode = candidate.overlapNode;
  plugin.prevNode = candidate.prevNode;
  plugin.nextNode = candidate.nextNode;
}

function animationNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function requestFrame(callback: FrameRequestCallback): number {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(animationNow()), 16) as unknown as number;
}

function cancelFrame(id: number): void {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(id);
    return;
  }
  clearTimeout(id);
}

function nodeHitRect(plugin: any, node: any): DragGuideRect | null {
  if (!node) return null;
  const native = plugin.getNodeRect?.(node);
  if (native) {
    return normalizeRect({
      x: native.left,
      y: native.top,
      width: native.right - native.left,
      height: native.bottom - native.top,
    });
  }
  return normalizeRect(node?.group?.rbox?.(plugin.mindMap.otherDraw) ?? node?.group?.bbox?.());
}

function nodeSceneRect(_plugin: any, node: any): DragGuideRect | null {
  if (!node) return null;
  return normalizeRect({
    x: Number(node.left),
    y: Number(node.top),
    width: Number(node.width),
    height: Number(node.height),
  });
}

function ghostRect(plugin: any): DragGuideRect | null {
  return normalizeRect(plugin.clone?.rbox?.(plugin.mindMap.otherDraw) ?? plugin.clone?.bbox?.());
}


interface PreviewTransformSnapshot {
  element: any;
  translateX: number;
  translateY: number;
  transition: string;
}

interface PreviewVisibilitySnapshot {
  element: any;
  wasVisible: boolean;
}

interface LogicalRoomPreview {
  key: string;
  transforms: PreviewTransformSnapshot[];
  hiddenLines: PreviewVisibilitySnapshot[];
}

function svgTransform(element: any): { translateX: number; translateY: number } {
  const value = element?.transform?.() ?? {};
  return {
    translateX: Number(value.translateX) || 0,
    translateY: Number(value.translateY) || 0,
  };
}

function elementTransition(element: any): string {
  return String(element?.node?.style?.transition ?? '');
}

function setElementTransition(element: any, value: string): void {
  if (element?.node?.style) element.node.style.transition = value;
}

function collectSubtreeNodes(root: any): any[] {
  const result: any[] = [];
  const seen = new Set<any>();
  const visit = (node: any): void => {
    if (!node || seen.has(node)) return;
    seen.add(node);
    result.push(node);
    (node.children ?? []).forEach(visit);
  };
  visit(root);
  return result;
}

function previewGap(plugin: any): number {
  const rects: DragGuideRect[] = [];
  (plugin.beingDragNodeList ?? []).forEach((root: any) => {
    collectSubtreeNodes(root).forEach((node) => {
      const rect = nodeSceneRect(plugin, node);
      if (rect) rects.push(rect);
    });
  });
  if (!rects.length) return 44;
  const top = Math.min(...rects.map((rect) => rect.y));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return Math.max(44, Math.min(360, bottom - top + 18));
}
function endpointDistance(parent: DragGuideRect, ghost: DragGuideRect, orientation: DragGuideOrientation): number {
  if (orientation === 'vertical') {
    return Math.hypot(
      ghost.x + ghost.width / 2 - (parent.x + parent.width / 2),
      ghost.y - (parent.y + parent.height),
    );
  }
  return Math.hypot(
    ghost.x - (parent.x + parent.width),
    ghost.y + ghost.height / 2 - (parent.y + parent.height / 2),
  );
}

/**
 * Pointer-driven structural drag for the canvas. The native simple-mind-map
 * move commands remain the single mutation path, while YeMind owns target
 * intent, dead zones, hierarchy dwell, previews and cancellation.
 */
export default class YeMindDrag extends Drag {
  bindEvent(): void {
    const plugin = this as any;
    plugin.onNodeMousedown = plugin.onNodeMousedown.bind(this);
    plugin.onMousemove = plugin.onMousemove.bind(this);
    plugin.onMouseup = plugin.onMouseup.bind(this);
    plugin.__ymzRawCheckOverlap = Drag.prototype.checkOverlapNode.bind(this);
    plugin.__ymzCandidateState = createDragCandidateState(emptyOfficialDragCandidate());
    plugin.__ymzRawCandidate = emptyOfficialDragCandidate();
    plugin.__ymzOverlapFrame = null;
    plugin.__ymzIncomingLines = [];
    plugin.__ymzLogicalRoomPreview = null;
    plugin.__ymzOnKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || (!plugin.isMousedown && !plugin.isDragging)) return;
      event.preventDefault();
      event.stopPropagation();
      this.cancelActiveDrag();
    };
    plugin.checkOverlapNode = () => this.scheduleOfficialCandidateCheck();

    plugin.mindMap.on('node_mousedown', plugin.onNodeMousedown);
    plugin.mindMap.on('mousemove', plugin.onMousemove);
    plugin.mindMap.on('node_mouseup', plugin.onMouseup);
    plugin.mindMap.on('mouseup', plugin.onMouseup);
    document.addEventListener('keydown', plugin.__ymzOnKeydown, true);
  }

  onNodeMousedown(node: any, event: MouseEvent): void {
    const target = event.target as Element | null;
    if (
      target?.closest?.(
        '.node-image-remove,.ymz-node-image-preview,.node-image-resize,.node-img-adjust,.node-img-handle button',
      )
    ) return;
    super.onNodeMousedown(node, event);
  }

  createCloneNode(): void {
    const plugin = this as any;
    const hadClone = Boolean(plugin.clone);
    super.createCloneNode();
    if (hadClone || !plugin.clone) return;
    const none = emptyOfficialDragCandidate();
    plugin.__ymzCandidateState = createDragCandidateState(none);
    plugin.__ymzRawCandidate = none;
    plugin.__ymzIncomingLines = captureIncomingDragLines(plugin.beingDragNodeList ?? []);
    this.ensureGuideLines();
    this.clearUpstreamPlaceholder();
    this.updateOfficialGuideLines();
  }

  onMove(x: number, y: number, event: MouseEvent): void {
    super.onMove(x, y, event);
    // The right logical reference layout resolves its local target on every
    // pointer move so the parent preview never lags behind the dragged node.
    if (String((this as any).mindMap.opt.layout ?? 'logicalStructure') === 'logicalStructure') {
      this.flushOfficialCandidateCheck();
    } else {
      this.updateOfficialGuideLines();
    }
  }

  async onMouseup(event: MouseEvent): Promise<void> {
    const plugin = this as any;
    try {
      this.flushOfficialCandidateCheck();
      const raw: DragCandidate = plugin.__ymzRawCandidate ?? emptyOfficialDragCandidate();
      const stable: DragCandidate = plugin.__ymzCandidateState?.stable ?? emptyOfficialDragCandidate();
      // Sibling ordering is explicit from the upper/lower half of a target row
      // and should commit on release immediately. Becoming a child changes
      // hierarchy and therefore still requires the deliberate dwell candidate.
      const resolved = String(plugin.mindMap.opt.layout ?? 'logicalStructure') === 'logicalStructure'
        ? raw
        : raw.kind === 'child'
          ? (raw.key === stable.key ? stable : emptyOfficialDragCandidate())
          : raw;
      const finalCandidate = isOfficialDragCandidateNoop(
        resolved,
        plugin.beingDragNodeList ?? [],
      )
        ? emptyOfficialDragCandidate()
        : resolved;
      applyCandidate(plugin, finalCandidate);
      await super.onMouseup(event);
    } finally {
      this.restoreIncomingLines();
    }
  }

  removeCloneNode(): void {
    this.cancelCandidateFrame();
    this.clearLogicalRoomPreview();
    this.removeGuideLines();
    super.removeCloneNode();
  }

  beforePluginRemove(): void {
    const plugin = this as any;
    document.removeEventListener('keydown', plugin.__ymzOnKeydown, true);
    this.cancelCandidateFrame();
    this.clearLogicalRoomPreview();
    this.removeGuideLines();
    this.restoreIncomingLines();
    super.beforePluginRemove();
  }

  beforePluginDestroy(): void {
    const plugin = this as any;
    document.removeEventListener('keydown', plugin.__ymzOnKeydown, true);
    this.cancelCandidateFrame();
    this.clearLogicalRoomPreview();
    this.removeGuideLines();
    this.restoreIncomingLines();
    super.beforePluginDestroy();
  }

  private scheduleOfficialCandidateCheck(): void {
    const plugin = this as any;
    if (plugin.__ymzOverlapFrame !== null) return;
    plugin.__ymzOverlapFrame = requestFrame((timestamp) => {
      plugin.__ymzOverlapFrame = null;
      this.runOfficialCandidateCheck(timestamp);
    });
  }

  private flushOfficialCandidateCheck(): void {
    const plugin = this as any;
    if (plugin.__ymzOverlapFrame !== null) {
      cancelFrame(plugin.__ymzOverlapFrame);
      plugin.__ymzOverlapFrame = null;
    }
    this.runOfficialCandidateCheck(animationNow());
  }

  private runOfficialCandidateCheck(now: number): void {
    const plugin = this as any;
    if (!plugin.clone || !plugin.placeholder || !plugin.drawTransform) return;

    const layout = String(plugin.mindMap.opt.layout ?? 'logicalStructure');
    let candidate: DragCandidate;
    if (supportsOfficialDragGeometry(layout)) {
      candidate = resolveOfficialDragCandidate({
        layout,
        pointer: { x: Number(plugin.mouseMoveX), y: Number(plugin.mouseMoveY) },
        nodes: plugin.nodeList ?? [],
        excludedNodes: collectDragExcludedNodes(plugin.beingDragNodeList ?? []),
        current: plugin.__ymzCandidateState?.stable ?? emptyOfficialDragCandidate(),
        getRect: (node) => nodeHitRect(plugin, node),
      });
      this.clearUpstreamPlaceholder();
    } else {
      plugin.__ymzRawCheckOverlap?.();
      this.styleUpstreamPlaceholderLines();
      candidate = candidateFromPlugin(plugin);
    }

    plugin.__ymzRawCandidate = candidate;
    const currentState = plugin.__ymzCandidateState
      ?? createDragCandidateState(emptyOfficialDragCandidate());
    plugin.__ymzCandidateState = layout === 'logicalStructure'
      ? { stable: candidate, pending: null }
      : updateStableDragCandidate(currentState, candidate, now);

    const stable = isOfficialDragCandidateNoop(
      plugin.__ymzCandidateState.stable,
      plugin.beingDragNodeList ?? [],
    )
      ? emptyOfficialDragCandidate()
      : plugin.__ymzCandidateState.stable;
    applyCandidate(plugin, stable);
    if (layout === 'logicalStructure') this.updateLogicalRoomPreview(stable);
    else this.clearLogicalRoomPreview();
    this.updateOfficialGuideLines();

    if (plugin.clone && plugin.__ymzCandidateState.pending) {
      this.scheduleOfficialCandidateCheck();
    }
  }

  private ensureGuideLines(): void {
    const plugin = this as any;
    if (!plugin.__ymzTargetGuideLine) {
      plugin.__ymzTargetGuideLine = plugin.mindMap.otherDraw
        .path()
        .fill({ color: 'none' })
        .attr({ 'pointer-events': 'none' })
        .hide();
    }
    if (!plugin.__ymzOriginGuideLine) {
      plugin.__ymzOriginGuideLine = plugin.mindMap.otherDraw
        .path()
        .fill({ color: 'none' })
        .attr({ 'pointer-events': 'none' })
        .hide();
    }
    if (!plugin.__ymzInsertionGuideLine) {
      plugin.__ymzInsertionGuideLine = plugin.mindMap.otherDraw
        .path()
        .fill({ color: 'none' })
        .attr({ 'pointer-events': 'none' })
        .hide();
    }
    if (!plugin.__ymzInsertionGuideSquare) {
      plugin.__ymzInsertionGuideSquare = plugin.mindMap.otherDraw
        .rect(7, 7)
        .radius(1)
        .fill({ color: '#176b50' })
        .attr({ 'pointer-events': 'none' })
        .hide();
    }
  }

  private updateOfficialGuideLines(): void {
    const plugin = this as any;
    if (!plugin.clone) {
      plugin.__ymzTargetGuideLine?.hide?.();
      plugin.__ymzOriginGuideLine?.hide?.();
      plugin.__ymzInsertionGuideLine?.hide?.();
      plugin.__ymzInsertionGuideSquare?.hide?.();
      return;
    }
    this.ensureGuideLines();
    const state: DragCandidateState = plugin.__ymzCandidateState
      ?? createDragCandidateState(emptyOfficialDragCandidate());
    const stable = isOfficialDragCandidateNoop(
      state.stable,
      plugin.beingDragNodeList ?? [],
    )
      ? emptyOfficialDragCandidate()
      : state.stable;
    const ghost = ghostRect(plugin);
    if (!ghost) return;

    const layout = String(plugin.mindMap.opt.layout ?? 'logicalStructure');
    const stableTarget = stable.kind === 'none' ? null : officialCandidateParent(stable);
    // During a right-logical drag the green dashed line is continuous. Before
    // a local target is acquired it stays connected to the original parent;
    // as soon as the nearest-node local zone changes, it switches in the same
    // pointer frame to the parent encoded by that single candidate object.
    const previewParent = layout === 'logicalStructure'
      ? stableTarget ?? plugin.mousedownNode?.parent ?? null
      : stableTarget;
    const target = nodeSceneRect(plugin, previewParent);
    if (target) {
      const orientation: DragGuideOrientation = resolveOfficialDragGuideOrientation(layout, previewParent);
      plugin.__ymzTargetGuideLine
        .plot(calculateDragGuidePath(target, ghost, orientation))
        .stroke({ color: 'rgba(23, 107, 80, 0.96)', width: 2.3, linecap: 'round' })
        .attr({ 'stroke-dasharray': '6 6', opacity: 1, 'pointer-events': 'none' })
        .show()
        .front();
    } else {
      plugin.__ymzTargetGuideLine?.hide?.();
    }

    // The right-growing logical layout uses only one preview language: the
    // green dashed line points at the parent that will own the dragged node.
    // There is no root fallback and no canvas insertion line; sibling order is
    // communicated by the live room-making preview.
    if (layout === 'logicalStructure') {
      plugin.__ymzOriginGuideLine?.hide?.();
      plugin.__ymzInsertionGuideLine?.hide?.();
      plugin.__ymzInsertionGuideSquare?.hide?.();
      return;
    }

    const originParent = plugin.mousedownNode?.parent ?? null;
    const origin = nodeSceneRect(plugin, originParent);
    if (origin && !stableTarget) {
      const orientation: DragGuideOrientation = resolveOfficialDragGuideOrientation(layout, originParent);
      const distance = endpointDistance(origin, ghost, orientation);
      const style = calculateOriginalParentGuideStyle(distance);
      plugin.__ymzOriginGuideLine
        .plot(calculateDragGuidePath(origin, ghost, orientation))
        .stroke({ color: `rgba(100, 116, 139, ${Math.max(0.55, style.opacity).toFixed(3)})`, width: Math.max(1.2, style.width), linecap: 'round' })
        .attr({ 'stroke-dasharray': '4 6', opacity: 1, 'pointer-events': 'none' })
        .show()
        .front();
    } else {
      plugin.__ymzOriginGuideLine?.hide?.();
    }

    const insertion = calculateOfficialInsertionGuide(
      stable,
      layout,
      (node) => nodeSceneRect(plugin, node),
    );
    if (insertion) {
      plugin.__ymzInsertionGuideLine
        .plot(insertion.path)
        .stroke({ color: '#176b50', width: 2.2, linecap: 'round' })
        .attr({ opacity: 1, 'pointer-events': 'none' })
        .show()
        .front();
      plugin.__ymzInsertionGuideSquare
        .move(insertion.squareX - 3.5, insertion.squareY - 3.5)
        .fill({ color: '#176b50' })
        .show()
        .front();
    } else {
      plugin.__ymzInsertionGuideLine?.hide?.();
      plugin.__ymzInsertionGuideSquare?.hide?.();
    }
  }

  private updateLogicalRoomPreview(candidate: DragCandidate): void {
    const plugin = this as any;
    const current: LogicalRoomPreview | null = plugin.__ymzLogicalRoomPreview ?? null;
    if (candidate.kind === 'none' || !candidate.parentNode) {
      this.clearLogicalRoomPreview();
      return;
    }
    if (current?.key === candidate.key) return;
    this.clearLogicalRoomPreview();

    const sourceRoots = plugin.beingDragNodeList ?? [];
    const sourceSet = new Set<any>();
    sourceRoots.forEach((root: any) => collectSubtreeNodes(root).forEach((node) => sourceSet.add(node)));
    const siblings = Array.isArray(candidate.parentNode.children)
      ? candidate.parentNode.children.filter((node: any) => !sourceSet.has(node))
      : [];
    const index = Math.max(0, Math.min(siblings.length, Number(candidate.index) || 0));
    const rootsToShift = siblings.slice(index);
    if (!rootsToShift.length) {
      plugin.__ymzLogicalRoomPreview = {
        key: candidate.key,
        transforms: [],
        hiddenLines: [],
      } satisfies LogicalRoomPreview;
      return;
    }

    const deltaY = previewGap(plugin);
    const elements = new Set<any>();
    const hiddenLines: PreviewVisibilitySnapshot[] = [];
    rootsToShift.forEach((root: any) => {
      const incomingIndex = Array.isArray(root?.parent?.children)
        ? root.parent.children.indexOf(root)
        : -1;
      const incoming = incomingIndex >= 0 ? root?.parent?._lines?.[incomingIndex] : null;
      if (incoming && !hiddenLines.some((item) => item.element === incoming)) {
        hiddenLines.push({ element: incoming, wasVisible: lineIsVisible(incoming) });
        incoming.hide?.();
      }
      collectSubtreeNodes(root).forEach((node) => {
        if (node?.group) elements.add(node.group);
        (node?._lines ?? []).forEach((line: any) => elements.add(line));
      });
    });

    const transforms: PreviewTransformSnapshot[] = [];
    elements.forEach((element) => {
      const before = svgTransform(element);
      const transition = elementTransition(element);
      transforms.push({
        element,
        translateX: before.translateX,
        translateY: before.translateY,
        transition,
      });
      setElementTransition(element, 'transform 130ms ease');
      element.translate?.(0, deltaY);
    });
    plugin.__ymzLogicalRoomPreview = {
      key: candidate.key,
      transforms,
      hiddenLines,
    } satisfies LogicalRoomPreview;
  }

  private clearLogicalRoomPreview(): void {
    const plugin = this as any;
    const preview: LogicalRoomPreview | null = plugin.__ymzLogicalRoomPreview ?? null;
    if (!preview) return;
    preview.transforms.forEach((snapshot) => {
      const current = svgTransform(snapshot.element);
      setElementTransition(snapshot.element, 'transform 100ms ease');
      snapshot.element.translate?.(
        snapshot.translateX - current.translateX,
        snapshot.translateY - current.translateY,
      );
      const element = snapshot.element;
      const transition = snapshot.transition;
      setTimeout(() => setElementTransition(element, transition), 120);
    });
    preview.hiddenLines.forEach(({ element, wasVisible }) => {
      if (wasVisible) element.show?.();
      else element.hide?.();
    });
    plugin.__ymzLogicalRoomPreview = null;
  }

  private clearUpstreamPlaceholder(): void {
    const plugin = this as any;
    plugin.placeholder?.size?.(0, 0);
    plugin.placeHolderLine?.hide?.();
    plugin.removeExtraLines?.();
  }

  private restoreIncomingLines(): void {
    const plugin = this as any;
    restoreIncomingDragLines(plugin.__ymzIncomingLines ?? []);
    plugin.__ymzIncomingLines = [];
  }

  private styleUpstreamPlaceholderLines(): void {
    const plugin = this as any;
    const lines = [plugin.placeHolderLine, ...(plugin.placeHolderExtraLines ?? [])].filter(Boolean);
    lines.forEach((line: any) => {
      line.attr?.({ 'stroke-dasharray': '6 6', opacity: 0.95, 'pointer-events': 'none' });
      line.front?.();
    });
  }

  private cancelActiveDrag(): void {
    const plugin = this as any;
    plugin.autoMove?.clearAutoMoveTimer?.();
    plugin.isMousedown = false;
    (plugin.beingDragNodeList ?? []).forEach((node: any) => {
      node.setOpacity?.(1);
      node.showChildren?.();
      node.endDrag?.();
    });
    this.removeCloneNode();
    this.restoreIncomingLines();
    plugin.reset?.();
  }

  private cancelCandidateFrame(): void {
    const plugin = this as any;
    if (plugin.__ymzOverlapFrame !== null && plugin.__ymzOverlapFrame !== undefined) {
      cancelFrame(plugin.__ymzOverlapFrame);
    }
    plugin.__ymzOverlapFrame = null;
  }

  private removeGuideLines(): void {
    const plugin = this as any;
    plugin.__ymzTargetGuideLine?.remove?.();
    plugin.__ymzOriginGuideLine?.remove?.();
    plugin.__ymzInsertionGuideLine?.remove?.();
    plugin.__ymzInsertionGuideSquare?.remove?.();
    plugin.__ymzTargetGuideLine = null;
    plugin.__ymzOriginGuideLine = null;
    plugin.__ymzInsertionGuideLine = null;
    plugin.__ymzInsertionGuideSquare = null;
  }
}

(YeMindDrag as any).instanceName = 'drag';
