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
  version: 2;
  checkpoints: MapCheckpoint[];
}

export const CHECKPOINT_STORAGE_VERSION = 2 as const;

export interface CheckpointStorage {
  load(): Promise<unknown>;
  save(value: CheckpointStorageDocument): Promise<void>;
}
