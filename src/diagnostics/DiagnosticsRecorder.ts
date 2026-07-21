export type DiagnosticLevel = 'info' | 'warning' | 'error';

export interface DiagnosticEvent {
  sequence: number;
  timestamp: number;
  level: DiagnosticLevel;
  category: string;
  action: string;
  mapKey?: string;
  details?: Record<string, unknown>;
}

export interface DiagnosticEditorState {
  mapKey: string;
  mounted: boolean;
  readonly: boolean;
  viewMode: string;
  selectedNodeCount: number;
  nodeCount: number;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  saveState: string;
}

export interface DiagnosticsRecorderOptions {
  now?: () => number;
  maxEvents?: number;
  sessionId?: string;
}

const SENSITIVE_KEY = /(title|text|content|html|markdown|body|comment|note|link|url|path|token|secret|password|name|clipboard)/i;

function shortHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function scrubString(value: string): string {
  return value
    .replace(/siyuan:\/\/\S+/gi, '[siyuan-link]')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[A-Za-z]:\\[^\s]+/g, '[path]')
    .replace(/(?:^|\s)\/(?:[^\s/]+\/)+[^\s]*/g, ' [path]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 180);
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-limit]';
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).slice(0, 40).forEach(([key, entry]) => {
      result[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : sanitizeValue(entry, depth + 1);
    });
    return result;
  }
  return String(value);
}

function errorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorType: error.name || 'Error',
      errorSummary: scrubString(error.message || 'Unknown error'),
    };
  }
  return { errorType: typeof error, errorSummary: scrubString(String(error)) };
}

export class DiagnosticsRecorder {
  private readonly now: () => number;
  private readonly maxEvents: number;
  private readonly sessionId: string;
  private readonly events: DiagnosticEvent[] = [];
  private readonly editors = new Map<string, DiagnosticEditorState>();
  private sequence = 0;
  private recording = false;
  private startedAt: number | null = null;
  private globalCleanup: (() => void) | null = null;

  constructor(options: DiagnosticsRecorderOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.maxEvents = Math.max(50, Math.floor(options.maxEvents ?? 500));
    this.sessionId = options.sessionId ?? globalThis.crypto?.randomUUID?.() ?? `session-${this.now()}`;
  }

  start(): void {
    if (this.recording) return;
    this.recording = true;
    this.startedAt = this.now();
    this.record('diagnostics', 'recording-started', undefined, { maxEvents: this.maxEvents }, 'info', true);
  }

  stop(): void {
    if (!this.recording) return;
    this.record('diagnostics', 'recording-stopped', undefined, undefined, 'info', true);
    this.recording = false;
  }

  clear(): void {
    this.events.length = 0;
    this.sequence = 0;
    this.startedAt = this.recording ? this.now() : null;
  }

  isRecording(): boolean {
    return this.recording;
  }

  getSessionInfo(): { sessionId: string; recording: boolean; startedAt: number | null; eventCount: number } {
    return { sessionId: this.sessionId, recording: this.recording, startedAt: this.startedAt, eventCount: this.events.length };
  }

  mapKey(mapId: string): string {
    return `map-${shortHash(`${this.sessionId}:${mapId}`)}`;
  }

  record(
    category: string,
    action: string,
    mapId?: string,
    details?: Record<string, unknown>,
    level: DiagnosticLevel = 'info',
    force = false,
  ): void {
    if (!force && !this.recording) return;
    const event: DiagnosticEvent = {
      sequence: ++this.sequence,
      timestamp: this.now(),
      level,
      category: scrubString(category),
      action: scrubString(action),
      mapKey: mapId ? this.mapKey(mapId) : undefined,
      details: details ? sanitizeValue(details) as Record<string, unknown> : undefined,
    };
    this.events.push(event);
    while (this.events.length > this.maxEvents) this.events.shift();
  }

  recordError(category: string, action: string, error: unknown, mapId?: string, force = true): void {
    this.record(category, action, mapId, errorDetails(error), 'error', force);
  }

  listEvents(): DiagnosticEvent[] {
    return JSON.parse(JSON.stringify(this.events)) as DiagnosticEvent[];
  }

  setEditorState(mapId: string, patch: Partial<Omit<DiagnosticEditorState, 'mapKey'>>): void {
    const mapKey = this.mapKey(mapId);
    const previous = this.editors.get(mapKey) ?? {
      mapKey,
      mounted: false,
      readonly: false,
      viewMode: 'map',
      selectedNodeCount: 0,
      nodeCount: 0,
      canvasWidth: 0,
      canvasHeight: 0,
      zoom: 1,
      saveState: 'unknown',
    };
    this.editors.set(mapKey, { ...previous, ...patch, mapKey });
  }

  removeEditorState(mapId: string): void {
    this.editors.delete(this.mapKey(mapId));
  }

  listEditorStates(): DiagnosticEditorState[] {
    return Array.from(this.editors.values()).map((state) => ({ ...state }));
  }

  attachGlobalErrorListeners(target: Window = window): void {
    if (this.globalCleanup) return;
    const onError = (event: ErrorEvent): void => {
      this.recordError('runtime', 'window-error', event.error ?? new Error(event.message), undefined, true);
    };
    const onRejection = (event: PromiseRejectionEvent): void => {
      this.recordError('runtime', 'unhandled-rejection', event.reason, undefined, true);
    };
    target.addEventListener('error', onError);
    target.addEventListener('unhandledrejection', onRejection);
    this.globalCleanup = () => {
      target.removeEventListener('error', onError);
      target.removeEventListener('unhandledrejection', onRejection);
      this.globalCleanup = null;
    };
  }

  detachGlobalErrorListeners(): void {
    this.globalCleanup?.();
  }
}
