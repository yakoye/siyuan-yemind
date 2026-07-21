export function parseYeMindMapUrl(
  value: string,
  pluginName: string,
  compatiblePluginNames: readonly string[] = [],
): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'siyuan:' || url.hostname !== 'plugins') return null;
    const targetPlugin = url.pathname.replace(/^\/+|\/+$/g, '');
    if (![pluginName, ...compatiblePluginNames].includes(targetPlugin)) return null;
    const mapId = url.searchParams.get('map')?.trim();
    return mapId || null;
  } catch {
    return null;
  }
}

export function createYeMindMapUrl(mapId: string, pluginName: string): string {
  return `siyuan://plugins/${pluginName}?map=${encodeURIComponent(mapId)}`;
}
