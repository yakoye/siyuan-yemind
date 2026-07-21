import { describe, expect, it } from 'vitest';
import { CheckpointRepository } from '../../../src/model/CheckpointRepository';
import type { YeMindMapDocument } from '../../../src/model/types';

function map(id = 'map-1', text = 'Root'): YeMindMapDocument {
  return {
    id,
    title: 'Demo',
    createdAt: 1,
    updatedAt: 2,
    layout: 'logicalStructure',
    theme: 'default',
    data: { data: { text }, children: [{ data: { text: 'Child' }, children: [] }] },
    viewData: { scaleX: 1, scaleY: 1, translateX: 10, translateY: 20 },
  };
}

function memoryStorage(initial: unknown = null) {
  let value = initial;
  return {
    load: async () => value,
    save: async (next: unknown) => { value = structuredClone(next); },
    read: () => value,
  };
}

describe('CheckpointRepository', () => {
  it('creates immutable snapshots and lists newest first', async () => {
    const storage = memoryStorage();
    let now = 100;
    let id = 0;
    const repo = new CheckpointRepository(storage, {
      now: () => now,
      id: () => `cp-${++id}`,
    });
    await repo.load();

    const source = map();
    const first = await repo.create(source, '第一版');
    source.data.data.text = 'Mutated outside';
    now = 200;
    await repo.create(map('map-1', 'Second'), '第二版');

    const listed = repo.list('map-1');
    expect(listed.map((item) => item.name)).toEqual(['第二版', '第一版']);
    expect(first.nodeCount).toBe(2);
    expect(repo.get(first.id)?.snapshot.data.data.text).toBe('Root');
    listed[0].snapshot.data.data.text = 'Tampered';
    expect(repo.list('map-1')[0].snapshot.data.data.text).toBe('Second');
  });

  it('trims only the oldest manual checkpoints when the per-map limit is exceeded', async () => {
    const storage = memoryStorage();
    let now = 0;
    let id = 0;
    const repo = new CheckpointRepository(storage, {
      now: () => ++now,
      id: () => `cp-${++id}`,
      maxPerMap: 3,
    });
    await repo.load();

    await repo.create(map(), 'manual-1');
    await repo.create(map(), 'protect-1', 'recovery-protection');
    await repo.create(map(), 'manual-2');
    await repo.create(map(), 'manual-3');

    expect(repo.list('map-1').map((item) => item.name)).toEqual([
      'manual-3',
      'manual-2',
      'protect-1',
    ]);
  });

  it('keeps a newly created manual checkpoint when only protected history can be older', async () => {
    const storage = memoryStorage();
    let now = 0;
    let id = 0;
    const repo = new CheckpointRepository(storage, {
      now: () => ++now,
      id: () => `cp-${++id}`,
      maxPerMap: 2,
    });
    await repo.load();

    await repo.create(map(), 'protect-1', 'recovery-protection');
    await repo.create(map(), 'protect-2', 'recovery-protection');
    const manual = await repo.create(map(), 'manual-new');

    expect(repo.get(manual.id)?.name).toBe('manual-new');
    expect(repo.list('map-1').map((item) => item.name)).toContain('manual-new');
  });

  it('never auto-removes recovery protection checkpoints even when they exceed the limit', async () => {
    const storage = memoryStorage();
    let now = 0;
    let id = 0;
    const repo = new CheckpointRepository(storage, {
      now: () => ++now,
      id: () => `cp-${++id}`,
      maxPerMap: 2,
    });
    await repo.load();

    await repo.create(map(), 'protect-1', 'recovery-protection');
    await repo.create(map(), 'protect-2', 'recovery-protection');
    await repo.create(map(), 'protect-3', 'recovery-protection');

    expect(repo.list('map-1')).toHaveLength(3);
    expect(repo.list('map-1').every((item) => item.kind === 'recovery-protection')).toBe(true);
  });

  it('renames, deletes and removes all checkpoints for a map', async () => {
    const storage = memoryStorage();
    let id = 0;
    const repo = new CheckpointRepository(storage, { id: () => `cp-${++id}` });
    await repo.load();
    const one = await repo.create(map('map-1'), 'One');
    await repo.create(map('map-2'), 'Other');

    await repo.rename(one.id, 'Renamed');
    expect(repo.get(one.id)?.name).toBe('Renamed');
    await repo.remove(one.id);
    expect(repo.get(one.id)).toBeUndefined();
    await repo.removeForMap('map-2');
    expect(repo.list('map-2')).toEqual([]);
  });

  it('keeps previous in-memory state when persistence fails', async () => {
    let fail = false;
    let stored: unknown = null;
    const repo = new CheckpointRepository({
      load: async () => stored,
      save: async (value) => {
        if (fail) throw new Error('disk full');
        stored = structuredClone(value);
      },
    }, { id: () => 'cp-1', now: () => 100 });
    await repo.load();
    await repo.create(map(), 'Stable');
    fail = true;

    await expect(repo.rename('cp-1', 'Broken')).rejects.toThrow('disk full');
    expect(repo.get('cp-1')?.name).toBe('Stable');
  });
});
