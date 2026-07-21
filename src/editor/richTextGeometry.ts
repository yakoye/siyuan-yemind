export interface RectSnapshot {
  x: number;
  y: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  toJSON(): Record<string, number>;
}

export interface ResolvedTextRect {
  rect: DOMRect;
  source: 'bounding-client-rect' | 'screen-ctm';
  elementConnected: boolean | null;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isUsableTextRect(value: unknown): value is DOMRect {
  if (!value || typeof value !== 'object') return false;
  const rect = value as Partial<DOMRect>;
  return finite(rect.left)
    && finite(rect.top)
    && finite(rect.width)
    && finite(rect.height)
    && rect.width > 0.5
    && rect.height > 0.5;
}

export function snapshotRect(value: DOMRect): DOMRect {
  const left = Number(value.left);
  const top = Number(value.top);
  const width = Number(value.width);
  const height = Number(value.height);
  const right = finite(value.right) ? Number(value.right) : left + width;
  const bottom = finite(value.bottom) ? Number(value.bottom) : top + height;
  const x = finite(value.x) ? Number(value.x) : left;
  const y = finite(value.y) ? Number(value.y) : top;
  if (typeof DOMRect === 'function') return new DOMRect(left, top, width, height);
  return {
    x,
    y,
    left,
    top,
    right,
    bottom,
    width,
    height,
    toJSON: () => ({ x, y, left, top, right, bottom, width, height }),
  } as DOMRect;
}

export function renderedNodeUid(node: any): string {
  if (!node) return '';
  const value = typeof node.getData === 'function'
    ? node.getData('uid')
    : node?.nodeData?.data?.uid ?? node?.uid;
  return String(value ?? '');
}

export function resolveLiveRenderedNode(mindMap: any, node: any, uid = renderedNodeUid(node)): any {
  if (!uid) return node ?? null;
  const current = mindMap?.renderer?.findNodeByUid?.(uid);
  return current ?? node ?? null;
}

function numberAttribute(group: any, name: string): number {
  const value = Number(group?.attr?.(name));
  return finite(value) && value > 0 ? value : 0;
}

function transformPoint(matrix: any, x: number, y: number): { x: number; y: number } | null {
  const values = [matrix?.a, matrix?.b, matrix?.c, matrix?.d, matrix?.e, matrix?.f];
  if (!values.every(finite)) return null;
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

function rectFromScreenMatrix(element: SVGGraphicsElement, group: any): DOMRect | null {
  let matrix: DOMMatrix | SVGMatrix | null = null;
  try {
    matrix = element.getScreenCTM?.() ?? null;
  } catch {
    matrix = null;
  }
  if (!matrix) return null;

  let box: { x: number; y: number; width: number; height: number } | null = null;
  try {
    const candidate = element.getBBox?.();
    if (candidate && finite(candidate.x) && finite(candidate.y) && finite(candidate.width) && finite(candidate.height)
      && candidate.width > 0.5 && candidate.height > 0.5) {
      box = candidate;
    }
  } catch {
    box = null;
  }
  if (!box) {
    const width = numberAttribute(group, 'data-width');
    const height = numberAttribute(group, 'data-height');
    if (width <= 0.5 || height <= 0.5) return null;
    box = { x: 0, y: 0, width, height };
  }

  const points = [
    transformPoint(matrix, box.x, box.y),
    transformPoint(matrix, box.x + box.width, box.y),
    transformPoint(matrix, box.x, box.y + box.height),
    transformPoint(matrix, box.x + box.width, box.y + box.height),
  ];
  if (points.some((point) => !point)) return null;
  const xs = points.map((point) => point!.x);
  const ys = points.map((point) => point!.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const width = right - left;
  const height = bottom - top;
  const result = new DOMRect(left, top, width, height);
  return isUsableTextRect(result) ? result : null;
}

/**
 * Resolve the current on-screen text rectangle without trusting a hidden or
 * detached SVG node. During structured drag, simple-mind-map can rerender the
 * node and the rich-text plugin may temporarily retain an old SVG wrapper.
 */
export function resolveRenderedTextRect(node: any): ResolvedTextRect | null {
  const group = node?._textData?.node;
  const element = group?.node as SVGGraphicsElement | null | undefined;
  if (!element) return null;
  const connected = typeof element.isConnected === 'boolean' ? element.isConnected : null;

  if (connected !== false) {
    try {
      const rect = element.getBoundingClientRect?.();
      if (isUsableTextRect(rect)) {
        return {
          rect: snapshotRect(rect),
          source: 'bounding-client-rect',
          elementConnected: connected,
        };
      }
    } catch {
      // Continue with the transform-matrix fallback.
    }

    const matrixRect = rectFromScreenMatrix(element, group);
    if (matrixRect) {
      return {
        rect: snapshotRect(matrixRect),
        source: 'screen-ctm',
        elementConnected: connected,
      };
    }
  }
  return null;
}
