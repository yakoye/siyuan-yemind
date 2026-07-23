export interface ClipartIntrinsicSize {
  width: number;
  height: number;
}

export interface ClipartDisplaySize extends ClipartIntrinsicSize {
  resolved: boolean;
  source: 'svg' | 'image' | 'fallback';
}

export const DEFAULT_CLIPART_BOX_SIZE = 48;
export const LEGACY_DEFAULT_CLIPART_BOX_SIZE = 72;
export const CLIPART_GEOMETRY_VERSION = 3;

const geometryCache = new Map<string, Promise<ClipartDisplaySize>>();

function positiveNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function svgLength(value: string | null): number | null {
  const text = String(value ?? '').trim();
  if (!text || text.endsWith('%')) return null;
  const match = text.match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+))(?:px|pt|pc|mm|cm|in)?$/i);
  return match ? positiveNumber(match[1]) : null;
}

function svgAttribute(tag: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match ? (match[1] ?? match[2] ?? null) : null;
}

/**
 * Reads the authored SVG viewport ratio. Explicit width/height are preferred
 * because SVG documents without a viewBox otherwise stretch when embedded in
 * a square <image> viewport. The viewBox is used when intrinsic dimensions are
 * omitted or expressed as percentages.
 */
export function parseSvgIntrinsicSize(source: string): ClipartIntrinsicSize | null {
  const svgTag = String(source ?? '').match(/<svg\b[^>]*>/i)?.[0];
  if (!svgTag) return null;

  const width = svgLength(svgAttribute(svgTag, 'width'));
  const height = svgLength(svgAttribute(svgTag, 'height'));
  if (width && height) return { width, height };

  const viewBox = svgAttribute(svgTag, 'viewBox');
  if (!viewBox) return null;
  const values = viewBox.trim().split(/[\s,]+/g).map((part) => Number.parseFloat(part));
  const viewBoxWidth = positiveNumber(values[2]);
  const viewBoxHeight = positiveNumber(values[3]);
  return viewBoxWidth && viewBoxHeight ? { width: viewBoxWidth, height: viewBoxHeight } : null;
}

export function fitClipartSize(
  intrinsic: ClipartIntrinsicSize,
  maxWidth = DEFAULT_CLIPART_BOX_SIZE,
  maxHeight = DEFAULT_CLIPART_BOX_SIZE,
): ClipartIntrinsicSize {
  const width = positiveNumber(intrinsic.width);
  const height = positiveNumber(intrinsic.height);
  const boxWidth = positiveNumber(maxWidth) ?? DEFAULT_CLIPART_BOX_SIZE;
  const boxHeight = positiveNumber(maxHeight) ?? DEFAULT_CLIPART_BOX_SIZE;
  if (!width || !height) return { width: boxWidth, height: boxHeight };

  const scale = Math.min(boxWidth / width, boxHeight / height);
  const round = (value: number): number => Math.max(1, Math.round(value * 100) / 100);
  return {
    width: round(width * scale),
    height: round(height * scale),
  };
}

function imageIntrinsicSize(image?: HTMLImageElement | null): ClipartIntrinsicSize | null {
  const width = positiveNumber(image?.naturalWidth);
  const height = positiveNumber(image?.naturalHeight);
  return width && height ? { width, height } : null;
}

async function resolveIntrinsicSize(url: string, image?: HTMLImageElement | null): Promise<ClipartDisplaySize> {
  try {
    const response = await fetch(url, { cache: 'force-cache' });
    if (response.ok) {
      const parsed = parseSvgIntrinsicSize(await response.text());
      if (parsed) return { ...fitClipartSize(parsed), resolved: true, source: 'svg' };
    }
  } catch {
    // The already-loaded picker image remains a reliable fallback when fetch
    // is blocked by a custom protocol or a transient host restriction.
  }

  const intrinsic = imageIntrinsicSize(image);
  if (intrinsic) return { ...fitClipartSize(intrinsic), resolved: true, source: 'image' };
  return {
    width: DEFAULT_CLIPART_BOX_SIZE,
    height: DEFAULT_CLIPART_BOX_SIZE,
    resolved: false,
    source: 'fallback',
  };
}

export function resolveClipartDisplaySize(
  url: string,
  image?: HTMLImageElement | null,
): Promise<ClipartDisplaySize> {
  const key = String(url ?? '').trim();
  if (!key) return Promise.resolve({
    width: DEFAULT_CLIPART_BOX_SIZE,
    height: DEFAULT_CLIPART_BOX_SIZE,
    resolved: false,
    source: 'fallback',
  });
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const pending = resolveIntrinsicSize(key, image).catch(() => ({
    width: DEFAULT_CLIPART_BOX_SIZE,
    height: DEFAULT_CLIPART_BOX_SIZE,
    resolved: false,
    source: 'fallback' as const,
  }));
  geometryCache.set(key, pending);
  return pending;
}

export function isLegacyDefaultClipartGeometry(data: Record<string, any> | null | undefined): boolean {
  if (!data?.yemindClipartId || Number(data.yemindClipartGeometryVersion ?? 0) >= CLIPART_GEOMETRY_VERSION) return false;
  const width = Number(data.imageSize?.width);
  const height = Number(data.imageSize?.height);
  return Boolean(data.image)
    && data.imageSize?.custom === true
    && Math.abs(width - LEGACY_DEFAULT_CLIPART_BOX_SIZE) < 0.01
    && Math.abs(height - LEGACY_DEFAULT_CLIPART_BOX_SIZE) < 0.01;
}
