import type { YeMindMapDocument } from './types';
import { normalizeLineStyle, normalizeThemePresetId } from '../core/themePresets';
import { normalizeLayoutId } from '../core/layoutPresets';
import { normalizeLayoutAssetId } from '../core/layoutAssetPresets';
import { normalizeProjectStyle } from '../editor/projectStyle';
import type {
  CheckpointKind,
  CheckpointStorage,
  CheckpointStorageDocument,
  MapCheckpoint,
} from './checkpointTypes';

interface CheckpointRepositoryOptions {
  now?: () => number;
  id?: () => string;
  maxPerMap?: number;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function countNodes(tree: YeMindMapDocument['data']): number {
  return 1 + (tree.children ?? []).reduce((total, child) => total + countNodes(child), 0);
}

function normalizeCheckpoint(value: unknown): MapCheckpoint | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<MapCheckpoint>;
  if (!candidate.id || !candidate.mapId || !candidate.snapshot?.data) return null;
  const kind: CheckpointKind = candidate.kind === 'recovery-protection' ? 'recovery-protection' : 'manual';
  return {
    id: String(candidate.id),
    mapId: String(candidate.mapId),
    name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : '未命名检查点',
    kind,
    createdAt: Number(candidate.createdAt) || Date.now(),
    nodeCount: Number(candidate.nodeCount) || countNodes(candidate.snapshot.data),
    snapshot: {
      data: clone(candidate.snapshot.data),
      layout: normalizeLayoutId(candidate.snapshot.layout),
      layoutPresetId: normalizeLayoutAssetId(candidate.snapshot.layoutPresetId, candidate.snapshot.layout),
      theme: normalizeThemePresetId(candidate.snapshot.theme),
      lineStyle: normalizeLineStyle(candidate.snapshot.lineStyle),
      projectStyle: normalizeProjectStyle(candidate.snapshot.projectStyle),
      viewData: candidate.snapshot.viewData ? clone(candidate.snapshot.viewData) : undefined,
    },
  };
}

export class CheckpointRepository {
  private state: CheckpointStorageDocument = { version: 1, checkpoints: [] };
  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private saveQueue: Promise<void> = Promise.resolve();
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly now: () => number;
  private readonly id: () => string;
  private readonly maxPerMap: number;

  constructor(private readonly storage: CheckpointStorage, options: CheckpointRepositoryOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.id = options.id ?? (() => globalThis.crypto?.randomUUID?.() ?? `checkpoint-${Date.now()}`);
    this.maxPerMap = Math.max(1, Math.floor(options.maxPerMap ?? 20));
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    if (!this.loadPromise) this.loadPromise = this.loadInternal();
    await this.loadPromise;
  }

  private async loadInternal(): Promise<void> {
    const raw = await this.storage.load();
    const candidate = raw && typeof raw === 'object' ? raw as Partial<CheckpointStorageDocument> : null;
    const checkpoints = Array.isArray(candidate?.checkpoints)
      ? candidate!.checkpoints.map(normalizeCheckpoint).filter((item): item is MapCheckpoint => Boolean(item))
      : [];
    this.state = { version: 1, checkpoints };
    this.loaded = true;
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.load();
  }

  list(mapId: string): MapCheckpoint[] {
    return clone(this.state.checkpoints
      .filter((item) => item.mapId === mapId)
      .sort((a, b) => b.createdAt - a.createdAt));
  }

  listAll(): MapCheckpoint[] {
    return clone(this.state.checkpoints.slice().sort((a, b) => b.createdAt - a.createdAt));
  }

  get(id: string): MapCheckpoint | undefined {
    const checkpoint = this.state.checkpoints.find((item) => item.id === id);
    return checkpoint ? clone(checkpoint) : undefined;
  }

  async create(map: YeMindMapDocument, name: string, kind: CheckpointKind = 'manual'): Promise<MapCheckpoint> {
    await this.ensureLoaded();
    return this.enqueueMutation((draft) => {
      const checkpoint: MapCheckpoint = {
        id: this.id(),
        mapId: map.id,
        name: name.trim() || '未命名检查点',
        kind,
        createdAt: this.now(),
        nodeCount: countNodes(map.data),
        snapshot: {
          data: clone(map.data),
          layout: map.layout,
          layoutPresetId: map.layoutPresetId,
          theme: map.theme,
          lineStyle: map.lineStyle,
          projectStyle: normalizeProjectStyle(map.projectStyle),
          viewData: map.viewData ? clone(map.viewData) : undefined,
        },
      };
      draft.checkpoints.push(checkpoint);
      this.applyRetention(draft, map.id, checkpoint.id);
      return { changed: true, value: clone(checkpoint) };
    });
  }

  async rename(id: string, name: string): Promise<void> {
    await this.ensureLoaded();
    await this.enqueueMutation((draft) => {
      const checkpoint = draft.checkpoints.find((item) => item.id === id);
      const normalized = name.trim();
      if (!checkpoint || !normalized || normalized === checkpoint.name) return { changed: false, value: undefined };
      checkpoint.name = normalized;
      return { changed: true, value: undefined };
    });
  }

  async remove(id: string): Promise<void> {
    await this.ensureLoaded();
    await this.enqueueMutation((draft) => {
      const index = draft.checkpoints.findIndex((item) => item.id === id);
      if (index < 0) return { changed: false, value: undefined };
      draft.checkpoints.splice(index, 1);
      return { changed: true, value: undefined };
    });
  }

  async removeForMap(mapId: string): Promise<void> {
    await this.ensureLoaded();
    await this.enqueueMutation((draft) => {
      const next = draft.checkpoints.filter((item) => item.mapId !== mapId);
      if (next.length === draft.checkpoints.length) return { changed: false, value: undefined };
      draft.checkpoints = next;
      return { changed: true, value: undefined };
    });
  }

  private applyRetention(draft: CheckpointStorageDocument, mapId: string, preserveId: string): void {
    while (draft.checkpoints.filter((item) => item.mapId === mapId).length > this.maxPerMap) {
      const oldestManual = draft.checkpoints
        .filter((item) => item.mapId === mapId && item.kind === 'manual' && item.id !== preserveId)
        .sort((a, b) => a.createdAt - b.createdAt)[0];
      if (!oldestManual) break;
      draft.checkpoints = draft.checkpoints.filter((item) => item.id !== oldestManual.id);
    }
  }

  private snapshot(): CheckpointStorageDocument {
    return clone(this.state);
  }

  private enqueueMutation<T>(mutator: (draft: CheckpointStorageDocument) => { changed: boolean; value: T }): Promise<T> {
    const operation = this.mutationQueue.then(async () => {
      const draft = this.snapshot();
      const result = mutator(draft);
      if (!result.changed) return result.value;
      await this.enqueueSave(draft);
      this.state = draft;
      return result.value;
    });
    this.mutationQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private enqueueSave(snapshot: CheckpointStorageDocument): Promise<void> {
    const operation = this.saveQueue.then(() => this.storage.save(clone(snapshot)));
    this.saveQueue = operation.catch(() => undefined);
    return operation;
  }
}
