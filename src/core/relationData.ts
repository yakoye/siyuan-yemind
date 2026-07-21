import type { MindMapNodeData, MindMapTree } from '../model/types';

export interface RelationSanitizeResult {
  tree: MindMapTree;
  changed: boolean;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function generalizationList(data: MindMapNodeData): MindMapNodeData[] {
  const value = data.generalization;
  if (Array.isArray(value)) return value.filter((item): item is MindMapNodeData => Boolean(item && typeof item === 'object'));
  return value && typeof value === 'object' ? [value as MindMapNodeData] : [];
}

function visitData(tree: MindMapTree, callback: (data: MindMapNodeData) => void): void {
  callback(tree.data);
  generalizationList(tree.data).forEach(callback);
  (tree.children ?? []).forEach((child) => visitData(child, callback));
}

function filterIndexed(values: unknown, indices: number[]): unknown {
  if (!Array.isArray(values)) return values;
  return indices.map((index) => values[index] ?? null);
}

function filterTargetMap(value: unknown, validTargets: Set<string>): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([uid]) => validTargets.has(uid)),
  );
}

function relationSnapshot(data: MindMapNodeData): string {
  return JSON.stringify({
    associativeLineTargets: data.associativeLineTargets,
    associativeLinePoint: data.associativeLinePoint,
    associativeLineTargetControlOffsets: data.associativeLineTargetControlOffsets,
    associativeLineText: data.associativeLineText,
    associativeLineStyle: data.associativeLineStyle,
  });
}

function sanitizeNodeData(data: MindMapNodeData, knownUids: Set<string>): boolean {
  if (!Array.isArray(data.associativeLineTargets)) return false;
  const before = relationSnapshot(data);
  const sourceUid = typeof data.uid === 'string' ? data.uid : '';
  const seen = new Set<string>();
  const indices: number[] = [];
  const targets: string[] = [];

  data.associativeLineTargets.forEach((target, index) => {
    if (typeof target !== 'string' || !knownUids.has(target) || target === sourceUid || seen.has(target)) return;
    seen.add(target);
    targets.push(target);
    indices.push(index);
  });

  data.associativeLineTargets = targets;
  if (Array.isArray(data.associativeLinePoint)) data.associativeLinePoint = filterIndexed(data.associativeLinePoint, indices);
  if (Array.isArray(data.associativeLineTargetControlOffsets)) {
    data.associativeLineTargetControlOffsets = filterIndexed(data.associativeLineTargetControlOffsets, indices);
  }
  const validTargets = new Set(targets);
  if (data.associativeLineText && typeof data.associativeLineText === 'object') {
    data.associativeLineText = filterTargetMap(data.associativeLineText, validTargets);
  }
  if (data.associativeLineStyle && typeof data.associativeLineStyle === 'object') {
    data.associativeLineStyle = filterTargetMap(data.associativeLineStyle, validTargets);
  }
  return before !== relationSnapshot(data);
}

export function sanitizeAssociativeLines(input: MindMapTree): RelationSanitizeResult {
  const tree = clone(input);
  const knownUids = new Set<string>();
  visitData(tree, (data) => {
    if (typeof data.uid === 'string' && data.uid) knownUids.add(data.uid);
  });

  let changed = false;
  visitData(tree, (data) => {
    if (sanitizeNodeData(data, knownUids)) changed = true;
  });
  return { tree, changed };
}
