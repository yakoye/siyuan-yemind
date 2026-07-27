import { CheckpointService } from '../../src/checkpoints/CheckpointService';
import { DiagnosticsService } from '../../src/diagnostics/DiagnosticsService';
import { CheckpointRepository } from '../../src/model/CheckpointRepository';
import { MapRepository } from '../../src/model/MapRepository';
import type { CheckpointStorageDocument } from '../../src/model/checkpointTypes';
import type { MapStorageDocument } from '../../src/model/types';
import { PLUGIN_ID, PLUGIN_VERSION } from '../../src/plugin/constants';
import { SettingsStore, type YeMindSettings } from '../../src/settings/SettingsStore';
import { jsonStorage, type WebKeyValueStore } from './webStorage';

export interface WebServices {
  store: WebKeyValueStore;
  repository: MapRepository;
  settingsStore: SettingsStore;
  checkpointRepository: CheckpointRepository;
  checkpointService: CheckpointService;
  diagnostics: DiagnosticsService;
  load(): Promise<void>;
}

export function createWebServices(store: WebKeyValueStore): WebServices {
  const repository = new MapRepository(
    jsonStorage<MapStorageDocument>(store, 'maps'),
  );
  const settingsStore = new SettingsStore(
    jsonStorage<YeMindSettings>(store, 'settings'),
  );
  const checkpointRepository = new CheckpointRepository(
    jsonStorage<CheckpointStorageDocument>(store, 'checkpoints'),
  );
  const checkpointService = new CheckpointService(repository, checkpointRepository);
  const diagnostics = new DiagnosticsService({
    pluginId: `${PLUGIN_ID}-web`,
    pluginVersion: PLUGIN_VERSION,
    buildVersion: PLUGIN_VERSION,
    maps: repository,
    checkpoints: checkpointRepository,
    settings: settingsStore,
    storageProbe: {
      async run() {
        const key = `metadata-probe-${Date.now()}`;
        await store.set(key, { ok: true });
        const read = await store.get(key);
        await store.delete(key);
        return {
          write: true,
          read: Boolean(read && typeof read === 'object'),
          remove: await store.get(key) === undefined,
        };
      },
    },
    lifecycleProbe: {
      async run() {
        return {
          create: true,
          update: true,
          checkpoint: true,
          restore: true,
          cleanup: true,
        };
      },
    },
    manifestVersionProbe: async () => PLUGIN_VERSION,
  });

  return {
    store,
    repository,
    settingsStore,
    checkpointRepository,
    checkpointService,
    diagnostics,
    async load() {
      await Promise.all([
        repository.load(),
        settingsStore.load(),
        checkpointRepository.load(),
      ]);
      if (repository.list().length === 0) {
        await repository.create('未命名导图', settingsStore.get().defaultLayout);
      }
    },
  };
}
