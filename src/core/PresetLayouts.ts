import LogicalStructure from 'simple-mind-map/src/layouts/LogicalStructure';
import MindMapLayout from 'simple-mind-map/src/layouts/MindMap';
import CatalogOrganization from 'simple-mind-map/src/layouts/CatalogOrganization';
import OrganizationStructure from 'simple-mind-map/src/layouts/OrganizationStructure';
import Timeline from 'simple-mind-map/src/layouts/Timeline';
import VerticalTimeline from 'simple-mind-map/src/layouts/VerticalTimeline';
import Fishbone from 'simple-mind-map/src/layouts/Fishbone';
import RightFishbone from './RightFishbone';

type MirrorTransform = 'mirror-x' | 'mirror-y' | 'mirror-xy';

interface Position {
  left: number;
  top: number;
  customLeft: number | undefined;
  customTop: number | undefined;
}

function visitTree(root: any, callback: (node: any) => void): void {
  if (!root) return;
  callback(root);
  (root.children ?? []).forEach((child: any) => visitTree(child, callback));
}

function moveSubtree(root: any, deltaX: number, deltaY: number): void {
  visitTree(root, (node) => {
    node._left = Number(node.left) + deltaX;
    node._top = Number(node.top) + deltaY;
    if (node.customLeft !== undefined) node.customLeft = Number(node.customLeft) + deltaX;
    if (node.customTop !== undefined) node.customTop = Number(node.customTop) + deltaY;
  });
}

function commandParameterCounts(command: string): number {
  return ({ M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 } as Record<string, number>)[command.toUpperCase()] ?? 0;
}

function coordinateIndexes(command: string): { x: Set<number>; y: Set<number> } {
  switch (command.toUpperCase()) {
    case 'M':
    case 'L':
    case 'T': return { x: new Set([0]), y: new Set([1]) };
    case 'H': return { x: new Set([0]), y: new Set() };
    case 'V': return { x: new Set(), y: new Set([0]) };
    case 'C': return { x: new Set([0, 2, 4]), y: new Set([1, 3, 5]) };
    case 'S':
    case 'Q': return { x: new Set([0, 2]), y: new Set([1, 3]) };
    case 'A': return { x: new Set([5]), y: new Set([6]) };
    default: return { x: new Set(), y: new Set() };
  }
}

export function mirrorSvgPath(
  path: string,
  axisX: number,
  axisY: number,
  transform: MirrorTransform,
): string {
  const tokens = String(path ?? '').match(/[a-zA-Z]|[-+]?(?:\d*\.?\d+(?:e[-+]?\d+)?)/gi) ?? [];
  const output: string[] = [];
  let command = '';
  let index = 0;
  let count = 0;
  let indexes = { x: new Set<number>(), y: new Set<number>() };
  tokens.forEach((token) => {
    if (/^[a-zA-Z]$/.test(token)) {
      command = token;
      index = 0;
      count = commandParameterCounts(command);
      indexes = coordinateIndexes(command);
      output.push(command);
      return;
    }
    let value = Number(token);
    if (command === command.toUpperCase()) {
      if (transform !== 'mirror-y' && indexes.x.has(index)) value = axisX * 2 - value;
      if (transform !== 'mirror-x' && indexes.y.has(index)) value = axisY * 2 - value;
    }
    output.push(String(value));
    if (count > 0) index = (index + 1) % count;
  });
  return output.join(' ');
}

function createAliasLayout(BaseLayout: any, baseLayout: string): any {
  return class YeMindAliasLayout extends BaseLayout {
    constructor(options: any) {
      super(options, baseLayout);
      this.layout = baseLayout;
    }
  };
}

