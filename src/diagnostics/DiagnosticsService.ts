import JSZip from 'jszip';
import type { CheckpointRepository } from '../model/CheckpointRepository';
import type { MapRepository } from '../model/MapRepository';
import type { MindMapTree, YeMindMapDocument } from '../model/types';
import type { SettingsStore } from '../settings/SettingsStore';
import { DiagnosticsRecorder, type DiagnosticEditorState, type DiagnosticLevel } from './DiagnosticsRecorder';
import { runDiagnosticsSelfCheck, type SelfCheckReport } from './selfCheck';

export interface DiagnosticStorageProbe {
  run(): Promise<{ write: boolean; read: boolean; remove: boolean }>;
}

export interface DiagnosticsReport {
  schemaVersion: 1;
  generatedAt: number;
  plugin: { id: string; version: string };
  environment: Record<string, unknown>;
  session: ReturnType<DiagnosticsRecorder['getSessionInfo']>;
  selfCheck: SelfCheckReport | null;
  editors: DiagnosticEditorState[];
  mapsSummary: unknown[];
  checkpointsSummary: unknown[];
  events: ReturnType<DiagnosticsRecorder['listEvents']>;
}

interface DiagnosticsServiceOptions {
  pluginId: string;
  pluginVersion: string;
  maps: MapRepository;
  checkpoints: CheckpointRepository;
  settings: SettingsStore;
  storageProbe: DiagnosticStorageProbe;
  lifecycleProbe: { run(): Promise<{ create: boolean; update: boolean; checkpoint: boolean; restore: boolean; cleanup: boolean }> };
  recorder?: DiagnosticsRecorder;
  now?: () => number;
}

function countTree(tree: MindMapTree): { nodes: number; depth: number; todos: number; comments: number; images: number; links: number } {
  let nodes = 0;
  let depth = 0;
  let todos = 0;
  let comments = 0;
  let images = 0;
  let links = 0;
  const walk = (node: MindMapTree, level: number): void => {
    nodes += 1;
    depth = Math.max(depth, level);
    if (node.data?.yemindTodo) todos += 1;
    if (Array.isArray(node.data?.yemindComments)) comments += node.data.yemindComments.length;
    if (node.data?.image) images += 1;
    if (node.data?.hyperlink) links += 1;
    (node.children ?? []).forEach((child) => walk(child, level + 1));
  };
  walk(tree, 0);
  return { nodes, depth, todos, comments, images, links };
}

function summarizeMaps(maps: YeMindMapDocument[]): unknown[] {
  return maps.map((map, index) => ({
    index: index + 1,
    createdAt: map.createdAt,
    updatedAt: map.updatedAt,
    layout: map.layout,
    theme: map.theme,
    hasViewData: Boolean(map.viewData),
    ...countTree(map.data),
  }));
}

function safeNavigatorValue(key: 'platform' | 'language' | 'userAgent'): string {
  return typeof navigator === 'undefined' ? 'unknown' : String(navigator[key] ?? 'unknown');
}

export class DiagnosticsService {
  readonly recorder: DiagnosticsRecorder;
  private readonly now: () => number;
  private lastSelfCheck: SelfCheckReport | null = null;
  private selfCheckPromise: Promise<SelfCheckReport> | null = null;

  constructor(private readonly options: DiagnosticsServiceOptions) {
    this.recorder = options.recorder ?? new DiagnosticsRecorder();
    this.now = options.now ?? (() => Date.now());
  }

  start(): void { this.recorder.start(); }
  stop(): void { this.recorder.stop(); }
  clear(): void { this.recorder.clear(); this.lastSelfCheck = null; }
  isRecording(): boolean { return this.recorder.isRecording(); }
  getLastSelfCheck(): SelfCheckReport | null {
    return this.lastSelfCheck ? JSON.parse(JSON.stringify(this.lastSelfCheck)) as SelfCheckReport : null;
  }

  record(category: string, action: string, mapId?: string, details?: Record<string, unknown>, level: DiagnosticLevel = 'info', force = false): void {
    try {
      this.recorder.record(category, action, mapId, details, level, force);
    } catch (error) {
      console.warn('[YeMind Zen] diagnostic record failed', error);
    }
  }

  recordError(category: string, action: string, error: unknown, mapId?: string, force = true): void {
    try {
      this.recorder.recordError(category, action, error, mapId, force);
    } catch (recordError) {
      console.warn('[YeMind Zen] diagnostic error record failed', recordError);
    }
  }

