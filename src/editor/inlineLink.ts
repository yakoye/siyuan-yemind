const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'siyuan:']);
const BARE_DOMAIN = /^(?:localhost(?::\d+)?|(?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/:?#].*)?$/i;

export function normalizeInlineLink(value: string, autoHttps = true): string | null {
  const input = value.trim();
  if (!input) return null;
  const candidate = !/^[a-z][a-z0-9+.-]*:/i.test(input) && autoHttps && BARE_DOMAIN.test(input)
    ? `https://${input}`
    : input;
  try {
    const url = new URL(candidate);
    return SUPPORTED_PROTOCOLS.has(url.protocol) ? candidate : null;
  } catch {
    return null;
  }
}

export function isSiyuanInlineLink(value: string): boolean {
  return value.trim().toLowerCase().startsWith('siyuan://');
}