function createMirroredLayout(BaseLayout: any, baseLayout: string, transform: MirrorTransform): any {
  return class YeMindMirroredLayout extends BaseLayout {
    private mirrorAxisX = 0;
    private mirrorAxisY = 0;
    private original = new Map<any, Position>();
    private pathTransformEnabled = false;

    constructor(options: any) {
      super(options, baseLayout);
      this.layout = baseLayout;
    }

    doLayout(callback: (root: any) => void): void {
      BaseLayout.prototype.doLayout.call(this, (root: any) => {
        this.mirrorAxisX = Number(root.left) + Number(root.width) / 2;
        this.mirrorAxisY = Number(root.top) + Number(root.height) / 2;
        this.original.clear();
        visitTree(root, (node) => {
          const position: Position = {
            left: Number(node.left) || 0,
            top: Number(node.top) || 0,
            customLeft: node.customLeft,
            customTop: node.customTop,
          };
          this.original.set(node, position);
          if (transform !== 'mirror-y') {
            const left = this.mirrorAxisX * 2 - (position.left + Number(node.width || 0));
            node._left = left;
            if (node.customLeft !== undefined) node.customLeft = left;
          }
          if (transform !== 'mirror-x') {
            const top = this.mirrorAxisY * 2 - (position.top + Number(node.height || 0));
            node._top = top;
            if (node.customTop !== undefined) node.customTop = top;
          }
        });
        callback(root);
      });
    }

    private withOriginalGeometry<T>(callback: () => T): T {
      const mirrored = new Map<any, Position>();
      this.original.forEach((position, node) => {
        mirrored.set(node, {
          left: Number(node.left) || 0,
          top: Number(node.top) || 0,
          customLeft: node.customLeft,
          customTop: node.customTop,
        });
        node._left = position.left;
        node._top = position.top;
        if (position.customLeft !== undefined) node.customLeft = position.customLeft;
        if (position.customTop !== undefined) node.customTop = position.customTop;
      });
      this.pathTransformEnabled = true;
      try {
        return callback();
      } finally {
        this.pathTransformEnabled = false;
        mirrored.forEach((position, node) => {
          node._left = position.left;
          node._top = position.top;
          if (position.customLeft !== undefined) node.customLeft = position.customLeft;
          if (position.customTop !== undefined) node.customTop = position.customTop;
        });
      }
    }

    transformPath(path: string): string {
      const transformed = BaseLayout.prototype.transformPath.call(this, path);
      return this.pathTransformEnabled
        ? mirrorSvgPath(transformed, this.mirrorAxisX, this.mirrorAxisY, transform)
        : transformed;
    }

    renderLine(node: any, lines: any[], style?: (...args: any[]) => void, lineStyle?: string): any {
      return this.withOriginalGeometry(() => BaseLayout.prototype.renderLine.call(this, node, lines, style, lineStyle));
    }

    renderGeneralization(list: any[]): void {
      if (typeof BaseLayout.prototype.renderGeneralization !== 'function') return;
      this.withOriginalGeometry(() => BaseLayout.prototype.renderGeneralization.call(this, list));
      list.forEach((item) => {
        const node = item?.generalizationNode;
        if (!node) return;
        if (transform !== 'mirror-y') node.left = this.mirrorAxisX * 2 - (Number(node.left) + Number(node.width || 0));
        if (transform !== 'mirror-x') node.top = this.mirrorAxisY * 2 - (Number(node.top) + Number(node.height || 0));
      });
    }
  };
}

function directionFromAngle(angle: number): 'left' | 'right' | 'top' | 'bottom' {
  const x = Math.cos(angle);
  const y = Math.sin(angle);
  return Math.abs(x) >= Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'top' : 'bottom');
}

