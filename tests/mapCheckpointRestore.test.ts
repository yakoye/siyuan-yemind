import { describe, expect, it } from 'vitest';
import { MapRepository } from '../src/model/MapRepository';
import type { MapCheckpointSnapshot } from '../src/model/types';

function memoryStorage() {
  let value: unknown = null;
  return {
    load: async () => value,
    save: async (next: unknown) => { value = structuredClone(next); },
  };
}

describe('MapRepository checkpoint restore', () => {
  it('replaces map content configuration while preserving identity and title', async () => {
    const repo = new MapRepository(memoryStorage(), { id: () => 'map-1', now: () => 100 });
    await repo.load();
    const created = await repo.create('Current');
    const snapshot: MapCheckpointSnapshot = {
      data: { data: { text: 'Historic root' }, children: [] },
      layout: 'mindMap',
      theme: 'kmind-midnight-neon',
      lineStyle: 'straight',
      viewData: { scaleX: 0.8, scaleY: 0.8, translateX: 12, translateY: 24 },
    };

    await repo.restoreSnapshot(created.id, snapshot);

    const restored = repo.get(created.id)!;
    expect(restored.id).toBe('map-1');
    expect(restored.title).toBe('Current');
    expect(restored.createdAt).toBe(100);
    expect(restored.data.data.text).toBe('Historic root');
    expect(restored.layout).toBe('mindMap');
    expect(restored.theme).toBe('kmind-midnight-neon');
    expect(restored.lineStyle).toBe('straight');
    expect(restored.viewData).toEqual(snapshot.viewData);
  });

  it('does not change repository state when restore persistence fails', async () => {
    let fail = false;
    let value: unknown = null;
    const repo = new MapRepository({
      load: async () => value,
      save: async (next) => {
        if (fail) throw new Error('write failed');
        value = structuredClone(next);
      },
    }, { id: () => 'map-1', now: () => 100 });
    await repo.load();
    await repo.create('Current');
    const before = repo.get('map-1');
    fail = true;

    await expect(repo.restoreSnapshot('map-1', {
      data: { data: { text: 'Historic' }, children: [] },
      layout: 'mindMap',
      theme: 'kmind-midnight-neon',
      lineStyle: 'straight',
    })).rejects.toThrow('write failed');

    expect(repo.get('map-1')).toEqual(before);
  });
});
