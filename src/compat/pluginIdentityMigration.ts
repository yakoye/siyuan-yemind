export interface IdentityMigrationStorage {
  loadCurrent(name: string): Promise<unknown>;
  saveCurrent(name: string, value: unknown): Promise<unknown>;
  loadLegacy(name: string): Promise<unknown>;
}

export interface IdentityMigrationReport {
  migrated: string[];
  preserved: string[];
  missing: string[];
}

export function buildPluginStoragePath(pluginId: string, storageName: string): string {
  const safePluginId = pluginId.replaceAll('/', '');
  const safeStorageName = storageName.replace(/^\/+|\/+$/g, '').replaceAll('..', '');
  return `/data/storage/petal/${safePluginId}/${safeStorageName}`;
}

export type StorageFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function loadPluginStorageData(
  fetcher: StorageFetch,
  pluginId: string,
  storageName: string,
): Promise<unknown> {
  try {
    const response = await fetcher('/api/file/getFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: buildPluginStoragePath(pluginId, storageName) }),
    });
    if (!response.ok) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

export function hasStoredData(value: unknown): boolean {
  if (value === null || typeof value === 'undefined' || value === '') return false;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (typeof record.code === 'number' && record.code !== 0 && 'msg' in record) return false;
  }
  return true;
}

export async function migrateLegacyPluginData(
  storage: IdentityMigrationStorage,
  storageNames: readonly string[],
): Promise<IdentityMigrationReport> {
  const report: IdentityMigrationReport = { migrated: [], preserved: [], missing: [] };
  for (const name of storageNames) {
    const current = await storage.loadCurrent(name);
    if (hasStoredData(current)) {
      report.preserved.push(name);
      continue;
    }
    const legacy = await storage.loadLegacy(name);
    if (!hasStoredData(legacy)) {
      report.missing.push(name);
      continue;
    }
    await storage.saveCurrent(name, legacy);
    report.migrated.push(name);
  }
  return report;
}
