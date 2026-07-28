export type MiniMapViewportSide = 'left' | 'right' | 'top' | 'bottom';

export type MiniMapViewportStyle = Partial<Record<MiniMapViewportSide, string | number>>;

export interface MiniMapProjectionOptions {
  width: number;
  height: number;
  minimumSize?: number;
}

export type NormalizedMiniMapViewportStyle = Record<MiniMapViewportSide, string>;

function finiteInset(value: string | number | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizeAxis(
  startValue: string | number | undefined,
  endValue: string | number | undefined,
  extent: number,
  minimumSize: number,
): [number, number] {
  const safeExtent = Math.max(1, Number.isFinite(extent) ? extent : 1);
  const safeMinimum = Math.min(
    safeExtent,
    Math.max(1, Number.isFinite(minimumSize) ? minimumSize : 1),
  );
  let start = Math.min(safeExtent - safeMinimum, finiteInset(startValue));
  let end = Math.min(safeExtent - safeMinimum, finiteInset(endValue));
  const maximumInsetTotal = safeExtent - safeMinimum;
  const insetTotal = start + end;
  if (insetTotal > maximumInsetTotal && insetTotal > 0) {
    const ratio = maximumInsetTotal / insetTotal;
    start *= ratio;
    end *= ratio;
  }
  return [start, end];
}

function px(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${Object.is(rounded, -0) ? 0 : rounded}px`;
}

/**
 * Converts the engine's minimap viewport insets into a complete, bounded CSS
 * inset. The engine can briefly emit stale, negative or non-finite values
 * while a side panel or a large image node is being measured.
 */
export function normalizeMiniMapViewportStyle(
  style: MiniMapViewportStyle,
  options: MiniMapProjectionOptions,
): NormalizedMiniMapViewportStyle {
  const minimumSize = options.minimumSize ?? 6;
  const [left, right] = normalizeAxis(style.left, style.right, options.width, minimumSize);
  const [top, bottom] = normalizeAxis(style.top, style.bottom, options.height, minimumSize);
  return {
    left: px(left),
    right: px(right),
    top: px(top),
    bottom: px(bottom),
  };
}
