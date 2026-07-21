export const NODE_STYLE_KEYS = [
  'shape',
  'fillColor',
  'borderColor',
  'borderWidth',
  'borderDasharray',
  'width',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'textDecoration',
  'textAlign',
  'color',
] as const;

export type NodeStyleKey = typeof NODE_STYLE_KEYS[number];
export type NodeStylePatch = Partial<Record<NodeStyleKey, string | number | null>>;

const SHAPES = new Set(['rectangle', 'rect', 'rounded', 'roundedRectangle', 'diamond', 'ellipse', 'circle', 'pill']);
const TEXT_ALIGN = new Set(['left', 'center', 'right']);
const FONT_STYLE = new Set(['normal', 'italic']);
const TEXT_DECORATION = new Set(['none', 'underline', 'line-through']);
const DASH = new Set(['none', '5,5', '2,3']);

function color(value: unknown): string | null {
  if (value === null) return null;
  const text = String(value ?? '').trim();
  if (/^#[0-9a-f]{3}$/i.test(text)) return text.toLowerCase();
  return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : undefined as never;
}

function finite(value: unknown, min: number, max: number): number | null | undefined {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : undefined;
}

export function normalizeNodeStylePatch(input: Record<string, unknown>): NodeStylePatch {
  const output: NodeStylePatch = {};
  for (const key of NODE_STYLE_KEYS) {
    if (!(key in input)) continue;
    const value = input[key];
    if (value === null) {
      output[key] = null;
      continue;
    }
    if (key === 'shape' && SHAPES.has(String(value))) output.shape = String(value);
    else if (key === 'fillColor' || key === 'borderColor' || key === 'color') {
      const normalized = color(value);
      if (normalized !== undefined) output[key] = normalized;
    } else if (key === 'borderWidth') {
      const normalized = finite(value, 0, 12);
      if (normalized !== undefined) output.borderWidth = normalized;
    } else if (key === 'width') {
      const normalized = finite(value, 40, 1000);
      if (normalized !== undefined) output.width = normalized;
    } else if (key === 'fontSize') {
      const normalized = finite(value, 8, 96);
      if (normalized !== undefined) output.fontSize = normalized;
    } else if (key === 'borderDasharray' && DASH.has(String(value))) output.borderDasharray = String(value);
    else if (key === 'textAlign' && TEXT_ALIGN.has(String(value))) output.textAlign = String(value);
    else if (key === 'fontStyle' && FONT_STYLE.has(String(value))) output.fontStyle = String(value);
    else if (key === 'textDecoration' && TEXT_DECORATION.has(String(value))) output.textDecoration = String(value);
    else if (key === 'fontWeight') output.fontWeight = String(value);
    else if (key === 'fontFamily') {
      const text = String(value).trim();
      if (text) output.fontFamily = text;
    }
  }
  return output;
}

export function nodeStyleSnapshot(data: Record<string, unknown> | null | undefined): NodeStylePatch {
  if (!data) return {};
  const raw: Record<string, unknown> = {};
  NODE_STYLE_KEYS.forEach((key) => {
    if (key in data) raw[key] = data[key];
  });
  return normalizeNodeStylePatch(raw);
}

export function resetNodeStylePatch(): NodeStylePatch {
  return Object.fromEntries(NODE_STYLE_KEYS.map((key) => [key, null])) as NodeStylePatch;
}
