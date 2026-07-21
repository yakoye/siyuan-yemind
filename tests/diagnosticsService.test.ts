import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
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

function createService(lifecycleProbe = vi.fn(async () => ({ create: true, update: true, checkpoint: true, restore: true, cleanup: true }))) {
  let mapIndex = 0;
  let checkpointIndex = 0;
  const maps = new MapRepository(storage(), { id: () => `map-${++mapIndex}` });
  const checkpoints = new CheckpointRepository(storage(), { id: () => `cp-${++checkpointIndex}` });
  const settings = new SettingsStore(storage());
  const service = new DiagnosticsService({
    pluginId: 'siyuan-yemind-zen', pluginVersion: '0.5.10', maps, checkpoints, settings,
    storageProbe: { run: async () => ({ write: true, read: true, remove: true }) },
    lifecycleProbe: { run: lifecycleProbe },
  });
  return { service, maps, checkpoints, settings, lifecycleProbe };
}

describe('DiagnosticsService', () => {
  it('runs lifecycle checks without mutating or emitting through the real map repository', async () => {
    const { service, maps, checkpoints, settings, lifecycleProbe } = createService();
    await Promise.all([maps.load(), checkpoints.load(), settings.load()]);
    await maps.create('Real map');
    const beforeIds = maps.list().map((map) => map.id);
    const listener = vi.fn();
    const unsubscribe = maps.subscribe(listener);
    listener.mockClear();

    const report = await service.runSelfCheck();

    expect(report.status).toBe('pass');
    expect(lifecycleProbe).toHaveBeenCalledOnce();
    expect(listener).not.toHaveBeenCalled();
    expect(maps.list().map((map) => map.id)).toEqual(beforeIds);
    expect(checkpoints.listAll()).toHaveLength(0);
    unsubscribe();
  });


  it('coalesces concurrent self-check requests into one isolated lifecycle run', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const lifecycleProbe = vi.fn(async () => {
      await gate;
      return { create: true, update: true, checkpoint: true, restore: true, cleanup: true };
    });
    const { service, maps, checkpoints, settings } = createService(lifecycleProbe);
    await Promise.all([maps.load(), checkpoints.load(), settings.load()]);

    const first = service.runSelfCheck();
    const second = service.runSelfCheck();
    expect(first).toBe(second);
    release();
    await Promise.all([first, second]);
    expect(lifecycleProbe).toHaveBeenCalledOnce();
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
