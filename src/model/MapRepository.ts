import { createDefaultMap } from './defaultMap';
import type { MapStorageDocument, RepositoryStorage, YeMindMapDocument } from './types';

interface RepositoryOptions {
  now?: () => number;
  id?: () => string;
}

type Listener = (snapshot: MapStorageDocument) => void;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function normalizeMap(value: unknown): YeMindMapDocument | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<YeMindMapDocument>;
  if (!candidate.id || !candidate.title || !candidate.data?.data) return null;
  return {
    id: String(candidate.id),
    title: String(candidate.title),
    createdAt: Number(candidate.createdAt) || Date.now(),
    updatedAt: Number(candidate.updatedAt) || Number(candidate.createdAt) || Date.now(),
    layout: typeof candidate.layout === 'string' ? candidate.layout : 'logicalStructure',
    theme: typeof candidate.theme === 'string' ? candidate.theme : 'default',
    data: clone(candidate.data),
    viewData: candidate.viewData ? clone(candidate.viewData) : undefined,
  };
}

export class MapRepository {
  private state: MapStorageDocument = { version: 1, activeMapId: null, maps: [] };
  private readonly listeners = new Set<Listener>();
  private readonly now: () => number;
  private readonly id: () => string;

  constructor(private readonly storage: RepositoryStorage, options: RepositoryOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.id = options.id ?? (() => globalThis.crypto?.randomUUID?.() ?? `map-${Date.now()}`);
  }

  async load(): Promise<void> {
    const raw = await this.storage.load();
    if (!raw || typeof raw !== 'object') {
      this.state = { version: 1, activeMapId: null, maps: [] };
      this.emit();
      return;
    }
    const candidate = raw as Partial<MapStorageDocument>;
    const maps = Array.isArray(candidate.maps)
      ? candidate.maps.map(normalizeMap).filter((item): item is YeMindMapDocument => Boolean(item))
      : [];
    const activeMapId = maps.some((map) => map.id === candidate.activeMapId)
      ? String(candidate.activeMapId)
      : maps[0]?.id ?? null;
    this.state = { version: 1, activeMapId, maps };
    this.emit();
  }

  list(): YeMindMapDocument[] {
    return clone(this.state.maps);
  }

  get(id: string): YeMindMapDocument | undefined {
    const map = this.state.maps.find((item) => item.id === id);
    return map ? clone(map) : undefined;
  }

  getActiveMapId(): string | null {
    return this.state.activeMapId;
  }

  async setActiveMap(id: string | null): Promise<void> {
    this.state.activeMapId = id && this.state.maps.some((map) => map.id === id) ? id : null;
    await this.persist();
  }

  async create(title: string): Promise<YeMindMapDocument> {
    const map = createDefaultMap(title, this.id(), this.now());
    this.state.maps.push(map);
    this.state.activeMapId = map.id;
    await this.persist();
    return clone(map);
  }

  async rename(id: string, title: string): Promise<void> {
    const map = this.state.maps.find((item) => item.id === id);
    if (!map) return;
    const normalized = title.trim();
    if (!normalized) return;
    map.title = normalized;
    map.updatedAt = this.now();
    await this.persist();
  }

  async update(id: string, patch: Partial<Pick<YeMindMapDocument, 'data' | 'layout' | 'theme' | 'viewData'>>): Promise<void> {
    const map = this.state.maps.find((item) => item.id === id);
    if (!map) return;
    if (patch.data) map.data = clone(patch.data);
    if (patch.layout) map.layout = patch.layout;
    if (patch.theme) map.theme = patch.theme;
    if (patch.viewData !== undefined) map.viewData = clone(patch.viewData);
    map.updatedAt = this.now();
    await this.persist();
  }

  async remove(id: string): Promise<void> {
    const index = this.state.maps.findIndex((item) => item.id === id);
    if (index < 0) return;
    this.state.maps.splice(index, 1);
    if (this.state.activeMapId === id) {
      this.state.activeMapId = this.state.maps[index]?.id ?? this.state.maps[index - 1]?.id ?? null;
    }
    await this.persist();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): MapStorageDocument {
    return clone(this.state);
  }

  private async persist(): Promise<void> {
    await this.storage.save(this.snapshot());
    this.emit();
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