function renderDirectionalLines(layout: any, node: any, lines: any[], style?: (...args: any[]) => void): void {
  if (!node?.children?.length) return;
  const parentCenter = {
    x: Number(node.left) + Number(node.width) / 2,
    y: Number(node.top) + Number(node.height) / 2,
  };
  node.children.forEach((child: any, index: number) => {
    const childCenter = {
      x: Number(child.left) + Number(child.width) / 2,
      y: Number(child.top) + Number(child.height) / 2,
    };
    const dx = childCenter.x - parentCenter.x;
    const dy = childCenter.y - parentCenter.y;
    let x1 = parentCenter.x;
    let y1 = parentCenter.y;
    let x2 = childCenter.x;
    let y2 = childCenter.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      x1 += dx < 0 ? -Number(node.width) / 2 : Number(node.width) / 2;
      x2 += dx < 0 ? Number(child.width) / 2 : -Number(child.width) / 2;
    } else {
      y1 += dy < 0 ? -Number(node.height) / 2 : Number(node.height) / 2;
      y2 += dy < 0 ? Number(child.height) / 2 : -Number(child.height) / 2;
    }
    const path = Math.abs(dx) >= Math.abs(dy)
      ? `M ${x1},${y1} C ${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`
      : `M ${x1},${y1} C ${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`;
    layout.setLineStyle(style, lines[index], layout.transformPath(path), child);
  });
}

class BidirectionalOrganization extends OrganizationStructure {
  doLayout(callback: (root: any) => void): void {
    super.doLayout((root: any) => {
      const axisY = Number(root.top) + Number(root.height) / 2;
      (root.children ?? []).forEach((child: any, index: number) => {
        const top = index % 2 === 0;
        visitTree(child, (node) => {
          node.dir = top ? 'top' : 'bottom';
          if (top) node._top = axisY * 2 - (Number(node.top) + Number(node.height || 0));
        });
      });
      callback(root);
    });
  }

  renderLine(node: any, lines: any[], style?: (...args: any[]) => void): void {
    renderDirectionalLines(this, node, lines, style);
  }
}

class SerpentineTimeline extends Timeline {
  private rootSequence: any[] = [];

  constructor(options: any) {
    super(options, 'timeline');
    this.layout = 'timeline';
  }

  doLayout(callback: (root: any) => void): void {
    super.doLayout((root: any) => {
      const children = root.children ?? [];
      this.rootSequence = children;
      const columnWidth = Math.max(
        Number(root.width || 0),
        ...children.map((node: any) => Number(node.width || 0)),
      ) + 62;
      const rowHeight = Math.max(
        Number(root.height || 0),
        ...children.map((node: any) => Number(node.height || 0)),
      ) + 92;
      const rowSize = 4;
      children.forEach((child: any, index: number) => {
        const slot = index + 1;
        const row = Math.floor(slot / rowSize);
        const rawColumn = slot % rowSize;
        const column = row % 2 === 0 ? rawColumn : rowSize - 1 - rawColumn;
        const targetLeft = Number(root.left) + column * columnWidth;
        const targetTop = Number(root.top) + row * rowHeight;
        moveSubtree(child, targetLeft - Number(child.left), targetTop - Number(child.top));
        child.dir = row % 2 === 0 ? 'right' : 'left';
      });
      callback(root);
    });
  }

  renderLine(node: any, lines: any[], style?: (...args: any[]) => void): void {
    if (!node?.children?.length) return;
    if (!node.isRoot) {
      renderDirectionalLines(this, node, lines, style);
      return;
    }
    node.children.forEach((child: any, index: number) => {
      const previous = index === 0 ? node : this.rootSequence[index - 1];
      const previousCenter = {
        x: Number(previous.left) + Number(previous.width) / 2,
        y: Number(previous.top) + Number(previous.height) / 2,
      };
      const childCenter = {
        x: Number(child.left) + Number(child.width) / 2,
        y: Number(child.top) + Number(child.height) / 2,
      };
      const sameRow = Math.abs(previousCenter.y - childCenter.y) < 4;
      const path = sameRow
        ? `M ${previousCenter.x},${previousCenter.y} L ${childCenter.x},${childCenter.y}`
        : `M ${previousCenter.x},${previousCenter.y} C ${previousCenter.x + 64},${previousCenter.y} ${childCenter.x + 64},${childCenter.y} ${childCenter.x},${childCenter.y}`;
      this.setLineStyle(style, lines[index], this.transformPath(path), child);
    });
  }
}

