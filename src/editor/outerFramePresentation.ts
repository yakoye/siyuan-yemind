export interface OuterFramePresentationInput {
  activeStyle: Record<string, unknown> | null;
  readonly: boolean;
}

export interface OuterFramePresentation {
  hidden: boolean;
  readonly: boolean;
  hint: string;
  strokeColor: string;
  fill: string;
  strokeDasharray: 'none' | '5,5';
  textAlign: 'left' | 'center' | 'right';
}

const DEFAULT_STROKE = '#0984e3';
const DEFAULT_FILL = '#0984e3';

function colorToHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const color = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(color);
  if (short) return `#${short[1].split('').map((item) => item + item).join('').toLowerCase()}`;
  const full = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(color);
  if (full) return `#${full[1].toLowerCase()}`;
  const rgb = /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i.exec(color);
  if (!rgb) return fallback;
  const parts = rgb.slice(1, 4).map((part) => Math.min(255, Math.max(0, Math.round(Number(part)))));
  return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRgba(value: string, alpha = 0.08): string {
  const hex = colorToHex(value, DEFAULT_FILL).slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function createOuterFramePresentation(input: OuterFramePresentationInput): OuterFramePresentation {
  const style = input.activeStyle;
  if (!style) {
    return {
      hidden: true,
      readonly: input.readonly,
      hint: '',
      strokeColor: DEFAULT_STROKE,
      fill: DEFAULT_FILL,
      strokeDasharray: '5,5',
      textAlign: 'left',
    };
  }
  const text = typeof style.text === 'string' ? style.text.trim() : '';
  const dasharray = style.strokeDasharray === 'none' ? 'none' : '5,5';
  const align = style.textAlign === 'center' || style.textAlign === 'right' ? style.textAlign : 'left';
  return {
    hidden: false,
    readonly: input.readonly,
    hint: text ? `外框已选中 · ${text}` : '外框已选中',
    strokeColor: colorToHex(style.strokeColor, DEFAULT_STROKE),
    fill: colorToHex(style.fill, DEFAULT_FILL),
    strokeDasharray: dasharray,
    textAlign: align,
  };
}
