import { describe, expect, it } from 'vitest';
import { createDefaultMap } from '../../../src/model/defaultMap';
import { MapRepository } from '../../../src/model/MapRepository';

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



  it('keeps maps with an empty title and names them 未命名导图', async () => {
    const storage = memoryStorage({
      version: 1,
      activeMapId: 'untitled',
      maps: [{
        id: 'untitled',
        title: '',
        createdAt: 1,
        updatedAt: 1,
        layout: 'logicalStructure',
        theme: 'default',
        data: { data: { text: '' }, children: [] },
      }],
    });
    const repo = new MapRepository(storage);
    await repo.load();

    expect(repo.list()).toHaveLength(1);
    expect(repo.get('untitled')?.title).toBe('未命名导图');
    expect((storage.read() as any).maps[0].title).toBe('未命名导图');
  });

  it('waits for startup loading before creating a map', async () => {
    let resolveLoad!: (value: unknown) => void;
    const loadPromise = new Promise<unknown>((resolve) => { resolveLoad = resolve; });
    let stored: unknown = null;
    const repo = new MapRepository({
      load: () => loadPromise,
      save: async (value) => { stored = structuredClone(value); },
    }, { now: () => 5000, id: () => 'new-map' });

    const loading = repo.load();
    const creating = repo.create('未命名导图');
    resolveLoad({
      version: 1,
      activeMapId: 'old-map',
      maps: [{
        id: 'old-map',
        title: '旧导图',
        createdAt: 1,
        updatedAt: 1,
        layout: 'logicalStructure',
        theme: 'default',
        data: { data: { text: '旧导图' }, children: [] },
      }],
    });
    await Promise.all([loading, creating]);

    expect(repo.list().map((map) => map.id)).toEqual(['old-map', 'new-map']);
    expect((stored as any).maps.map((map: any) => map.id)).toEqual(['old-map', 'new-map']);
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

it('serializes writes so an older save cannot overwrite a newer snapshot', async () => {
  const pending: Array<{ value: any; resolve: () => void }> = [];
  const repo = new MapRepository({
    load: async () => null,
    save: (value) => new Promise<void>((resolve) => {
      pending.push({ value: structuredClone(value), resolve });
    }),
  }, { now: () => 6000, id: () => 'queued-map' });
  await repo.load();

  const creating = repo.create('旧标题');
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(pending).toHaveLength(1);

  const renaming = repo.rename('queued-map', '新标题');
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(pending).toHaveLength(1);

  pending[0].resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(pending).toHaveLength(2);
  expect(pending[1].value.maps[0].title).toBe('新标题');

  pending[1].resolve();
  await Promise.all([creating, renaming]);
  expect(repo.get('queued-map')?.title).toBe('新标题');
});

describe('MapRepository transactional persistence', () => {
  it('keeps the previous map when delete persistence fails', async () => {
    let fail = false;
    let value: any = null;
    const repo = new MapRepository({
      load: async () => value,
      save: async (next) => {
        if (fail) throw new Error('disk full');
        value = structuredClone(next);
      },
    }, { id: () => 'stable-map', now: () => 7000 });
    await repo.load();
    await repo.create('稳定导图');
    fail = true;

    await expect(repo.remove('stable-map')).rejects.toThrow('disk full');
    expect(repo.get('stable-map')?.title).toBe('稳定导图');
    expect(repo.getActiveMapId()).toBe('stable-map');
  });

  it('keeps the previous title and data when update persistence fails', async () => {
    let fail = false;
    let value: any = null;
    const repo = new MapRepository({
      load: async () => value,
      save: async (next) => {
        if (fail) throw new Error('write failed');
        value = structuredClone(next);
      },
    }, { id: () => 'stable-map', now: () => 7100 });
    await repo.load();
    await repo.create('旧标题');
    const before = repo.get('stable-map')!;
    fail = true;

    await expect(repo.rename('stable-map', '新标题')).rejects.toThrow('write failed');
    await expect(repo.update('stable-map', {
      data: { data: { text: '变更' }, children: [] },
    })).rejects.toThrow('write failed');

    expect(repo.get('stable-map')).toEqual(before);
  });

  it('creates a new map with its default layout in one persisted transaction', async () => {
    const saves: any[] = [];
    const repo = new MapRepository({
      load: async () => null,
      save: async (next) => { saves.push(structuredClone(next)); },
    }, { id: () => 'layout-map', now: () => 7200 });
    await repo.load();

    const map = await repo.create('双向图', 'mindMap');

    expect(map.layout).toBe('mindMap');
    expect(repo.get('layout-map')?.layout).toBe('mindMap');
    expect(saves).toHaveLength(1);
    expect(saves[0].maps[0].layout).toBe('mindMap');
  });
});
