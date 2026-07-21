import type { CheckpointService } from '../checkpoints/CheckpointService';
import type { CheckpointRepository } from '../model/CheckpointRepository';
import type { MapRepository } from '../model/MapRepository';
import type { SettingsStore } from '../settings/SettingsStore';
import type { OpenMapTabRegistry } from './OpenMapTabRegistry';

export interface YeMindPluginHost {
  repository: MapRepository;
  checkpointRepository: CheckpointRepository;
  checkpointService: CheckpointService;
  settingsStore: SettingsStore;
  tabRegistry: OpenMapTabRegistry;
  whenReady(): Promise<void>;
  openMap(mapId: string): Promise<void>;
  createMap(): Promise<void>;
  renameMap(mapId: string): Promise<void>;
  deleteMap(mapId: string): Promise<void>;
  copyMapLink(mapId: string): Promise<void>;
}
