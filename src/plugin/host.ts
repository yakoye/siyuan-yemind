import type { CheckpointService } from '../checkpoints/CheckpointService';
import type { DiagnosticsService } from '../diagnostics/DiagnosticsService';
import type { CheckpointRepository } from '../model/CheckpointRepository';
import type { MapRepository } from '../model/MapRepository';
import type { SettingsStore } from '../settings/SettingsStore';
import type { OpenMapTabRegistry } from './OpenMapTabRegistry';

export interface YeMindPluginHost {
  repository: MapRepository;
  checkpointRepository: CheckpointRepository;
  checkpointService: CheckpointService;
  diagnostics: DiagnosticsService;
  settingsStore: SettingsStore;
  tabRegistry: OpenMapTabRegistry;
  whenReady(): Promise<void>;
  openMap(mapId: string): Promise<void>;
  openMapAtNode(mapId: string, nodeUid: string): Promise<void>;
  consumePendingNodeTarget(mapId: string): string | undefined;
  createMap(): Promise<void>;
  renameMap(mapId: string): Promise<void>;
  deleteMap(mapId: string): Promise<void>;
  copyMapLink(mapId: string): Promise<void>;
}
