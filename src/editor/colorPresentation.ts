export interface ColorPresentation {
  hex: string;
  rgb: string;
}

export interface EditableColorValue {
  hex: string;
  rgb: string;
}

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(input);
  if (short) {
    const [r, g, b] = short[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const long = /^#([0-9a-f]{6})$/i.exec(input);
  return long ? `#${long[1].toUpperCase()}` : null;
}

function rgbFromCss(value: string): [number, number, number] | null {
  const match = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,[^)]*)?\s*\)$/i.exec(value.trim());
  if (!match) return null;
  const channels = match.slice(1, 4).map(Number);
  if (channels.some((channel) => channel < 0 || channel > 255)) return null;
  return channels as [number, number, number];
}

function rgbFromEditable(value: string): [number, number, number] | null {
  const css = rgbFromCss(value);
  if (css) return css;
  const match = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/.exec(value);
  if (!match) return null;
  const channels = match.slice(1, 4).map(Number);
  if (channels.some((channel) => channel < 0 || channel > 255)) return null;
  return channels as [number, number, number];
}

function toHex(channels: [number, number, number]): string {
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function channelsFromHex(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

export function parseEditableColor(value: unknown): EditableColorValue | null {
  if (typeof value !== 'string') return null;
  const hex = normalizeHexColor(value);
  const channels = hex ? channelsFromHex(hex) : rgbFromEditable(value);
  if (!channels) return null;
  return { hex: hex ?? toHex(channels), rgb: channels.join(', ') };
}

export function presentColor(value: unknown): ColorPresentation {
  const editable = parseEditableColor(value);
  if (!editable) return { hex: '默认', rgb: '继承节点颜色' };
  return { hex: editable.hex, rgb: `RGB(${editable.rgb})` };
}
