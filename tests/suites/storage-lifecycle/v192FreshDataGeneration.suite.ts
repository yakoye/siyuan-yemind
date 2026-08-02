import { describe, expect, it, vi } from 'vitest';
import { CheckpointRepository } from '../../../src/model/CheckpointRepository';
import { MapRepository } from '../../../src/model/MapRepository';

describe('v1.9.2 storage migration', () => {
  it('migrates version 1 map documents without discarding user maps', async () => {
    const save = vi.fn();
    const repository = new MapRepository({
      load: async () => ({
        version: 1,
        activeMapId: 'legacy-map',
        maps: [{
          id: 'legacy-map',
          title: '旧导图',
          createdAt: 1,
          updatedAt: 1,
          layout: 'logicalStructure',
          theme: 'yemind-default',
          lineStyle: 'curve',
          projectStyle: {},
          data: { data: { text: '<p>旧节点</p>', richText: true, customTextWidth: 173 }, children: [] },
        }],
      }),
      save,
    });

    await repository.load();

    expect(repository.list()).toHaveLength(1);
    expect(repository.list()[0]).toMatchObject({
      id: 'legacy-map',
      title: '旧导图',
    });
    expect(repository.getActiveMapId()).toBe('legacy-map');
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      version: 2,
      activeMapId: 'legacy-map',
      maps: [expect.objectContaining({ id: 'legacy-map' })],
    }));
  });

  it('migrates version 1 checkpoints without discarding user history', async () => {
    const save = vi.fn();
    const repository = new CheckpointRepository({
      load: async () => ({
        version: 1,
        checkpoints: [{
          id: 'legacy-checkpoint',
          mapId: 'legacy-map',
          name: '旧检查点',
          kind: 'manual',
          createdAt: 1,
          nodeCount: 1,
          snapshot: {
            data: { data: { text: '旧节点' }, children: [] },
            layout: 'logicalStructure',
            theme: 'yemind-default',
            lineStyle: 'curve',
          },
        }],
      }),
      save,
    });

    await repository.load();

    expect(repository.listAll()).toHaveLength(1);
    expect(repository.listAll()[0]).toMatchObject({
      id: 'legacy-checkpoint',
      mapId: 'legacy-map',
      name: '旧检查点',
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      version: 2,
      checkpoints: [expect.objectContaining({ id: 'legacy-checkpoint' })],
    }));
  });
});
