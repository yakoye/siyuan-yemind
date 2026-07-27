import { describe, expect, it } from 'vitest';
import { createDefaultMap } from '../../../src/model/defaultMap';
import { MapRepository } from '../../../src/model/MapRepository';
import { createYeMindPackage, readYeMindPackage } from '../../../src/transfer/packageCodec';

function createMemoryRepository() {
  let persisted: unknown = null;
  const repository = new MapRepository({
    load: async () => persisted,
    save: async (value) => {
      persisted = structuredClone(value);
    },
  }, {
    id: () => 'acceptance-map',
    now: () => 1_000,
  });
  return { repository, readPersisted: () => structuredClone(persisted) };
}

function acceptanceTree() {
  return {
    data: {
      uid: 'root',
      text: '中心主题',
      expand: true,
      icon: ['priority_1'],
      image: 'data:image/png;base64,AA==',
      yemindComments: [{ id: 'comment-1', text: '批注', createdAt: 1_000 }],
    },
    children: [{
      data: {
        uid: 'branch',
        text: '分支',
        expand: false,
        hyperlink: 'https://example.com',
      },
      children: [{ data: { uid: 'leaf', text: '叶子' }, children: [] }],
    }],
  };
}

describe('v1.3.0 core acceptance matrix', () => {
  it('keeps map and outline content on one persisted node tree', async () => {
    const { repository, readPersisted } = createMemoryRepository();
    await repository.load();
    await repository.create('统一数据');
    await repository.update('acceptance-map', { data: acceptanceTree() });

    const snapshot = repository.get('acceptance-map')!;
    expect(snapshot.data.children[0].data.text).toBe('分支');
    expect(snapshot.data.children[0].children[0].data.uid).toBe('leaf');
    expect(readPersisted()).toMatchObject({
      maps: [{ data: { children: [{ data: { uid: 'branch' } }] } }],
    });
  });

  it.each([
    'logicalStructure',
    'logicalStructureLeft',
    'mindMap',
    'organizationStructure',
    'catalogOrganization',
  ])('preserves node data while switching to %s', async (layout) => {
    const { repository } = createMemoryRepository();
    await repository.load();
    await repository.create('布局转换');
    await repository.update('acceptance-map', { data: acceptanceTree(), layout });

    expect(repository.get('acceptance-map')).toMatchObject({
      layout,
      data: acceptanceTree(),
    });
  });

  it('keeps the prior snapshot when a structural write fails', async () => {
    let shouldFail = false;
    const repository = new MapRepository({
      load: async () => null,
      save: async () => {
        if (shouldFail) throw new Error('storage unavailable');
      },
    }, { id: () => 'transaction-map', now: () => 2_000 });
    await repository.load();
    await repository.create('事务');
    const before = repository.get('transaction-map');
    shouldFail = true;

    await expect(repository.update('transaction-map', {
      data: { data: { uid: 'root', text: '损坏写入' }, children: [] },
    })).rejects.toThrow('storage unavailable');
    expect(repository.get('transaction-map')).toEqual(before);
  });

  it('round-trips markers images comments links and collapse state in a YeMind package', async () => {
    const map = createDefaultMap('附件往返', 'package-map', 3_000);
    map.data = acceptanceTree();

    const bytes = await createYeMindPackage(map, {
      appVersion: '1.3.0',
      now: () => '2026-07-27T00:00:00.000Z',
    });

    await expect(readYeMindPackage(bytes)).resolves.toEqual(map);
  });

  it('does not add review-card state to the v1.3.0 map contract', () => {
    const map = createDefaultMap('范围控制', 'scope-map', 4_000);
    expect(map).not.toHaveProperty('review');
    expect(map).not.toHaveProperty('cards');
    expect(map.data.data).not.toHaveProperty('reviewSchedule');
  });
});
