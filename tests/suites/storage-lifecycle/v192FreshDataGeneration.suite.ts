import { describe, expect, it, vi } from 'vitest';
import { CheckpointRepository } from '../../../src/model/CheckpointRepository';
import { MapRepository } from '../../../src/model/MapRepository';

describe('v1.9.2 fresh data generation', () => {
  it('does not load pre-release map documents into the stable data generation', async () => {
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

    expect(repository.list()).toEqual([]);
    expect(repository.getActiveMapId()).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it('does not attach pre-release checkpoints to the fresh map generation', async () => {
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

    expect(repository.listAll()).toEqual([]);
    expect(save).not.toHaveBeenCalled();
  });
});
