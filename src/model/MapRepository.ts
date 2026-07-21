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
  private saveQueue: Promise<void> = Promise.resolve();
  private mutationQueue: Promise<void> = Promise.resolve();

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
    if (migrated) await this.enqueueSave(this.snapshot());
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
    await this.enqueueMutation((draft) => {
      const next = id && draft.maps.some((map) => map.id === id) ? id : null;
      if (draft.activeMapId === next) return { changed: false, value: undefined };
      draft.activeMapId = next;
      return { changed: true, value: undefined };
    });
  }

  async create(title: string, layout = 'logicalStructure'): Promise<YeMindMapDocument> {
    await this.ensureLoaded();
    return this.enqueueMutation((draft) => {
      const map = createDefaultMap(title, this.id(), this.now());
      map.layout = layout || 'logicalStructure';
      draft.maps.push(map);
      draft.activeMapId = map.id;
      return { changed: true, value: clone(map) };
    });
  }

  async rename(id: string, title: string): Promise<void> {
    await this.ensureLoaded();
    await this.enqueueMutation((draft) => {
      const map = draft.maps.find((item) => item.id === id);
      const normalized = title.trim();
      if (!map || !normalized || normalized === map.title) return { changed: false, value: undefined };
      map.title = normalized;
      map.updatedAt = this.now();
      return { changed: true, value: undefined };
    });
  }

  async update(id: string, patch: Partial<Pick<YeMindMapDocument, 'data' | 'layout' | 'theme' | 'viewData'>>): Promise<void> {
    await this.ensureLoaded();
    await this.enqueueMutation((draft) => {
      const map = draft.maps.find((item) => item.id === id);
      if (!map) return { changed: false, value: undefined };
      if (patch.data) map.data = clone(patch.data);
      if (patch.layout !== undefined) map.layout = patch.layout;
      if (patch.theme !== undefined) map.theme = patch.theme;
      if (patch.viewData !== undefined) map.viewData = clone(patch.viewData);
      map.updatedAt = this.now();
      return { changed: true, value: undefined };
    });
  }

  async remove(id: string): Promise<void> {
    await this.ensureLoaded();
    await this.enqueueMutation((draft) => {
      const index = draft.maps.findIndex((item) => item.id === id);
      if (index < 0) return { changed: false, value: undefined };
      draft.maps.splice(index, 1);
      if (draft.activeMapId === id) {
        draft.activeMapId = draft.maps[index]?.id ?? draft.maps[index - 1]?.id ?? null;
      }
      return { changed: true, value: undefined };
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): MapStorageDocument {
    return clone(this.state);
  }

  private enqueueMutation<T>(mutator: (draft: MapStorageDocument) => { changed: boolean; value: T }): Promise<T> {
    const operation = this.mutationQueue.then(async () => {
      const draft = this.snapshot();
      const result = mutator(draft);
      if (!result.changed) return result.value;
      await this.enqueueSave(draft);
      this.state = draft;
      this.emit();
      return result.value;
    });
    this.mutationQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private enqueueSave(snapshot: MapStorageDocument): Promise<void> {
    const operation = this.saveQueue.then(() => this.storage.save(clone(snapshot)));
    this.saveQueue = operation.catch(() => undefined);
    return operation;
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
