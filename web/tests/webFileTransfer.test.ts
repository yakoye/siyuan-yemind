import { describe, expect, it } from 'vitest';
import { createDefaultMap } from '../../src/model/defaultMap';
import { DEFAULT_SETTINGS } from '../../src/settings/SettingsStore';
import {
  createBackup,
  exportMapFile,
  importMapFile,
  restoreBackup,
  validateBackup,
} from '../src/webFileTransfer';
import { createMemoryWebStore } from '../src/webStorage';

describe('web file transfer', () => {
  const map = createDefaultMap('测试导图', 'source-map', 100);
  const maps = { version: 1 as const, activeMapId: map.id, maps: [map] };
  const checkpoints = { version: 1 as const, checkpoints: [] };

  it('rejects an unknown backup format without writing', async () => {
    const store = createMemoryWebStore();
    await expect(restoreBackup(store, { product: 'YeMind', format: 'other' }))
      .rejects.toThrow(/format/i);
    expect(await store.get('maps')).toBeUndefined();
  });

  it('creates, validates and restores a complete backup transaction', async () => {
    const store = createMemoryWebStore();
    const backup = createBackup(maps, DEFAULT_SETTINGS, checkpoints, () => '2026-07-27T00:00:00.000Z');
    expect(validateBackup(backup)).toEqual(backup);
    await restoreBackup(store, backup);
    expect(await store.get('maps')).toEqual(maps);
    expect(await store.get('settings')).toEqual(DEFAULT_SETTINGS);
    expect(await store.get('checkpoints')).toEqual(checkpoints);
  });

  it('imports a map with a fresh id', () => {
    const mapFile = exportMapFile(map, () => '2026-07-27T00:00:00.000Z');
    const imported = importMapFile(mapFile, () => 'new-map', () => 200);
    expect(imported.id).toBe('new-map');
    expect(imported.title).toBe(map.title);
    expect(imported.createdAt).toBe(200);
    expect(imported.data).toEqual(map.data);
  });
});