class TreeTableTopLayout extends OrganizationStructure {
  renderLine(node: any, lines: any[], style?: (...args: any[]) => void): void {
    if (!node?.children?.length) return;
    const parentX = Number(node.left) + Number(node.width) / 2;
    const parentY = Number(node.top) + Number(node.height);
    node.children.forEach((child: any, index: number) => {
      const childX = Number(child.left) + Number(child.width) / 2;
      const childY = Number(child.top);
      const railY = parentY + (childY - parentY) * 0.48;
      const path = `M ${parentX},${parentY} L ${parentX},${railY} L ${childX},${railY} L ${childX},${childY}`;
      this.setLineStyle(style, lines[index], this.transformPath(path), child);
    });
  }
}

class TreeTableLeftLayout extends LogicalStructure {
  constructor(options: any) {
    super(options, 'logicalStructure');
  }

  renderLine(node: any, lines: any[], style?: (...args: any[]) => void): void {
    if (!node?.children?.length) return;
    const parentX = Number(node.left) + Number(node.width);
    const parentY = Number(node.top) + Number(node.height) / 2;
    node.children.forEach((child: any, index: number) => {
      const childX = Number(child.left);
      const childY = Number(child.top) + Number(child.height) / 2;
      const railX = parentX + (childX - parentX) * 0.48;
      const path = `M ${parentX},${parentY} L ${railX},${parentY} L ${railX},${childY} L ${childX},${childY}`;
      this.setLineStyle(style, lines[index], this.transformPath(path), child);
    });
  }
}

class BracketLayout extends LogicalStructure {
  private readonly useLeft: boolean;

  constructor(options: any, useLeft: boolean) {
    super(options, useLeft ? 'logicalStructureLeft' : 'logicalStructure');
    this.useLeft = useLeft;
  }

  renderLine(node: any, lines: any[], style?: (...args: any[]) => void): void {
    if (!node?.children?.length) return;
    const parentX = this.useLeft ? Number(node.left) : Number(node.left) + Number(node.width);
    const parentY = Number(node.top) + Number(node.height) / 2;
    node.children.forEach((child: any, index: number) => {
      const childX = this.useLeft ? Number(child.left) + Number(child.width) : Number(child.left);
      const childY = Number(child.top) + Number(child.height) / 2;
      const bracketX = parentX + (childX - parentX) * 0.56;
      const middleY = parentY + (childY - parentY) / 2;
      const path = `M ${parentX},${parentY} C ${bracketX},${parentY} ${bracketX},${middleY} ${bracketX},${middleY} C ${bracketX},${childY} ${bracketX},${childY} ${childX},${childY}`;
      this.setLineStyle(style, lines[index], this.transformPath(path), child);
    });
  }
}

class BracketRightLayout extends BracketLayout {
  constructor(options: any) { super(options, false); }
}

class BracketLeftLayout extends BracketLayout {
  constructor(options: any) { super(options, true); }
}

class RadialPresetLayout extends MindMapLayout {
  private readonly mode: 'sector' | 'circle' | 'bubble';

  constructor(options: any, mode: 'sector' | 'circle' | 'bubble') {
    super(options);
    this.mode = mode;
  }

