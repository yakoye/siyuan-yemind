export function parseYeMindMapUrl(value: string, pluginName: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'siyuan:' || url.hostname !== 'plugins') return null;
    const targetPlugin = url.pathname.replace(/^\/+|\/+$/g, '');
    if (targetPlugin !== pluginName) return null;
    const mapId = url.searchParams.get('map')?.trim();
    return mapId || null;
  } catch {
    return null;
  }
}
