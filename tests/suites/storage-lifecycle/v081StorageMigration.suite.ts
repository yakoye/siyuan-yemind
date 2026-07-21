import { describe, expect, it, vi } from 'vitest';
import { buildPluginStoragePath, hasStoredData, migrateLegacyPluginData } from '../../../src/compat/pluginIdentityMigration';

describe('v0.8.1 plugin identity storage migration', () => {
  it('uses the official petal storage path for the old identity', () => {
    expect(buildPluginStoragePath('siyuan-yemind-zen', 'maps.json')).toBe('/data/storage/petal/siyuan-yemind-zen/maps.json');
  });

  it('copies missing current data from the historical identity without deleting the source', async () => {
    const current = new Map<string, unknown>();
    const legacy = new Map<string, unknown>([
      ['maps.json', { version: 1, maps: [{ id: 'map-1' }] }],
      ['settings.json', { defaultLayout: 'logicalStructure' }],
      ['checkpoints.json', { version: 1, checkpoints: [] }],
    ]);
    const saveCurrent = vi.fn(async (name: string, value: unknown) => { current.set(name, structuredClone(value)); });
    const report = await migrateLegacyPluginData({
      loadCurrent: async (name) => current.get(name) ?? '',
      saveCurrent,
      loadLegacy: async (name) => legacy.get(name) ?? null,
    }, ['maps.json', 'settings.json', 'checkpoints.json']);

    expect(report.migrated).toEqual(['maps.json', 'settings.json', 'checkpoints.json']);
    expect(saveCurrent).toHaveBeenCalledTimes(3);
    expect(current.get('maps.json')).toEqual(legacy.get('maps.json'));
    expect(legacy.get('maps.json')).toEqual({ version: 1, maps: [{ id: 'map-1' }] });
  });

  it('never overwrites data already present under siyuan-yemind', async () => {
    const saveCurrent = vi.fn();
    const report = await migrateLegacyPluginData({
      loadCurrent: async () => ({ version: 1, maps: [{ id: 'new-map' }] }),
      saveCurrent,
      loadLegacy: async () => ({ version: 1, maps: [{ id: 'old-map' }] }),
    }, ['maps.json']);
    expect(report.preserved).toEqual(['maps.json']);
    expect(saveCurrent).not.toHaveBeenCalled();
  });

  it('treats missing and failed file responses as absent data', () => {
    expect(hasStoredData('')).toBe(false);
    expect(hasStoredData(null)).toBe(false);
    expect(hasStoredData({ code: 404, msg: 'not found', data: null })).toBe(false);
    expect(hasStoredData({ version: 1, maps: [] })).toBe(true);
  });
});
