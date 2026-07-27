import type { CheckpointStorageDocument } from '../../src/model/checkpointTypes';
import type { MapStorageDocument, YeMindMapDocument } from '../../src/model/types';
import type { YeMindSettings } from '../../src/settings/SettingsStore';
import type { WebKeyValueStore } from './webStorage';

export interface YeMindWebBackup {
  product: 'YeMind';
  format: 'yemind-web-backup';
  version: 1;
  exportedAt: string;
  maps: MapStorageDocument;
  settings: YeMindSettings;
  checkpoints: CheckpointStorageDocument;
}

export interface YeMindMapFile {
  product: 'YeMind';
  format: 'yemind-map';
  version: 1;
  exportedAt: string;
  map: YeMindMapDocument;
}

const clone = <T>(value: T): T => structuredClone(value);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function validateMap(value: unknown): YeMindMapDocument {
  if (!isRecord(value)) throw new Error('Invalid YeMind map');
  if (
    typeof value.id !== 'string'
    || typeof value.title !== 'string'
    || !isRecord(value.data)
    || !isRecord(value.data.data)
  ) {
    throw new Error('Invalid YeMind map data');
  }
  return clone(value as unknown as YeMindMapDocument);
}

export function createBackup(
  maps: MapStorageDocument,
  settings: YeMindSettings,
  checkpoints: CheckpointStorageDocument,
  now: () => string = () => new Date().toISOString(),
): YeMindWebBackup {
  return clone({
    product: 'YeMind',
    format: 'yemind-web-backup',
    version: 1,
    exportedAt: now(),
    maps,
    settings,
    checkpoints,
  });
}

export function validateBackup(value: unknown): YeMindWebBackup {
  if (!isRecord(value) || value.product !== 'YeMind') {
    throw new Error('Invalid YeMind backup product');
  }
  if (value.format !== 'yemind-web-backup') {
    throw new Error('Unsupported YeMind backup format');
  }
  if (value.version !== 1) throw new Error('Unsupported YeMind backup version');
  if (!isRecord(value.maps) || !Array.isArray(value.maps.maps)) {
    throw new Error('Invalid maps document');
  }
  value.maps.maps.forEach(validateMap);
  if (!isRecord(value.settings)) throw new Error('Invalid settings document');
  if (!isRecord(value.checkpoints) || !Array.isArray(value.checkpoints.checkpoints)) {
    throw new Error('Invalid checkpoints document');
  }
  return clone(value as unknown as YeMindWebBackup);
}

export async function restoreBackup(
  store: WebKeyValueStore,
  value: unknown,
): Promise<void> {
  const backup = validateBackup(value);
  await store.transaction({
    maps: backup.maps,
    settings: backup.settings,
    checkpoints: backup.checkpoints,
  });
}

export function exportMapFile(
  map: YeMindMapDocument,
  now: () => string = () => new Date().toISOString(),
): YeMindMapFile {
  return clone({
    product: 'YeMind',
    format: 'yemind-map',
    version: 1,
    exportedAt: now(),
    map,
  });
}

export function importMapFile(
  value: unknown,
  id: () => string = () => crypto.randomUUID(),
  now: () => number = () => Date.now(),
): YeMindMapDocument {
  if (!isRecord(value) || value.product !== 'YeMind') {
    throw new Error('Invalid YeMind map product');
  }
  if (value.format !== 'yemind-map') throw new Error('Unsupported YeMind map format');
  if (value.version !== 1) throw new Error('Unsupported YeMind map version');
  const map = validateMap(value.map);
  const timestamp = now();
  return {
    ...map,
    id: id(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  queueMicrotask(() => URL.revokeObjectURL(url));
}
