import AssociativeLine from 'simple-mind-map/src/plugins/AssociativeLine';
import { resolveRelationHitWidth } from './relationHitArea';

const BaseAssociativeLine = AssociativeLine as any;

function configureHitPath(clickPath: any, width: number, color = 'transparent'): void {
  if (!clickPath) return;
  clickPath.stroke?.({ width, color });
  clickPath.fill?.({ color: 'none' });
  clickPath.attr?.({
    'data-yemind-relation-hit': 'true',
    'pointer-events': 'stroke',
    'vector-effect': 'non-scaling-stroke',
  });
  clickPath.addClass?.('ymz-associative-line-hit');
}

/**
 * Upstream renders a second transparent SVG path as the relation hit target.
 * YeMind keeps that path wide while inactive, then restores the normal active
 * visual width while selected, so usability improves without changing the
 * relation's visible design or node geometry.
 */
export default class YeMindAssociativeLine extends BaseAssociativeLine {
  drawLine(startPoint: any, endPoint: any, node: any, toNode: any): void {
    super.drawLine(startPoint, endPoint, node, toNode);
    const line = Array.isArray(this.lineList) ? this.lineList[this.lineList.length - 1] : null;
    const clickPath = line?.[1];
    const config = this.getStyleConfig?.(node, toNode) ?? {};
    configureHitPath(clickPath, resolveRelationHitWidth(config.associativeLineActiveWidth));
  }

  setActiveLine(payload: any): void {
    super.setActiveLine(payload);
    const config = this.getStyleConfig?.(payload?.node, payload?.toNode) ?? {};
    const width = Number(config.associativeLineActiveWidth) || 3;
    configureHitPath(payload?.clickPath, width, config.associativeLineActiveColor);
  }

  clearActiveLine(): void {
    const active = this.activeLine;
    const clickPath = active?.[1];
    const node = active?.[3];
    const toNode = active?.[4];
    const config = node && toNode ? (this.getStyleConfig?.(node, toNode) ?? {}) : {};
    super.clearActiveLine();
    if (clickPath) configureHitPath(clickPath, resolveRelationHitWidth(config.associativeLineActiveWidth));
  }

  updateActiveLineStyle(): void {
    super.updateActiveLineStyle();
    const active = this.activeLine;
    if (!active) return;
    const config = this.getStyleConfig?.(active[3], active[4]) ?? {};
    configureHitPath(active[1], Number(config.associativeLineActiveWidth) || 3, config.associativeLineActiveColor);
  }

  checkOverlapNode(x: number, y: number): void {
    if (!this.isCreatingLine || !this.creatingStartNode || !this.mindMap?.renderer?.root) return;
    super.checkOverlapNode(x, y);
  }

  completeCreateLine(node: any): void {
    if (!this.isCreatingLine || !this.creatingStartNode || !node) return;
    super.completeCreateLine(node);
  }

  cancelCreateLine(): void {
    if (!this.isCreatingLine && !this.creatingLine) return;
    super.cancelCreateLine();
  }
}
