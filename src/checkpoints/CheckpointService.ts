import type { MapCheckpoint } from '../model/checkpointTypes';
import { CheckpointRepository } from '../model/CheckpointRepository';
import { MapRepository } from '../model/MapRepository';
import type { YeMindMapDocument } from '../model/types';

interface CheckpointServiceOptions {
  now?: () => number;
}

export class CheckpointService {
  private readonly now: () => number;

  constructor(
    private readonly maps: MapRepository,
    private readonly checkpoints: CheckpointRepository,
    options: CheckpointServiceOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now());
  }

  async createManual(mapId: string, name: string): Promise<MapCheckpoint> {
    const map = this.maps.get(mapId);
    if (!map) throw new Error('Map not found');
    return this.checkpoints.create(map, name, 'manual');
  }

  async restore(mapId: string, checkpointId: string): Promise<YeMindMapDocument> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) throw new Error('Checkpoint not found');
    if (checkpoint.mapId !== mapId) throw new Error('Checkpoint does not belong to map');
    const current = this.maps.get(mapId);
    if (!current) throw new Error('Map not found');

    await this.checkpoints.create(current, this.createProtectionName(), 'recovery-protection');
    await this.maps.restoreSnapshot(mapId, checkpoint.snapshot);
    const restored = this.maps.get(mapId);
    if (!restored) throw new Error('Map missing after restore');
    return restored;
  }

  private createProtectionName(): string {
    const date = new Date(this.now());
    const pad = (value: number) => String(value).padStart(2, '0');
    return `恢复前保护 ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
