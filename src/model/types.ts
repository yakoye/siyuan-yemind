export interface MindMapNodeData {
  text: string;
  uid?: string;
  expand?: boolean;
  richText?: boolean;
  [key: string]: unknown;
}

export interface MindMapTree {
  data: MindMapNodeData;
  children: MindMapTree[];
}

export interface YeMindMapDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  layout: string;
  theme: string;
  data: MindMapTree;
  viewData?: Record<string, unknown>;
}

export interface MapStorageDocument {
  version: 1;
  activeMapId: string | null;
  maps: YeMindMapDocument[];
}

export interface RepositoryStorage {
  load(): Promise<unknown>;
  save(value: MapStorageDocument): Promise<void>;
}
