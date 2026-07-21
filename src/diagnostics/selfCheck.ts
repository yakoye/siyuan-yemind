import type { MapCheckpoint } from '../model/checkpointTypes';
import type { MindMapTree, YeMindMapDocument } from '../model/types';
import type { YeMindSettings } from '../settings/SettingsStore';
import type { DiagnosticEditorState } from './DiagnosticsRecorder';

export type SelfCheckStatus = 'pass' | 'warning' | 'fail';

export interface SelfCheckItem {
  id: string;
  status: SelfCheckStatus;
  summary: string;
  details?: Record<string, unknown>;
}

export interface SelfCheckReport {
  runAt: number;
  status: SelfCheckStatus;
  items: SelfCheckItem[];
}

export interface DiagnosticsSelfCheckInput {
  maps: YeMindMapDocument[];
  checkpoints: MapCheckpoint[];
  settings: YeMindSettings;
  editors: DiagnosticEditorState[];
  storageProbe(): Promise<{ write: boolean; read: boolean; remove: boolean }>;
  lifecycleProbe(): Promise<{ create: boolean; update: boolean; checkpoint: boolean; restore: boolean; cleanup: boolean }>;
  now?: () => number;
}

function mergeStatus(items: SelfCheckItem[]): SelfCheckStatus {
  if (items.some((item) => item.status === 'fail')) return 'fail';
  if (items.some((item) => item.status === 'warning')) return 'warning';
  return 'pass';
}

function inspectTree(tree: MindMapTree): { nodes: number; duplicateUids: number; cycles: number } {
  const seenObjects = new WeakSet<object>();
  const seenUids = new Set<string>();
  let nodes = 0;
  let duplicateUids = 0;
  let cycles = 0;

  const walk = (node: MindMapTree): void => {
    if (!node || typeof node !== 'object') return;
    if (seenObjects.has(node)) {
      cycles += 1;
      return;
    }
    seenObjects.add(node);
    nodes += 1;
    const uid = typeof node.data?.uid === 'string' ? node.data.uid : '';
    if (uid) {
      if (seenUids.has(uid)) duplicateUids += 1;
      else seenUids.add(uid);
    }
    (Array.isArray(node.children) ? node.children : []).forEach(walk);
  };
  walk(tree);
  return { nodes, duplicateUids, cycles };
}

export async function runDiagnosticsSelfCheck(input: DiagnosticsSelfCheckInput): Promise<SelfCheckReport> {
  const items: SelfCheckItem[] = [];
  const now = input.now ?? (() => Date.now());

  try {
    const probe = await input.storageProbe();
    const passed = probe.write && probe.read && probe.remove;
    items.push({
      id: 'storage-probe',
      status: passed ? 'pass' : 'fail',
      summary: passed ? '插件临时存储读写和清理正常' : '插件临时存储探针失败',
      details: probe,
    });
  } catch (error) {
    items.push({ id: 'storage-probe', status: 'fail', summary: '插件临时存储探针抛出异常', details: { errorType: error instanceof Error ? error.name : typeof error } });
  }

  try {
    const lifecycle = await input.lifecycleProbe();
    const passed = lifecycle.create && lifecycle.update && lifecycle.checkpoint && lifecycle.restore && lifecycle.cleanup;
    items.push({
      id: 'lifecycle-probe',
      status: passed ? 'pass' : 'fail',
      summary: passed ? '临时导图、保存、检查点恢复和清理正常' : '临时导图生命周期回归失败',
      details: lifecycle,
    });
  } catch (error) {
    items.push({ id: 'lifecycle-probe', status: 'fail', summary: '临时导图生命周期回归抛出异常', details: { errorType: error instanceof Error ? error.name : typeof error } });
  }

  const treeStats = input.maps.map((map) => inspectTree(map.data));
  const duplicateUids = treeStats.reduce((total, item) => total + item.duplicateUids, 0);
  const cycles = treeStats.reduce((total, item) => total + item.cycles, 0);
  const nodeCount = treeStats.reduce((total, item) => total + item.nodes, 0);
  items.push({
    id: 'map-tree',
    status: duplicateUids > 0 || cycles > 0 ? 'fail' : 'pass',
    summary: duplicateUids > 0 || cycles > 0 ? '导图树存在重复 UID 或循环引用' : '导图树结构正常',
    details: { mapCount: input.maps.length, nodeCount, duplicateUids, cycles },
  });

  const mapIds = new Set(input.maps.map((map) => map.id));
  const orphanCheckpoints = input.checkpoints.filter((checkpoint) => !mapIds.has(checkpoint.mapId)).length;
  items.push({
    id: 'checkpoint-links',
    status: orphanCheckpoints > 0 ? 'warning' : 'pass',
    summary: orphanCheckpoints > 0 ? '发现引用已删除导图的检查点' : '检查点引用正常',
    details: { checkpointCount: input.checkpoints.length, orphanCheckpoints },
  });

  const numericSettings = [
    input.settings.autosaveDelayMs,
    input.settings.minZoomRatio,
    input.settings.maxZoomRatio,
    input.settings.fitPadding,
    input.settings.secondLevelMarginX,
    input.settings.secondLevelMarginY,
    input.settings.nodeMarginX,
    input.settings.nodeMarginY,
  ];
  const settingsValid = numericSettings.every(Number.isFinite)
    && input.settings.minZoomRatio > 0
    && input.settings.maxZoomRatio >= input.settings.minZoomRatio;
  items.push({
    id: 'settings',
    status: settingsValid ? 'pass' : 'fail',
    summary: settingsValid ? '关键数值设置正常' : '关键数值设置无效',
    details: {
      autosaveDelayMs: input.settings.autosaveDelayMs,
      minZoomRatio: input.settings.minZoomRatio,
      maxZoomRatio: input.settings.maxZoomRatio,
      fitPadding: input.settings.fitPadding,
    },
  });

  const invalidZoom = input.editors.filter((editor) => !Number.isFinite(editor.zoom) || editor.zoom <= 0).length;
  const zeroCanvas = input.editors.filter((editor) => editor.mounted && (editor.canvasWidth <= 0 || editor.canvasHeight <= 0)).length;
  items.push({
    id: 'open-editors',
    status: invalidZoom > 0 ? 'fail' : zeroCanvas > 0 ? 'warning' : 'pass',
    summary: invalidZoom > 0
      ? '已打开编辑器存在无效缩放值'
      : zeroCanvas > 0
        ? '部分已打开编辑器当前没有可用画布尺寸，可能处于隐藏标签'
        : '已打开编辑器状态正常',
    details: { openEditors: input.editors.length, invalidZoom, zeroCanvas },
  });

  return { runAt: now(), status: mergeStatus(items), items };
}
