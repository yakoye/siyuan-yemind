import { describe, expect, it } from 'vitest';
import { CheckpointService } from '../src/checkpoints/CheckpointService';
import { CheckpointRepository } from '../src/model/CheckpointRepository';
import { MapRepository } from '../src/model/MapRepository';

function storage() {
  let value: unknown = null;
  return {
    load: async () => value,
    save: async (next: unknown) => { value = structuredClone(next); },
  };
}

describe('CheckpointService', () => {
  it('creates a manual checkpoint from the latest persisted map', async () => {
    const maps = new MapRepository(storage(), { id: () => 'map-1', now: () => 10 });
    const checkpoints = new CheckpointRepository(storage(), { id: () => 'cp-1', now: () => 20 });
    await Promise.all([maps.load(), checkpoints.load()]);
    await maps.create('Demo');
    const service = new CheckpointService(maps, checkpoints, { now: () => 20 });

    const checkpoint = await service.createManual('map-1', 'Before refactor');

    expect(checkpoint.kind).toBe('manual');
    expect(checkpoint.name).toBe('Before refactor');
    expect(checkpoint.snapshot.data.data.text).toBe('Demo');
  });

  it('creates a protected current snapshot before restoring the selected checkpoint', async () => {
    let checkpointId = 0;
    const maps = new MapRepository(storage(), { id: () => 'map-1', now: () => 10 });
    const checkpoints = new CheckpointRepository(storage(), {
      id: () => `cp-${++checkpointId}`,
      now: () => 20 + checkpointId,
    });
    await Promise.all([maps.load(), checkpoints.load()]);
    await maps.create('Demo');
    const old = await checkpoints.create(maps.get('map-1')!, 'Old');
    await maps.update('map-1', { data: { data: { text: 'Current' }, children: [] } });
    const service = new CheckpointService(maps, checkpoints, { now: () => Date.UTC(2026, 6, 17, 1, 2, 3) });

    const restored = await service.restore('map-1', old.id);

    expect(restored.data.data.text).toBe('Demo');
    const protection = checkpoints.list('map-1').find((item) => item.kind === 'recovery-protection');
    expect(protection?.snapshot.data.data.text).toBe('Current');
    expect(protection?.name).toContain('恢复前保护');
  });

  it('rejects restoring a checkpoint owned by another map', async () => {
    const maps = new MapRepository(storage(), { id: () => 'map-1', now: () => 10 });
    const checkpoints = new CheckpointRepository(storage(), { id: () => 'cp-1', now: () => 20 });
    await Promise.all([maps.load(), checkpoints.load()]);
    await maps.create('Demo');
    const foreignMap = { ...maps.get('map-1')!, id: 'map-2' };
    const checkpoint = await checkpoints.create(foreignMap, 'Foreign');
    const service = new CheckpointService(maps, checkpoints);

    await expect(service.restore('map-1', checkpoint.id)).rejects.toThrow('Checkpoint does not belong to map');
  });
});
