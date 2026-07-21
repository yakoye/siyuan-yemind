import JSZip from 'jszip';
import type { CheckpointRepository } from '../model/CheckpointRepository';
import type { MapRepository } from '../model/MapRepository';
import type { MindMapTree, YeMindMapDocument } from '../model/types';
import type { SettingsStore } from '../settings/SettingsStore';
import { DiagnosticsRecorder, type DiagnosticEditorState, type DiagnosticLevel } from './DiagnosticsRecorder';
import { runDiagnosticsSelfCheck, type SelfCheckReport } from './selfCheck';
import type { VersionConsistency } from '../releaseInfo';

export interface DiagnosticStorageProbe {
  run(): Promise<{ write: boolean; read: boolean; remove: boolean }>;
}

export interface GlobalSearchDiagnosticState {
  observed: boolean;
  queryLength: number;
  nativeResultCount: number;
  yemindResultCount: number;
  listMounted: boolean;
  previewMounted: boolean;
  previewVisible: boolean;
  selectedType: 'none' | 'native' | 'yemind';
  lastNavigationStep: string;
  lastNavigationSuccess: boolean | null;
  lastFailure?: string;
  updatedAt: number;
}

export interface DiagnosticsReport {
  schemaVersion: 3;
  generatedAt: number;
  plugin: { id: string; version: string };
  environment: Record<string, unknown>;
  session: ReturnType<DiagnosticsRecorder['getSessionInfo']>;
  selfCheck: SelfCheckReport | null;
  editors: DiagnosticEditorState[];
  mapsSummary: unknown[];
  checkpointsSummary: unknown[];
  events: ReturnType<DiagnosticsRecorder['listEvents']>;
  problemMarkers: ReturnType<DiagnosticsRecorder['listProblemMarkers']>;
  problemWindows: Array<NonNullable<ReturnType<DiagnosticsRecorder['problemWindow']>>>;
  globalSearch: GlobalSearchDiagnosticState;
  versionConsistency: VersionConsistency;
}

