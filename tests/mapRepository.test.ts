import { describe, expect, it } from 'vitest';
import { createDefaultMap } from '../src/model/defaultMap';
import { MapRepository } from '../src/model/MapRepository';

function memoryStorage(initial: unknown = null) {
  let value = initial;
  return {
    load: async () => value,
    save: async (next: unknown) => { value = structuredClone(next); },
    read: () => value,
  };
}

describe('createDefaultMap', () => {
  it('creates a valid simple-mind-map tree', () => {
    const map = createDefaultMap('测试导图', 'map-1', 1000);
    expect(map.id).toBe('map-1');
    expect(map.title).toBe('测试导图');
    expect(map.data.data.text).toBe('测试导图');
    expect(map.data.children).toHaveLength(2);
    expect(map.createdAt).toBe(1000);
    expect(map.updatedAt).toBe(1000);
  });
});

describe('MapRepository', () => {
  it('normalizes missing storage without forcing a map', async () => {
    const storage = memoryStorage();
    const repo = new MapRepository(storage);
    await repo.load();
    expect(repo.list()).toEqual([]);
    expect(repo.getActiveMapId()).toBeNull();
  });

  it('creates, renames and persists maps', async () => {
    const storage = memoryStorage();
    const repo = new MapRepository(storage, { now: () => 2000, id: () => 'map-2' });
    await repo.load();

    const created = await repo.create('  新导图  ');
    expect(created.title).toBe('新导图');
    expect(repo.getActiveMapId()).toBe('map-2');

    await repo.rename('map-2', '新名称');
    expect(repo.get('map-2')?.title).toBe('新名称');
    expect(storage.read()).toMatchObject({ version: 1, activeMapId: 'map-2' });
  });

  it('allows deleting the final map and leaves the repository empty', async () => {
    const storage = memoryStorage();
    const repo = new MapRepository(storage, { now: () => 3000, id: () => 'only' });
    await repo.load();
    await repo.create('唯一导图');
    await repo.remove('only');

    expect(repo.list()).toEqual([]);
    expect(repo.getActiveMapId()).toBeNull();
  });


  it('migrates legacy notes into comments and removes the separate note field', async () => {
    const storage = memoryStorage({
      version: 1,
      activeMapId: 'legacy',
      maps: [{
        id: 'legacy',
        title: 'Legacy',
        createdAt: 1,
        updatedAt: 1,
        layout: 'logicalStructure',
        theme: 'default',
        data: {
          data: { text: 'Root', note: '旧备注' },
          children: [],
        },
      }],
    });
    const repo = new MapRepository(storage);
    await repo.load();

    const data = repo.get('legacy')?.data.data;
    expect(data?.note).toBeUndefined();
    expect(data?.yemindComments).toEqual([expect.objectContaining({ text: '旧备注' })]);
  });

  it('returns snapshots that cannot mutate repository state', async () => {
    const storage = memoryStorage();
    const repo = new MapRepository(storage, { now: () => 4000, id: () => 'safe' });
    await repo.load();
    await repo.create('安全');

    const list = repo.list();
    list[0].title = '被修改';
    expect(repo.get('safe')?.title).toBe('安全');
  });
});
