import Drag from 'simple-mind-map/src/plugins/Drag';

export interface DragGuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragGuideEndpoints {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
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

export function calculateDragGuideEndpoints(
  source: DragGuideRect,
  target: DragGuideRect,
): DragGuideEndpoints {
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  const deltaX = targetCenterX - sourceCenterX;
  const deltaY = targetCenterY - sourceCenterY;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return {
      startX: deltaX >= 0 ? source.x + source.width : source.x,
      startY: sourceCenterY,
      endX: deltaX >= 0 ? target.x : target.x + target.width,
      endY: targetCenterY,
    };
  }

  return {
    startX: sourceCenterX,
    startY: deltaY >= 0 ? source.y + source.height : source.y,
    endX: targetCenterX,
    endY: deltaY >= 0 ? target.y : target.y + target.height,
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

export default class YeMindDrag extends Drag {
  private yemindTargetGuideLine: any = null;

  createCloneNode(): void {
    super.createCloneNode();
    this.ensureTargetGuideLine();
    this.updateTargetGuideLine();
  }

  onMove(x: number, y: number, event: MouseEvent): void {
    super.onMove(x, y, event);
    this.updateTargetGuideLine();
  }

  checkOverlapNode(): void {
    super.checkOverlapNode();
    this.styleUpstreamPlaceholderLines();
    this.updateTargetGuideLine();
  }

  removeCloneNode(): void {
    this.removeTargetGuideLine();
    super.removeCloneNode();
  }

  beforePluginRemove(): void {
    this.removeTargetGuideLine();
    super.beforePluginRemove();
  }

  beforePluginDestroy(): void {
    this.removeTargetGuideLine();
    super.beforePluginDestroy();
  }

  private ensureTargetGuideLine(): void {
    if (this.yemindTargetGuideLine) return;
    const plugin = this as any;
    this.yemindTargetGuideLine = plugin.mindMap.otherDraw
      .path()
      .fill({ color: 'none' })
      .attr({ 'pointer-events': 'none' })
      .hide();
  }

  private updateTargetGuideLine(): void {
    const plugin = this as any;
    if (!plugin.clone) {
      this.yemindTargetGuideLine?.hide?.();
      return;
    }
    const target = resolveDragGuideTarget(plugin);
    const sourceRect = normalizeRect(plugin.clone.rbox?.(plugin.mindMap.otherDraw) ?? plugin.clone.bbox?.());
    const targetRect = normalizeRect(target?.group?.rbox?.(plugin.mindMap.otherDraw) ?? target?.group?.bbox?.());
    if (!sourceRect || !targetRect) {
      this.yemindTargetGuideLine?.hide?.();
      return;
    }

    this.ensureTargetGuideLine();
    const points = calculateDragGuideEndpoints(sourceRect, targetRect);
    const config = plugin.mindMap.opt.dragPlaceholderLineConfig ?? {};
    const color = config.color || '#27896b';
    const width = Number(config.width) || 2;
    const dasharray = config.dasharray || '7,5';
    this.yemindTargetGuideLine
      .plot(`M ${points.startX} ${points.startY} L ${points.endX} ${points.endY}`)
      .stroke({ color, width, linecap: 'round' })
      .attr({ 'stroke-dasharray': dasharray, opacity: 0.95 })
      .show()
      .front();
  }

  private styleUpstreamPlaceholderLines(): void {
    const plugin = this as any;
    const config = plugin.mindMap.opt.dragPlaceholderLineConfig ?? {};
    const dasharray = config.dasharray || '7,5';
    const lines = [plugin.placeHolderLine, ...(plugin.placeHolderExtraLines ?? [])].filter(Boolean);
    lines.forEach((line: any) => {
      line.attr?.({ 'stroke-dasharray': dasharray, opacity: 0.95, 'pointer-events': 'none' });
      line.front?.();
    });
  }

  private removeTargetGuideLine(): void {
    this.yemindTargetGuideLine?.remove?.();
    this.yemindTargetGuideLine = null;
  }
}

(YeMindDrag as any).instanceName = 'drag';
