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

export interface ComparableRect {
  left: number;
  top: number;
  width?: number;
  height?: number;
}

/**
 * The editable Quill content is the HTML replacement for the SVG text group.
 * Their top-left coordinates must therefore agree before the replacement is
 * allowed to become visible. Width and height intentionally remain outside
 * this predicate: while the user types they may lead the next SVG render by
 * one transaction without making the editor incorrectly anchored.
 */
export function editorContentRectAligned(
  editorRect: ComparableRect | null | undefined,
  targetRect: ComparableRect | null | undefined,
  tolerance = 1.5,
): boolean {
  if (!editorRect || !targetRect) return false;
  const values = [
    editorRect.left,
    editorRect.top,
    targetRect.left,
    targetRect.top,
  ];
  if (!values.every((value) => Number.isFinite(value))) return false;
  const limit = Math.max(0, Number(tolerance) || 0);
  return (
    Math.abs(editorRect.left - targetRect.left) <= limit
    && Math.abs(editorRect.top - targetRect.top) <= limit
  );
}

export function editorHorizontalMargin(
  node: any,
  paddingX: number,
  textContentMargin: number,
  scaleX: number,
): number {
  const scaledPadding = Math.max(0, Number(paddingX) || 0) * Math.max(0, Number(scaleX) || 1);
  const hasPrefix = Boolean(node?._prefixData) || (Array.isArray(node?._iconData) && node._iconData.length > 0);
  if (!hasPrefix) return -scaledPadding;
  const scaledGap = Math.max(0, Number(textContentMargin) || 0) * Math.max(0, Number(scaleX) || 1);
  return -Math.min(scaledPadding, scaledGap);
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

function screenScale(element: SVGGraphicsElement): { x: number; y: number } | null {
  let matrix: DOMMatrix | SVGMatrix | null = null;
  try {
    matrix = element.getScreenCTM?.() ?? null;
  } catch {
    matrix = null;
  }
  if (!matrix) return null;
  const x = Math.hypot(Number(matrix.a), Number(matrix.b));
  const y = Math.hypot(Number(matrix.c), Number(matrix.d));
  if (!finite(x) || !finite(y) || x <= 0 || y <= 0) return null;
  return { x, y };
}

function logicalTextRect(node: any, group: any, element: SVGGraphicsElement, raw: DOMRect): DOMRect {
  const width = numberAttribute(group, 'data-width');
  const height = numberAttribute(group, 'data-height');
  if (width <= 0.5 || height <= 0.5) return snapshotRect(raw);

  const scale = screenScale(element);
  const fallbackScaleY = raw.height / height;
  const scaleX = scale?.x ?? (finite(fallbackScaleY) && fallbackScaleY > 0 ? fallbackScaleY : 1);
  const scaleY = scale?.y ?? (finite(fallbackScaleY) && fallbackScaleY > 0 ? fallbackScaleY : 1);
  const logicalWidth = width * scaleX;
  const logicalHeight = height * scaleY;
  if (!finite(logicalWidth) || !finite(logicalHeight) || logicalWidth <= 0.5 || logicalHeight <= 0.5) {
    return snapshotRect(raw);
  }

  // SVG getBoundingClientRect() returns the painted glyph ink for a plain-text
  // group. A custom-width node stores its real editable box in data-width, so
  // using the ink width makes the upstream HTML editor apply a false scaleX
  // and visibly jump/compress on the first edit frame.
  const align = String(node?.getStyle?.('textAlign', false) ?? node?.getStyle?.('textAlign') ?? '').toLowerCase();
  let left = raw.left;
  if (align === 'right' || align === 'end') left = raw.right - logicalWidth;
  else if (align === 'center' || align === 'middle') left = raw.left + (raw.width - logicalWidth) / 2;

  return new DOMRect(left, raw.top, logicalWidth, logicalHeight);
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
  const content = element.querySelector?.<SVGGraphicsElement>(
    '.smm-richtext-node-wrap,.smm-text-node-wrap',
  ) ?? null;
  // A node with an icon/todo/priority prefix wraps its real text element in a
  // padded SVG group. The HTML editor replaces only the text content, so its
  // anchor must come from that inner layer. Comparing against the outer group
  // leaves a permanent 4px offset and the atomic opening gate never reveals
  // the editor. Keep the outer group as a fallback for renderers that do not
  // expose a dedicated content element.
  const candidates = content && content !== element
    ? [content, element]
    : [element];

  for (const candidate of candidates) {
    const connected = typeof candidate.isConnected === 'boolean' ? candidate.isConnected : null;
    if (connected === false) continue;
    try {
      const rect = candidate.getBoundingClientRect?.();
      if (isUsableTextRect(rect)) {
        return {
          rect: logicalTextRect(node, group, candidate, rect),
          source: 'bounding-client-rect',
          elementConnected: connected,
        };
      }
    } catch {
      // Continue with the transform-matrix fallback.
    }

    const matrixRect = rectFromScreenMatrix(candidate, group);
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