interface DiagnosticsServiceOptions {
  pluginId: string;
  pluginVersion: string;
  buildVersion?: string;
  maps: MapRepository;
  checkpoints: CheckpointRepository;
  settings: SettingsStore;
  storageProbe: DiagnosticStorageProbe;
  lifecycleProbe: { run(): Promise<{ create: boolean; update: boolean; checkpoint: boolean; restore: boolean; cleanup: boolean }> };
  manifestVersionProbe?: () => Promise<string | null>;
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

function buildSafeGlobalSearchDomSnapshot(): string {
  if (typeof document === 'undefined') return '<!doctype html><meta charset="utf-8"><pre>document unavailable</pre>';
  const input = document.querySelector<HTMLElement>('#searchInput');
  const root = input?.closest<HTMLElement>('.b3-dialog__container, .fn__flex-column') ?? document.querySelector<HTMLElement>('#searchList')?.parentElement ?? null;
  if (!root) return '<!doctype html><meta charset="utf-8"><pre>global search surface not found</pre>';
  const allowedData = new Set(['type', 'role', 'yemind-global-results', 'yemind-global-map', 'yemind-global-node']);
  let count = 0;
  const render = (element: Element, depth: number): string => {
    if (count >= 220 || depth > 7) return '';
    count += 1;
    const attrs: string[] = [];
    if (element.id) attrs.push(`id=${JSON.stringify(element.id)}`);
    if (element.classList.length) attrs.push(`class=${JSON.stringify(Array.from(element.classList).join(' '))}`);
    for (const attribute of Array.from(element.attributes)) {
      if (!attribute.name.startsWith('data-')) continue;
      const key = attribute.name.slice(5);
      if (!allowedData.has(key)) continue;
      const value = key.includes('map') || key.includes('node') ? '[id]' : attribute.value;
      attrs.push(`${attribute.name}=${JSON.stringify(value)}`);
    }
    const hidden = element instanceof HTMLElement && (element.hidden || getComputedStyle(element).display === 'none');
    if (hidden) attrs.push('hidden=true');
    const line = `${'  '.repeat(depth)}<${element.tagName.toLowerCase()}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
    const children = Array.from(element.children).map((child) => render(child, depth + 1)).filter(Boolean);
    return [line, ...children].join('\n');
  };
  const structure = render(root, 0);
  return `<!doctype html><meta charset="utf-8"><title>YeMind diagnostics DOM structure</title><pre>${structure.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>`;
}

export class DiagnosticsService {
  readonly recorder: DiagnosticsRecorder;
  private readonly now: () => number;
  private lastSelfCheck: SelfCheckReport | null = null;
  private selfCheckPromise: Promise<SelfCheckReport> | null = null;
  private globalSearchState: GlobalSearchDiagnosticState = {
    observed: false, queryLength: 0, nativeResultCount: 0, yemindResultCount: 0,
    listMounted: false, previewMounted: false, previewVisible: false, selectedType: 'none',
    lastNavigationStep: 'not-started', lastNavigationSuccess: null, updatedAt: 0,
  };

  constructor(private readonly options: DiagnosticsServiceOptions) {
    this.recorder = options.recorder ?? new DiagnosticsRecorder();
    this.now = options.now ?? (() => Date.now());
  }

  start(): void { this.recorder.start(); }
  stop(): void { this.recorder.stop(); }
  clear(): void { this.recorder.clear(); this.lastSelfCheck = null; }
  isRecording(): boolean { return this.recorder.isRecording(); }
  markProblem(label = '问题发生'): ReturnType<DiagnosticsRecorder['markProblem']> { return this.recorder.markProblem(label); }
  getLastSelfCheck(): SelfCheckReport | null {
    return this.lastSelfCheck ? JSON.parse(JSON.stringify(this.lastSelfCheck)) as SelfCheckReport : null;
  }


  updateGlobalSearchState(patch: Partial<Omit<GlobalSearchDiagnosticState, 'updatedAt'>>): void {
    const normalized = { ...patch };
    if (typeof normalized.lastFailure === 'string') {
      normalized.lastFailure = normalized.lastFailure
        .replace(/(?:[A-Za-z]:\\|\/)[^\s]+/g, '[path]')
        .slice(0, 180);
    }
    this.globalSearchState = { ...this.globalSearchState, ...normalized, updatedAt: this.now() };
  }

  getGlobalSearchState(): GlobalSearchDiagnosticState {
    return { ...this.globalSearchState };
  }

  getEnvironmentSnapshot(): Record<string, unknown> {
    const system = (globalThis as typeof globalThis & { siyuan?: { config?: { system?: Record<string, unknown> } } }).siyuan?.config?.system ?? {};
    return {
      platform: system.os ?? safeNavigatorValue('platform'),
      architecture: system.arch ?? 'unknown',
      container: system.container ?? 'unknown',
      appVersion: system.kernelVersion ?? system.appVersion ?? 'unknown',
      language: safeNavigatorValue('language'),
      userAgent: safeNavigatorValue('userAgent'),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  async getVersionConsistency(): Promise<VersionConsistency> {
    const manifest = await this.readManifestVersion();
    const runtime = this.options.pluginVersion;
    const build = this.options.buildVersion ?? runtime;
    return { manifest: manifest ?? 'unknown', runtime, build, consistent: Boolean(manifest) && manifest === runtime && runtime === build };
  }

  record(category: string, action: string, mapId?: string, details?: Record<string, unknown>, level: DiagnosticLevel = 'info', force = false): void {
    try {
      this.recorder.record(category, action, mapId, details, level, force);
    } catch (error) {
      console.warn('[YeMind] diagnostic record failed', error);
    }
  }

  recordError(category: string, action: string, error: unknown, mapId?: string, force = true): void {
    try {
      this.recorder.recordError(category, action, error, mapId, force);
    } catch (recordError) {
      console.warn('[YeMind] diagnostic error record failed', recordError);
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
    const manifestVersion = await this.readManifestVersion();
    const report = await runDiagnosticsSelfCheck({
      maps: this.options.maps.list(),
      checkpoints: this.options.checkpoints.listAll(),
      settings: this.options.settings.get(),
      editors: this.recorder.listEditorStates(),
      versions: { manifest: manifestVersion ?? this.options.pluginVersion, runtime: this.options.pluginVersion, build: this.options.buildVersion ?? this.options.pluginVersion },
      globalSearch: this.globalSearchState,
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


  private async readManifestVersion(): Promise<string | null> {
    if (this.options.manifestVersionProbe) return this.options.manifestVersionProbe();
    if (typeof fetch !== 'function') return null;
    try {
      const response = await fetch(`/plugins/${encodeURIComponent(this.options.pluginId)}/plugin.json?diagnostics=${this.now()}`, { cache: 'no-store' });
      if (!response.ok) return null;
      const manifest = await response.json() as { version?: unknown };
      return typeof manifest.version === 'string' ? manifest.version : null;
    } catch {
      return null;
    }
  }

  buildReport(): DiagnosticsReport {
    const checkpoints = this.options.checkpoints.listAll();
    return {
      schemaVersion: 3,
      generatedAt: this.now(),
      plugin: { id: this.options.pluginId, version: this.options.pluginVersion },
      environment: this.getEnvironmentSnapshot(),
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
      problemMarkers: this.recorder.listProblemMarkers(),
      problemWindows: this.recorder.listProblemMarkers().map((marker) => this.recorder.problemWindow(marker.id)).filter((window): window is NonNullable<typeof window> => Boolean(window)),
      globalSearch: this.getGlobalSearchState(),
      versionConsistency: { manifest: this.options.pluginVersion, runtime: this.options.pluginVersion, build: this.options.buildVersion ?? this.options.pluginVersion, consistent: this.options.pluginVersion === (this.options.buildVersion ?? this.options.pluginVersion) },
    };
  }

  async buildArchive(includeNodeText = false): Promise<{ blob: Blob; bytes: Uint8Array; filename: string }> {
    if (!this.lastSelfCheck) await this.runSelfCheck();
    const report = this.buildReport();
    const versionConsistency = await this.getVersionConsistency();
    report.versionConsistency = versionConsistency;
    const zip = new JSZip();
    const errors = report.events.filter((event) => event.level === 'error');
    const markers = { markers: report.problemMarkers, windows: report.problemWindows };
    const timeline = report.events.map((event) => JSON.stringify(event)).join('\n');
    const searchState = report.globalSearch;
    const summary = [
      '# YeMind 诊断摘要',
      '',
      `- 生成时间：${new Date(report.generatedAt).toISOString()}`,
      `- 插件版本：${report.plugin.version}`,
      `- 版本一致性：${versionConsistency.consistent ? '通过' : '失败'}`,
      `- 回归检查：${report.selfCheck?.status ?? '未运行'}`,
      `- 事件数量：${report.events.length}`,
      `- 错误数量：${errors.length}`,
      `- 问题标记：${report.problemMarkers.length}`,
      '',
      '## 全局搜索',
      '',
      `- 已观察搜索会话：${searchState.observed ? '是' : '否'}`,
      `- 思源结果：${searchState.nativeResultCount}`,
      `- YeMind 结果：${searchState.yemindResultCount}`,
      `- 结果列表挂载：${searchState.listMounted ? '是' : '否'}`,
      `- 预览可见：${searchState.previewVisible ? '是' : '否'}`,
      `- 最后导航步骤：${searchState.lastNavigationStep}`,
      `- 最后导航结果：${searchState.lastNavigationSuccess === null ? '未知' : searchState.lastNavigationSuccess ? '成功' : '失败'}`,
      searchState.lastFailure ? `- 最后失败：${searchState.lastFailure}` : '',
    ].filter(Boolean).join('\n');
    const domSnapshot = `${buildSafeGlobalSearchDomSnapshot()}
<!-- state: list=${searchState.listMounted}; preview=${searchState.previewMounted}; visible=${searchState.previewVisible}; selected=${searchState.selectedType}; native=${searchState.nativeResultCount}; yemind=${searchState.yemindResultCount} -->`;

    zip.file('summary.md', summary);
    zip.file('environment.json', JSON.stringify(report.environment, null, 2));
    zip.file('version-consistency.json', JSON.stringify(versionConsistency, null, 2));
    zip.file('event-timeline.jsonl', timeline);
    zip.file('search-state.json', JSON.stringify(searchState, null, 2));
    zip.file('active-map-state.json', JSON.stringify(report.editors, null, 2));
    zip.file('regression-results.json', JSON.stringify(report.selfCheck, null, 2));
    zip.file('errors.json', JSON.stringify(errors, null, 2));
    zip.file('diagnostic-marker.json', JSON.stringify(markers, null, 2));
    zip.file('dom-structure-snapshot.html', domSnapshot);
    zip.file('diagnostics.json', JSON.stringify(report, null, 2));
    zip.file('settings.json', JSON.stringify(this.options.settings.get(), null, 2));
    if (includeNodeText) zip.file('maps-with-content.json', JSON.stringify(this.options.maps.list(), null, 2));
    zip.file('README.txt', [
      'YeMind diagnostics package', '',
      'This package is generated locally and is not uploaded automatically.',
      includeNodeText
        ? 'WARNING: maps-with-content.json contains map titles, node text and other node data because the user explicitly enabled it.'
        : 'Map titles, node text, comments, links, images and private paths are excluded by default.',
      '', `Plugin: ${this.options.pluginId} ${this.options.pluginVersion}`,
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
