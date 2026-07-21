import type { NodeComment, NodeTodo } from '../content/nodeContentState';
import type { NodeNote } from '../content/nodeNoteState';
import type { ProjectStyle } from '../editor/projectStyle';

export interface MindMapNodeData {
  text: string;
  uid?: string;
  expand?: boolean;
  richText?: boolean;
  note?: string;
  tag?: string[];
  icon?: string[];
  hyperlink?: string;
  hyperlinkTitle?: string;
  image?: string;
  imageTitle?: string;
  imageSize?: { width: number; height: number; custom?: boolean };
  yemindTodo?: NodeTodo | null;
  yemindNote?: NodeNote | null;
  yemindComments?: NodeComment[];
  [key: string]: unknown;
}

export interface MindMapTree {
  data: MindMapNodeData;
  children: MindMapTree[];
}


export interface MapCheckpointSnapshot {
  data: MindMapTree;
  layout: string;
  theme: string;
  lineStyle: 'curve' | 'straight' | 'direct';
  projectStyle?: ProjectStyle;
  viewData?: Record<string, unknown>;
}

export interface YeMindMapDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  layout: string;
  theme: string;
  lineStyle: 'curve' | 'straight' | 'direct';
  projectStyle: ProjectStyle;
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
