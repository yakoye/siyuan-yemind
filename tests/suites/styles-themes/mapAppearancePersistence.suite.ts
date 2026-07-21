import { describe, expect, it } from 'vitest';
import { CheckpointRepository } from '../../../src/model/CheckpointRepository';
import { MapRepository } from '../../../src/model/MapRepository';

function memoryStorage(initial: unknown = null) {
  let value: unknown = structuredClone(initial);
  return {
    load: async () => structuredClone(value),
    save: async (next: unknown) => { value = structuredClone(next); },
    read: () => structuredClone(value),
  };
}

describe('map appearance persistence', () => {
  it('creates maps with KMind Default and curved lines', async () => {
    const repo = new MapRepository(memoryStorage(), { id: () => 'map-1', now: () => 100 });
    await repo.load();
    const map = await repo.create('Theme map');

    expect(map.theme).toBe('kmind-default');
    expect(map.lineStyle).toBe('curve');
  });

  it('migrates legacy default theme and missing line style without losing maps', async () => {
    const storage = memoryStorage({
      version: 1,
      activeMapId: 'legacy',
      maps: [{
        id: 'legacy',
        title: 'Legacy',
        createdAt: 10,
        updatedAt: 20,
        layout: 'logicalStructure',
        theme: 'default',
        data: { data: { text: 'Legacy' }, children: [] },
      }],
    });
    const repo = new MapRepository(storage, { now: () => 100 });
    await repo.load();

    const map = repo.get('legacy')!;
    expect(map.theme).toBe('kmind-default');
    expect(map.lineStyle).toBe('curve');
    expect((storage.read() as any).maps[0]).toMatchObject({ theme: 'kmind-default', lineStyle: 'curve' });
  });

  it('updates and restores theme and line style through checkpoints', async () => {
    const mapStorage = memoryStorage();
    const checkpointStorage = memoryStorage();
    const maps = new MapRepository(mapStorage, { id: () => 'map-1', now: () => 100 });
    const checkpoints = new CheckpointRepository(checkpointStorage, { id: () => 'cp-1', now: () => 200 });
    await maps.load();
    await checkpoints.load();
    await maps.create('Styled');
    await maps.update('map-1', {
      theme: 'kmind-midnight-neon',
      lineStyle: 'direct',
    });
    const current = maps.get('map-1')!;
    const checkpoint = await checkpoints.create(current, 'Styled state');

    expect(checkpoint.snapshot.theme).toBe('kmind-midnight-neon');
    expect(checkpoint.snapshot.lineStyle).toBe('direct');

    await maps.update('map-1', { theme: 'kmind-default', lineStyle: 'curve' });
    await maps.restoreSnapshot('map-1', checkpoint.snapshot);
    expect(maps.get('map-1')).toMatchObject({
      theme: 'kmind-midnight-neon',
      lineStyle: 'direct',
    });
  });
});
