import Drag from 'simple-mind-map/src/plugins/Drag';

export interface DragGuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DragGuideOrientation = 'horizontal' | 'vertical';

export interface DragCandidate {
  key: string;
  overlapNode: any | null;
  prevNode: any | null;
  nextNode: any | null;
}

export interface DragCandidateState {
  stable: DragCandidate;
  pending: {
    candidate: DragCandidate;
    since: number;
    frames: number;
  } | null;
}

const OFFICIAL_TARGET_STABLE_MS = 60;
const OFFICIAL_TARGET_STABLE_FRAMES = 3;

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
  return { stable, pending: null };
}

export function updateStableDragCandidate(
  state: DragCandidateState,
  candidate: DragCandidate,
  now: number,
  minimumDurationMs = OFFICIAL_TARGET_STABLE_MS,
  minimumFrames = OFFICIAL_TARGET_STABLE_FRAMES,
): DragCandidateState {
  if (candidate.key === state.stable.key) return { stable: state.stable, pending: null };
  if (state.pending?.candidate.key === candidate.key) {
    const pending = { ...state.pending, frames: state.pending.frames + 1 };
    if (now - pending.since >= minimumDurationMs && pending.frames >= minimumFrames) {
      return { stable: candidate, pending: null };
    }
    return { stable: state.stable, pending };
  }
  return {
    stable: state.stable,
    pending: { candidate, since: now, frames: 1 },
  };
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

function candidateFromPlugin(plugin: any): DragCandidate {
  if (plugin.overlapNode) {
    return {
      key: `child:${nodeUid(plugin.overlapNode)}`,
      overlapNode: plugin.overlapNode,
      prevNode: null,
      nextNode: null,
    };
  }
  if (plugin.prevNode) {
    return {
      key: `after:${nodeUid(plugin.prevNode)}`,
      overlapNode: null,
      prevNode: plugin.prevNode,
      nextNode: null,
    };
  }
  if (plugin.nextNode) {
    return {
      key: `before:${nodeUid(plugin.nextNode)}`,
      overlapNode: null,
      prevNode: null,
      nextNode: plugin.nextNode,
    };
  }
  return { key: 'none', overlapNode: null, prevNode: null, nextNode: null };
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

function isVerticalLayout(layout: string): boolean {
  return layout === 'organizationStructure' || layout === 'catalogOrganization';
}

function nodeRect(plugin: any, node: any): DragGuideRect | null {
  return normalizeRect(node?.group?.rbox?.(plugin.mindMap.otherDraw) ?? node?.group?.bbox?.());
}

function ghostRect(plugin: any): DragGuideRect | null {
  return normalizeRect(plugin.clone?.rbox?.(plugin.mindMap.otherDraw) ?? plugin.clone?.bbox?.());
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
 * Keeps simple-mind-map's native target calculation and drop commands, while
 * replacing the upstream 300 ms overlap throttle with KMind Zen's per-frame
 * candidate sampling and 60 ms / 3-frame target stabilisation.
 */
export default class YeMindDrag extends Drag {
  bindEvent(): void {
    const plugin = this as any;
    plugin.onNodeMousedown = plugin.onNodeMousedown.bind(this);
    plugin.onMousemove = plugin.onMousemove.bind(this);
    plugin.onMouseup = plugin.onMouseup.bind(this);
    plugin.__ymzRawCheckOverlap = Drag.prototype.checkOverlapNode.bind(this);
    plugin.__ymzCandidateState = createDragCandidateState(candidateFromPlugin(plugin));
    plugin.__ymzOverlapFrame = null;
    plugin.checkOverlapNode = () => this.scheduleOfficialCandidateCheck();

    plugin.mindMap.on('node_mousedown', plugin.onNodeMousedown);
    plugin.mindMap.on('mousemove', plugin.onMousemove);
    plugin.mindMap.on('node_mouseup', plugin.onMouseup);
    plugin.mindMap.on('mouseup', plugin.onMouseup);
  }

  createCloneNode(): void {
    super.createCloneNode();
    const plugin = this as any;
    plugin.__ymzCandidateState = createDragCandidateState({
      key: 'none',
      overlapNode: null,
      prevNode: null,
      nextNode: null,
    });
    this.ensureGuideLines();
    this.updateOfficialGuideLines();
  }

  onMove(x: number, y: number, event: MouseEvent): void {
    super.onMove(x, y, event);
    this.updateOfficialGuideLines();
  }

  async onMouseup(event: MouseEvent): Promise<void> {
    const plugin = this as any;
    this.flushOfficialCandidateCheck();
    if (plugin.__ymzCandidateState?.stable) applyCandidate(plugin, plugin.__ymzCandidateState.stable);
    await super.onMouseup(event);
  }

  removeCloneNode(): void {
    this.cancelCandidateFrame();
    this.removeGuideLines();
    super.removeCloneNode();
  }

  beforePluginRemove(): void {
    this.cancelCandidateFrame();
    this.removeGuideLines();
    super.beforePluginRemove();
  }

  beforePluginDestroy(): void {
    this.cancelCandidateFrame();
    this.removeGuideLines();
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
    if (plugin.__ymzOverlapFrame === null) return;
    cancelFrame(plugin.__ymzOverlapFrame);
    plugin.__ymzOverlapFrame = null;
    this.runOfficialCandidateCheck(animationNow());
  }

  private runOfficialCandidateCheck(now: number): void {
    const plugin = this as any;
    if (!plugin.clone || !plugin.placeholder || !plugin.drawTransform) return;
    plugin.__ymzRawCheckOverlap?.();
    this.styleUpstreamPlaceholderLines();
    const candidate = candidateFromPlugin(plugin);
    plugin.__ymzCandidateState = updateStableDragCandidate(
      plugin.__ymzCandidateState ?? createDragCandidateState(candidate),
      candidate,
      now,
    );
    applyCandidate(plugin, plugin.__ymzCandidateState.stable);
    this.updateOfficialGuideLines();
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
  }

  private updateOfficialGuideLines(): void {
    const plugin = this as any;
    if (!plugin.clone) {
      plugin.__ymzTargetGuideLine?.hide?.();
      plugin.__ymzOriginGuideLine?.hide?.();
      return;
    }
    this.ensureGuideLines();
    const state: DragCandidateState = plugin.__ymzCandidateState
      ?? createDragCandidateState(candidateFromPlugin(plugin));
    const stable = state.stable;
    const ghost = ghostRect(plugin);
    if (!ghost) {
      plugin.__ymzTargetGuideLine?.hide?.();
      plugin.__ymzOriginGuideLine?.hide?.();
      return;
    }

    const orientation: DragGuideOrientation = isVerticalLayout(String(plugin.mindMap.opt.layout))
      ? 'vertical'
      : 'horizontal';
    const stableTarget = stable.key === 'none' ? null : resolveDragGuideTarget(stable);
    const target = nodeRect(plugin, stableTarget);
    if (target) {
      plugin.__ymzTargetGuideLine
        .plot(calculateDragGuidePath(target, ghost, orientation))
        .stroke({ color: 'rgba(34, 197, 94, 0.9)', width: 2.5, linecap: 'round' })
        .attr({ 'stroke-dasharray': '6 6', opacity: 1, 'pointer-events': 'none' })
        .show()
        .front();
    } else {
      plugin.__ymzTargetGuideLine?.hide?.();
    }

    const originParent = plugin.mousedownNode?.parent ?? null;
    const origin = nodeRect(plugin, originParent);
    if (origin && !stableTarget) {
      const distance = endpointDistance(origin, ghost, orientation);
      const style = calculateOriginalParentGuideStyle(distance);
      plugin.__ymzOriginGuideLine
        .plot(calculateDragGuidePath(origin, ghost, orientation))
        .stroke({ color: `rgba(239, 68, 68, ${style.opacity.toFixed(3)})`, width: style.width, linecap: 'round' })
        .attr({ 'stroke-dasharray': '3 6', opacity: 1, 'pointer-events': 'none' })
        .show()
        .front();
    } else {
      plugin.__ymzOriginGuideLine?.hide?.();
    }
  }

  private styleUpstreamPlaceholderLines(): void {
    const plugin = this as any;
    const lines = [plugin.placeHolderLine, ...(plugin.placeHolderExtraLines ?? [])].filter(Boolean);
    lines.forEach((line: any) => {
      line.attr?.({ 'stroke-dasharray': '6 6', opacity: 0.95, 'pointer-events': 'none' });
      line.front?.();
    });
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
    plugin.__ymzTargetGuideLine = null;
    plugin.__ymzOriginGuideLine = null;
  }
}

(YeMindDrag as any).instanceName = 'drag';
