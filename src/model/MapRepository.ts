import { createDefaultMap } from './defaultMap';
import type { MapStorageDocument, RepositoryStorage, YeMindMapDocument } from './types';

interface RepositoryOptions {
  now?: () => number;
  id?: () => string;
}

type Listener = (snapshot: MapStorageDocument) => void;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

interface NormalizedMapResult {
  map: YeMindMapDocument | null;
  changed: boolean;
}

function normalizeMap(value: unknown): NormalizedMapResult {
  if (!value || typeof value !== 'object') return { map: null, changed: false };
  const candidate = value as Partial<YeMindMapDocument>;
  if (!candidate.id || !candidate.data?.data) return { map: null, changed: false };
  const fallbackTime = Number(candidate.updatedAt) || Number(candidate.createdAt) || Date.now();
  const normalizedTitle = typeof candidate.title === 'string' && candidate.title.trim()
    ? candidate.title.trim()
    : '未命名导图';
  const normalizedTree = normalizeLegacyTree(clone(candidate.data), fallbackTime);
  const map: YeMindMapDocument = {
    id: String(candidate.id),
    title: normalizedTitle,
    createdAt: Number(candidate.createdAt) || Date.now(),
    updatedAt: fallbackTime,
    layout: typeof candidate.layout === 'string' ? candidate.layout : 'logicalStructure',
    theme: typeof candidate.theme === 'string' ? candidate.theme : 'default',
    data: normalizedTree.tree,
    viewData: candidate.viewData ? clone(candidate.viewData) : undefined,
  };
  const changed = normalizedTitle !== candidate.title || normalizedTree.changed;
  return { map, changed };
}

function normalizeLegacyTree(tree: YeMindMapDocument['data'], fallbackTime: number, path = 'root'): { tree: YeMindMapDocument['data']; changed: boolean } {
  let changed = false;
  const data = { ...tree.data };
  const note = typeof data.note === 'string' ? data.note.trim() : '';
  if (note) {
    const comments = Array.isArray(data.yemindComments) ? [...data.yemindComments] : [];
    if (!comments.some((comment) => comment?.text?.trim() === note)) {
      comments.push({
        id: `legacy_note_${String(data.uid ?? path)}`,
        text: note,
        createdAt: fallbackTime,
        updatedAt: fallbackTime,
      });
    }
    data.yemindComments = comments;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'note')) {
    delete data.note;
    changed = true;
  }
  const children = (tree.children ?? []).map((child, index) => normalizeLegacyTree(child, fallbackTime, `${path}_${index}`));
  return {
    tree: { data, children: children.map((item) => item.tree) },
    changed: changed || children.some((item) => item.changed),
  };
}

export class MapRepository {
  private state: MapStorageDocument = { version: 1, activeMapId: null, maps: [] };
  private readonly listeners = new Set<Listener>();
  private readonly now: () => number;
  private readonly id: () => string;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(private readonly storage: RepositoryStorage, options: RepositoryOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.id = options.id ?? (() => globalThis.crypto?.randomUUID?.() ?? `map-${Date.now()}`);
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    if (!this.loadPromise) this.loadPromise = this.loadInternal();
    await this.loadPromise;
  }

  private async loadInternal(): Promise<void> {
    const raw = await this.storage.load();
    let migrated = false;
    if (!raw || typeof raw !== 'object') {
      this.state = { version: 1, activeMapId: null, maps: [] };
    } else {
      const candidate = raw as Partial<MapStorageDocument>;
      const results = Array.isArray(candidate.maps) ? candidate.maps.map(normalizeMap) : [];
      const maps = results.map((item) => item.map).filter((item): item is YeMindMapDocument => Boolean(item));
      migrated = results.some((item) => item.changed) || maps.length !== (candidate.maps?.length ?? 0);
      const activeMapId = maps.some((map) => map.id === candidate.activeMapId)
        ? String(candidate.activeMapId)
        : maps[0]?.id ?? null;
      this.state = { version: 1, activeMapId, maps };
      migrated ||= candidate.version !== 1 || candidate.activeMapId !== activeMapId;
    }
    this.loaded = true;
    if (migrated) await this.storage.save(this.snapshot());
    this.emit();
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.load();
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
    await this.ensureLoaded();
    this.state.activeMapId = id && this.state.maps.some((map) => map.id === id) ? id : null;
    await this.persist();
  }

  async create(title: string): Promise<YeMindMapDocument> {
    await this.ensureLoaded();
    const map = createDefaultMap(title, this.id(), this.now());
    this.state.maps.push(map);
    this.state.activeMapId = map.id;
    await this.persist();
    return clone(map);
  }

  async rename(id: string, title: string): Promise<void> {
    await this.ensureLoaded();
    const map = this.state.maps.find((item) => item.id === id);
    if (!map) return;
    const normalized = title.trim();
    if (!normalized) return;
    map.title = normalized;
    map.updatedAt = this.now();
    await this.persist();
  }

  async update(id: string, patch: Partial<Pick<YeMindMapDocument, 'data' | 'layout' | 'theme' | 'viewData'>>): Promise<void> {
    await this.ensureLoaded();
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
    await this.ensureLoaded();
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