  setEditorState(mapId: string, patch: Partial<Omit<DiagnosticEditorState, 'mapKey'>>): void {
    this.recorder.setEditorState(mapId, patch);
  }

  removeEditorState(mapId: string): void {
    this.recorder.removeEditorState(mapId);
  }

  attachGlobalListeners(): void {
    if (typeof window !== 'undefined') this.recorder.attachGlobalErrorListeners();
  }

  detachGlobalListeners(): void {
    this.recorder.detachGlobalErrorListeners();
  }

  runSelfCheck(): Promise<SelfCheckReport> {
    if (this.selfCheckPromise) return this.selfCheckPromise;
    const operation = this.runSelfCheckInternal();
    const tracked = operation.finally(() => {
      if (this.selfCheckPromise === tracked) this.selfCheckPromise = null;
    });
    this.selfCheckPromise = tracked;
    return tracked;
  }

  private async runSelfCheckInternal(): Promise<SelfCheckReport> {
    const report = await runDiagnosticsSelfCheck({
      maps: this.options.maps.list(),
      checkpoints: this.options.checkpoints.listAll(),
      settings: this.options.settings.get(),
      editors: this.recorder.listEditorStates(),
      storageProbe: () => this.options.storageProbe.run(),
      lifecycleProbe: () => this.options.lifecycleProbe.run(),
      now: this.now,
    });
    this.lastSelfCheck = report;
    this.record('diagnostics', 'self-check-completed', undefined, {
      status: report.status,
      pass: report.items.filter((item) => item.status === 'pass').length,
      warning: report.items.filter((item) => item.status === 'warning').length,
      fail: report.items.filter((item) => item.status === 'fail').length,
    }, report.status === 'fail' ? 'error' : report.status === 'warning' ? 'warning' : 'info', true);
    return report;
  }

  buildReport(): DiagnosticsReport {
    const system = (globalThis as typeof globalThis & { siyuan?: { config?: { system?: Record<string, unknown> } } }).siyuan?.config?.system ?? {};
    const checkpoints = this.options.checkpoints.listAll();
    return {
      schemaVersion: 1,
      generatedAt: this.now(),
      plugin: { id: this.options.pluginId, version: this.options.pluginVersion },
      environment: {
        platform: system.os ?? safeNavigatorValue('platform'),
        architecture: system.arch ?? 'unknown',
        container: system.container ?? 'unknown',
        appVersion: system.kernelVersion ?? system.appVersion ?? 'unknown',
        language: safeNavigatorValue('language'),
        userAgent: safeNavigatorValue('userAgent'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      session: this.recorder.getSessionInfo(),
      selfCheck: this.lastSelfCheck,
      editors: this.recorder.listEditorStates(),
      mapsSummary: summarizeMaps(this.options.maps.list()),
      checkpointsSummary: checkpoints.map((checkpoint) => ({
        kind: checkpoint.kind,
        createdAt: checkpoint.createdAt,
        nodeCount: checkpoint.nodeCount,
      })),
      events: this.recorder.listEvents(),
    };
  }

  async buildArchive(includeNodeText = false): Promise<{ blob: Blob; bytes: Uint8Array; filename: string }> {
    if (!this.lastSelfCheck) await this.runSelfCheck();
    const report = this.buildReport();
    const zip = new JSZip();
    zip.file('diagnostics.json', JSON.stringify(report, null, 2));
    zip.file('settings.json', JSON.stringify(this.options.settings.get(), null, 2));
    if (includeNodeText) {
      zip.file('maps-with-content.json', JSON.stringify(this.options.maps.list(), null, 2));
    }
    zip.file('README.txt', [
      'YeMind Zen diagnostics package',
      '',
      'This package is generated locally and is not uploaded automatically.',
      includeNodeText
        ? 'WARNING: maps-with-content.json contains map titles, node text and other node data because the user explicitly enabled it.'
        : 'Map titles, node text, comments, links, images and private paths are excluded by default.',
      '',
      `Plugin: ${this.options.pluginId} ${this.options.pluginVersion}`,
      `Generated: ${new Date(report.generatedAt).toISOString()}`,
    ].join('\n'));
    const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const blob = new Blob([bytes as BlobPart], { type: 'application/zip' });
    const date = new Date(this.now());
    const pad = (value: number) => String(value).padStart(2, '0');
    const filename = `yemind-diagnostics-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.zip`;
    this.record('diagnostics', 'archive-created', undefined, { includeNodeText, eventCount: report.events.length }, 'info', true);
    return { blob, bytes, filename };
  }

}

export function downloadDiagnosticsArchive(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