  doLayout(callback: (root: any) => void): void {
    super.doLayout((root: any) => {
      const cx = Number(root.left) + Number(root.width) / 2;
      const cy = Number(root.top) + Number(root.height) / 2;
      const children = root.children ?? [];
      const start = this.mode === 'sector' ? -Math.PI * 0.72 : -Math.PI;
      const span = this.mode === 'sector' ? Math.PI * 1.44 : Math.PI * 2;
      const place = (node: any, angle: number, depth: number, sector: number): void => {
        const radius = (this.mode === 'bubble' ? 96 : 112) + depth * (this.mode === 'bubble' ? 76 : 96);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        node._left = x - Number(node.width) / 2;
        node._top = y - Number(node.height) / 2;
        node.dir = directionFromAngle(angle);
        const descendants = node.children ?? [];
        descendants.forEach((child: any, index: number) => {
          const local = descendants.length <= 1
            ? angle
            : angle - sector / 2 + sector * (index / (descendants.length - 1));
          place(child, local, depth + 1, Math.max(0.22, sector * 0.58));
        });
      };
      children.forEach((child: any, index: number) => {
        const angle = start + span * ((index + 0.5) / Math.max(1, children.length));
        place(child, angle, 1, span / Math.max(3, children.length));
      });
      callback(root);
    });
  }

  renderLine(node: any, lines: any[], style?: (...args: any[]) => void): void {
    renderDirectionalLines(this, node, lines, style);
  }
}

class RadialSectorLayout extends RadialPresetLayout {
  constructor(options: any) { super(options, 'sector'); }
}
class CircleLayout extends RadialPresetLayout {
  constructor(options: any) { super(options, 'circle'); }
}
class BubbleLayout extends RadialPresetLayout {
  constructor(options: any) { super(options, 'bubble'); }
}

class YeMindFishboneLeft extends Fishbone {
  isFishbone2(): boolean { return true; }
}
class YeMindFishboneRight extends RightFishbone {
  isFishbone2(): boolean { return true; }
}

export const PRESET_LAYOUT_CLASSES: Record<string, any> = {
  yemindRightMindMap: createAliasLayout(LogicalStructure, 'logicalStructure'),
  yemindLeftMindMap: createAliasLayout(LogicalStructure, 'logicalStructureLeft'),
  yemindMindMap: createAliasLayout(MindMapLayout, 'mindMap'),
  yemindReverseMindMap: createMirroredLayout(MindMapLayout, 'mindMap', 'mirror-x'),
  yemindBalancedDown: createAliasLayout(OrganizationStructure, 'organizationStructure'),

  yemindTreeRightDown: createAliasLayout(CatalogOrganization, 'catalogOrganization'),
  yemindTreeLeftDown: createMirroredLayout(CatalogOrganization, 'catalogOrganization', 'mirror-x'),
  yemindTreeDownSymmetric: createAliasLayout(OrganizationStructure, 'organizationStructure'),
  yemindTreeUpSymmetric: createMirroredLayout(OrganizationStructure, 'organizationStructure', 'mirror-y'),
  yemindTreeRightUp: createMirroredLayout(CatalogOrganization, 'catalogOrganization', 'mirror-y'),
  yemindTreeLeftUp: createMirroredLayout(CatalogOrganization, 'catalogOrganization', 'mirror-xy'),

  yemindTimelineRight: createAliasLayout(Timeline, 'timeline'),
  yemindTimelineLeft: createMirroredLayout(Timeline, 'timeline', 'mirror-x'),
  yemindTimelineDown: createAliasLayout(VerticalTimeline, 'verticalTimeline'),
  yemindTimelineUp: createMirroredLayout(VerticalTimeline, 'verticalTimeline', 'mirror-y'),
  yemindTimelineS: SerpentineTimeline,

  yemindOrganizationDown: createAliasLayout(OrganizationStructure, 'organizationStructure'),
  yemindOrganizationBidirectional: BidirectionalOrganization,
  yemindOrganizationUp: createMirroredLayout(OrganizationStructure, 'organizationStructure', 'mirror-y'),

  yemindFishboneLeft: YeMindFishboneLeft,
  yemindFishboneRight: YeMindFishboneRight,

  yemindTreeTableTop: TreeTableTopLayout,
  yemindTreeTableLeft: TreeTableLeftLayout,
  yemindRadialSector: RadialSectorLayout,
  yemindCircle: CircleLayout,
  yemindBubble: BubbleLayout,
  yemindBracketRight: BracketRightLayout,
  yemindBracketLeft: BracketLeftLayout,
};
