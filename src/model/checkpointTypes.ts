import type { MapCheckpointSnapshot } from './types';

export type CheckpointKind = 'manual' | 'recovery-protection';

export interface MapCheckpoint {
  id: string;
  mapId: string;
  name: string;
  kind: CheckpointKind;
  createdAt: number;
  nodeCount: number;
  snapshot: MapCheckpointSnapshot;
}

export interface CheckpointStorageDocument {
  version: 1;
  checkpoints: MapCheckpoint[];
}

export interface CheckpointStorage {
  load(): Promise<unknown>;
  save(value: CheckpointStorageDocument): Promise<void>;
}
