import { CheckpointService } from '../checkpoints/CheckpointService';
import { CheckpointRepository } from '../model/CheckpointRepository';
import { MapRepository } from '../model/MapRepository';
import type { CheckpointStorage } from '../model/checkpointTypes';
import type { MindMapTree, RepositoryStorage } from '../model/types';

export interface IsolatedLifecycleProbeStorage {
  maps: RepositoryStorage;
  checkpoints: CheckpointStorage;
  cleanup(): Promise<void>;
}

export interface LifecycleProbeResult {
  create: boolean;
  update: boolean;
  checkpoint: boolean;
  restore: boolean;
  cleanup: boolean;
}

export async function runIsolatedLifecycleProbe(
  storage: IsolatedLifecycleProbeStorage,
  layout = 'logicalStructure',
): Promise<LifecycleProbeResult> {
  const result: LifecycleProbeResult = {
    create: false,
    update: false,
    checkpoint: false,
    restore: false,
    cleanup: false,
  };
  const maps = new MapRepository(storage.maps);
  const checkpoints = new CheckpointRepository(storage.checkpoints);
  const service = new CheckpointService(maps, checkpoints);

  try {
    await Promise.all([maps.load(), checkpoints.load()]);
    const map = await maps.create('__YeMind isolated diagnostic map__', layout);
    result.create = Boolean(maps.get(map.id));

    const data: MindMapTree = {
      ...map.data,
      children: [{ data: { text: 'diagnostic-child' }, children: [] }],
    };
    await maps.update(map.id, { data });
    result.update = maps.get(map.id)?.data.children.length === 1;

    const checkpoint = await service.createManual(map.id, 'diagnostic checkpoint');
    result.checkpoint = Boolean(checkpoints.get(checkpoint.id));

    await maps.update(map.id, {
      data: {
        ...data,
        children: [...data.children, { data: { text: 'temporary-change' }, children: [] }],
      },
    });
    const restored = await service.restore(map.id, checkpoint.id);
    result.restore = restored.data.children.length === 1;
  } finally {
    await storage.cleanup();
    result.cleanup = true;
  }

  return result;
}
