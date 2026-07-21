import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { CheckpointService } from '../src/checkpoints/CheckpointService';
import { DiagnosticsService } from '../src/diagnostics/DiagnosticsService';
import { CheckpointRepository } from '../src/model/CheckpointRepository';
import { MapRepository } from '../src/model/MapRepository';
import { SettingsStore } from '../src/settings/SettingsStore';

function storage() {
  let value: unknown = null;
  return {
    load: async () => structuredClone(value),
    save: async (next: unknown) => { value = structuredClone(next); },
  };
}

function createService() {
  let mapIndex = 0;
  let checkpointIndex = 0;
  const maps = new MapRepository(storage(), { id: () => `map-${++mapIndex}` });
  const checkpoints = new CheckpointRepository(storage(), { id: () => `cp-${++checkpointIndex}` });
  const settings = new SettingsStore(storage());
  const checkpointService = new CheckpointService(maps, checkpoints);
  const service = new DiagnosticsService({
    pluginId: 'siyuan-yemind-zen', pluginVersion: '0.5.9', maps, checkpoints, checkpointService, settings,
    storageProbe: { run: async () => ({ write: true, read: true, remove: true }) },
  });
  return { service, maps, checkpoints, settings };
}

describe('DiagnosticsService', () => {
  it('runs a temporary lifecycle probe without leaving maps or checkpoints', async () => {
    const { service, maps, checkpoints, settings } = createService();
    await Promise.all([maps.load(), checkpoints.load(), settings.load()]);
    await maps.create('Real map');
    const beforeIds = maps.list().map((map) => map.id);

    const report = await service.runSelfCheck();

    expect(report.status).toBe('pass');
    expect(maps.list().map((map) => map.id)).toEqual(beforeIds);
    expect(checkpoints.listAll()).toHaveLength(0);
  });

  it('exports a privacy-safe zip and only includes content when requested', async () => {
    const { service, maps, checkpoints, settings } = createService();
    await Promise.all([maps.load(), checkpoints.load(), settings.load()]);
    await maps.create('Secret title');
    service.start();
    await service.runSelfCheck();

    const safeArchive = await service.buildArchive(false);
    const safeZip = await JSZip.loadAsync(safeArchive.bytes);
    expect(Object.keys(safeZip.files)).toContain('diagnostics.json');
    expect(Object.keys(safeZip.files)).not.toContain('maps-with-content.json');
    const reportText = await safeZip.file('diagnostics.json')!.async('string');
    expect(reportText).not.toContain('Secret title');

    const fullArchive = await service.buildArchive(true);
    const fullZip = await JSZip.loadAsync(fullArchive.bytes);
    const mapText = await fullZip.file('maps-with-content.json')!.async('string');
    expect(mapText).toContain('Secret title');
  });
});
