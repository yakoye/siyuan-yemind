import Fishbone from 'simple-mind-map/src/layouts/Fishbone';
import { SVG } from '@svgdotjs/svg.js';

const RIGHT_FISH_HEAD_PATH =
  'M284.2857142857143,181 C284.2857142857143,181, 288.2857142857143,177, 284.2857142857143,173 Q 192.1904761904762,0, 0,0 L 0,354 Q 240.23809523809524,354, 280.2857142857143,218.18367346938777 C280.2857142857143,218.18367346938777, 282.2857142857143,214.18367346938777, 280.2857142857143,214.18367346938777 L 247.10204081632654,214.18367346938777 Z';

const RIGHT_FISH_TAIL_PATH =
  'M 819.3342905223708 0 Q 713.1342905223709 -177 606.9342905223708 -177 L 660.0342905223708 0 L 606.9342905223708 177 Q 713.1342905223709 177 819.3342905223708 0 z';

const PARAM_COUNTS: Record<string, number> = {
  M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
};

function xParameterIndexes(command: string): Set<number> {
  switch (command.toUpperCase()) {
    case 'M':
    case 'L':
    case 'T': return new Set([0]);
    case 'H': return new Set([0]);
    case 'C': return new Set([0, 2, 4]);
    case 'S':
    case 'Q': return new Set([0, 2]);
    case 'A': return new Set([5]);
    default: return new Set();
  }
}

/** Mirrors absolute SVG path coordinates while leaving text/image content alone. */
export function mirrorPathHorizontally(path: string, axisX: number): string {
  const tokens = String(path ?? '').match(/[a-zA-Z]|[-+]?(?:\d*\.?\d+(?:e[-+]?\d+)?)/gi) ?? [];
  const output: string[] = [];
  let command = '';
  let parameterIndex = 0;
  let parameterCount = 0;
  let xIndexes = new Set<number>();

  tokens.forEach((token) => {
    if (/^[a-zA-Z]$/.test(token)) {
      command = token;
      parameterIndex = 0;
      parameterCount = PARAM_COUNTS[command.toUpperCase()] ?? 0;
      xIndexes = xParameterIndexes(command);
      output.push(command);
      return;
    }
    const value = Number(token);
    const isAbsolute = command === command.toUpperCase();
    const shouldMirror = isAbsolute && xIndexes.has(parameterIndex);
    output.push(String(shouldMirror ? axisX * 2 - value : value));
    if (parameterCount > 0) parameterIndex = (parameterIndex + 1) % parameterCount;
  });
  return output.join(' ');
}

interface NodePositionSnapshot {
  left: number;
  customLeft: number | undefined;
}

/** Right fishbone is the true horizontal mirror of the proven left fishbone. */
export default class RightFishbone extends Fishbone {
  private mirrorAxisX = 0;
  private originalPositions = new Map<any, NodePositionSnapshot>();
  private pathMirrorEnabled = false;
  private mirroredReady = false;

  isFishbone2(): boolean {
    return this.layout === 'rightFishbone2';
  }

  extendShape(): void {
    if (!this.isFishbone2()) return;
    this.mindMap.addShape({
      name: 'fishHead',
      createShape: (node: any) => {
        const rect = SVG(`<path d="${RIGHT_FISH_HEAD_PATH}"></path>`);
        const { width, height } = node.shapeInstance.getNodeSize();
        rect.size(width, height);
        return rect;
      },
      getPadding: ({ width, height, paddingX, paddingY }: any) => {
        width += paddingX * 2;
        height += paddingY * 2;
        const shapePaddingX = this.paddingXRatio * width;
        width += shapePaddingX * 2;
        const newHeight = width / this.headRatio;
        return { paddingX: shapePaddingX, paddingY: (newHeight - height) / 2 };
      },
    });
  }

  addFishTail(): void {
    if (!this.isFishbone2()) return;
    const exist = this.mindMap.lineDraw.findOne('.smm-layout-fishbone-tail');
    this.fishTail = exist ?? SVG(`<path d="${RIGHT_FISH_TAIL_PATH}"></path>`);
    this.fishTail.addClass('smm-layout-fishbone-tail');
    const tailHeight = this.root.height;
    this.fishTail.size(tailHeight * this.tailRatio, tailHeight);
    this.styleFishTail();
    this.mindMap.lineDraw.add(this.fishTail);
  }

  doLayout(callback: (root: any) => void): void {
    this.mirroredReady = false;
    super.doLayout((root: any) => {
      this.mirrorTreeGeometry(root);
      this.mirroredReady = true;
      this.updateFishTailPosition();
      callback(root);
    });
  }

  mirrorTreeGeometry(root: any): void {
    this.mirrorAxisX = Number(root.left) + Number(root.width) / 2;
    this.originalPositions.clear();
    const visit = (node: any): void => {
      const left = Number(node.left) || 0;
      this.originalPositions.set(node, { left, customLeft: node.customLeft });
      const mirrored = this.mirrorAxisX * 2 - (left + Number(node.width || 0));
      node._left = mirrored;
      if (node.customLeft !== undefined) node.customLeft = mirrored;
      (node.children ?? []).forEach(visit);
    };
    visit(root);
  }

  private withOriginalGeometry<T>(callback: () => T): T {
    const mirrored = new Map<any, NodePositionSnapshot>();
    this.originalPositions.forEach((original, node) => {
      mirrored.set(node, { left: Number(node.left) || 0, customLeft: node.customLeft });
      node._left = original.left;
      if (original.customLeft !== undefined) node.customLeft = original.customLeft;
    });
    this.pathMirrorEnabled = true;
    try {
      return callback();
    } finally {
      this.pathMirrorEnabled = false;
      mirrored.forEach((position, node) => {
        node._left = position.left;
        if (position.customLeft !== undefined) node.customLeft = position.customLeft;
      });
    }
  }

  transformPath(path: string): string {
    const transformed = super.transformPath(path);
    return this.pathMirrorEnabled
      ? mirrorPathHorizontally(transformed, this.mirrorAxisX)
      : transformed;
  }

  renderLine(node: any, lines: any[], style?: (...args: any[]) => void): any {
    return this.withOriginalGeometry(() => super.renderLine(node, lines, style));
  }

  renderGeneralization(list: any[]): void {
    this.withOriginalGeometry(() => super.renderGeneralization(list));
    list.forEach((item) => {
      const generalization = item?.generalizationNode;
      if (!generalization) return;
      generalization.left = this.mirrorAxisX * 2
        - (Number(generalization.left) + Number(generalization.width || 0));
    });
  }

  updateFishTailPosition(): void {
    if (!this.isFishbone2() || !this.fishTail || !this.mirroredReady) return;
    const tailWidth = Number(this.fishTail.bbox?.().width) || Number(this.root.height) * this.tailRatio;
    const mirroredAnchor = this.mirrorAxisX * 2 - Number(this.maxx || 0);
    this.fishTail.x(mirroredAnchor - tailWidth).cy(this.root.top + this.root.height / 2);
  }
}
