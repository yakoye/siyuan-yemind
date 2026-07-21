export type YeMindLayout = 'logicalStructure' | 'logicalStructureLeft' | 'mindMap' | 'organizationStructure' | 'catalogOrganization';
export type CanvasMode = 'pan' | 'select';
export type WheelMode = 'zoom' | 'pan' | 'none';
export type ExternalLinkMode = 'new-window' | 'current-window';
export type ClozeMode = 'hidden' | 'blur';
export type ViewMode = 'map' | 'split' | 'outline';
export type ShortcutCommand = 'search' | 'toggleZen' | 'toggleReadonly' | 'undo' | 'redo' | 'fit' | 'reset' | 'addParent' | 'comments' | 'summary' | 'relation';
export type ShortcutMap = Record<ShortcutCommand, string>;

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  search: 'Ctrl+f / Cmd+f',
  toggleZen: 'Ctrl+Alt+z / Cmd+Alt+z',
  toggleReadonly: 'Ctrl+Alt+r / Cmd+Alt+r',
  undo: 'Ctrl+z / Cmd+z',
  redo: 'Ctrl+Shift+z / Cmd+Shift+z / Ctrl+y / Cmd+y',
  fit: 'Ctrl+0 / Cmd+0',
  reset: 'Ctrl+Alt+0 / Cmd+Alt+0',
  addParent: 'Alt+Enter',
  comments: 'Ctrl+Alt+m / Cmd+Alt+m',
  summary: 'Ctrl+Alt+g / Cmd+Alt+g',
  relation: 'Ctrl+Alt+l / Cmd+Alt+l',
};

export interface YeMindSettings {
  defaultLayout: YeMindLayout;
  canvasMode: CanvasMode;
  wheelMode: WheelMode;
  showQuickCreate: boolean;
  autoFitOnOpen: boolean;
  autosaveDelayMs: number;
  showRichTextToolbar: boolean;
  inlineLinkAutoHttps: boolean;
  externalLinkMode: ExternalLinkMode;
  defaultCodeLanguage: string;
  codeBlockWrap: boolean;
  codeBlockShowLanguage: boolean;
  codeBlockTabSize: 2 | 4;
  codeBlockFontSize: number;
  clozeMode: ClozeMode;
  clozeRevealOnHover: boolean;
  showTodoBadge: boolean;
  showCommentBadge: boolean;
  defaultZenMode: boolean;
  defaultReadonlyMode: boolean;
  defaultViewMode: ViewMode;
  splitOutlineRatio: number;
  dragEdgeAutoPan: boolean;
  restoreSavedView: boolean;
  limitMindMapInCanvas: boolean;
  minZoomRatio: number;
  maxZoomRatio: number;
  fitPadding: number;
  secondLevelMarginX: number;
  secondLevelMarginY: number;
  nodeMarginX: number;
  nodeMarginY: number;
  defaultSummaryText: string;
  defaultRelationText: string;
  relationAlwaysAboveNode: boolean;
  relationAdjustPoints: boolean;
  defaultOuterFrameText: string;
  outerFramePaddingX: number;
  outerFramePaddingY: number;
  shortcutMap: ShortcutMap;
}

interface SettingsStorage {
  load(): Promise<unknown>;
  save(value: YeMindSettings): Promise<void>;
}

type Listener = (settings: YeMindSettings) => void;

export const DEFAULT_SETTINGS: YeMindSettings = {
  defaultLayout: 'logicalStructure',
  canvasMode: 'select',
  wheelMode: 'pan',
  showQuickCreate: true,
  autoFitOnOpen: true,
  autosaveDelayMs: 350,
  showRichTextToolbar: true,
  inlineLinkAutoHttps: true,
  externalLinkMode: 'new-window',
  defaultCodeLanguage: 'plain',
  codeBlockWrap: false,
  codeBlockShowLanguage: true,
  codeBlockTabSize: 2,
  codeBlockFontSize: 13,
  clozeMode: 'hidden',
  clozeRevealOnHover: true,
  showTodoBadge: true,
  showCommentBadge: true,
  defaultZenMode: false,
  defaultReadonlyMode: false,
  defaultViewMode: 'map',
  splitOutlineRatio: 0.42,
  dragEdgeAutoPan: false,
  restoreSavedView: true,
  limitMindMapInCanvas: false,
  minZoomRatio: 20,
  maxZoomRatio: 400,
  fitPadding: 50,
  secondLevelMarginX: 100,
  secondLevelMarginY: 40,
  nodeMarginX: 50,
  nodeMarginY: 16,
  defaultSummaryText: '概要',
  defaultRelationText: '关联',
  relationAlwaysAboveNode: true,
  relationAdjustPoints: true,
  defaultOuterFrameText: '外框',
  outerFramePaddingX: 10,
  outerFramePaddingY: 10,
  shortcutMap: { ...DEFAULT_SHORTCUTS },
};

const LAYOUTS = new Set<YeMindLayout>(['logicalStructure', 'logicalStructureLeft', 'mindMap', 'organizationStructure', 'catalogOrganization']);
const CANVAS_MODES = new Set<CanvasMode>(['pan', 'select']);
const WHEEL_MODES = new Set<WheelMode>(['zoom', 'pan', 'none']);
const LINK_MODES = new Set<ExternalLinkMode>(['new-window', 'current-window']);
const CLOZE_MODES = new Set<ClozeMode>(['hidden', 'blur']);
const VIEW_MODES = new Set<ViewMode>(['map', 'split', 'outline']);
const SHORTCUT_COMMANDS = Object.keys(DEFAULT_SHORTCUTS) as ShortcutCommand[];

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

function numberClamped(value: unknown, fallback: number, min: number, max: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function integerClamped(value: unknown, fallback: number, min: number, max: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}


function normalizeShortcutMap(value: unknown): ShortcutMap {
  const source = value && typeof value === 'object' ? value as Partial<Record<ShortcutCommand, unknown>> : {};
  return SHORTCUT_COMMANDS.reduce((result, key) => {
    const current = source[key];
    result[key] = typeof current === 'string' ? current.trim() : DEFAULT_SHORTCUTS[key];
    return result;
  }, {} as ShortcutMap);
}

function normalizeSettings(value: Partial<YeMindSettings>): YeMindSettings {
  const tabSize = Number(value.codeBlockTabSize);
  const minZoomRatio = numberInRange(value.minZoomRatio, DEFAULT_SETTINGS.minZoomRatio, 5, 100);
  const maxZoomRatio = Math.max(minZoomRatio, numberInRange(value.maxZoomRatio, DEFAULT_SETTINGS.maxZoomRatio, 100, 1000));
  return {
    defaultLayout: LAYOUTS.has(value.defaultLayout as YeMindLayout) ? value.defaultLayout as YeMindLayout : DEFAULT_SETTINGS.defaultLayout,
    canvasMode: CANVAS_MODES.has(value.canvasMode as CanvasMode) ? value.canvasMode as CanvasMode : DEFAULT_SETTINGS.canvasMode,
    wheelMode: WHEEL_MODES.has(value.wheelMode as WheelMode) ? value.wheelMode as WheelMode : DEFAULT_SETTINGS.wheelMode,
    showQuickCreate: booleanOrDefault(value.showQuickCreate, DEFAULT_SETTINGS.showQuickCreate),
    autoFitOnOpen: booleanOrDefault(value.autoFitOnOpen, DEFAULT_SETTINGS.autoFitOnOpen),
    autosaveDelayMs: numberInRange(value.autosaveDelayMs, DEFAULT_SETTINGS.autosaveDelayMs, 100, 5000),
    showRichTextToolbar: booleanOrDefault(value.showRichTextToolbar, DEFAULT_SETTINGS.showRichTextToolbar),
    inlineLinkAutoHttps: booleanOrDefault(value.inlineLinkAutoHttps, DEFAULT_SETTINGS.inlineLinkAutoHttps),
    externalLinkMode: LINK_MODES.has(value.externalLinkMode as ExternalLinkMode) ? value.externalLinkMode as ExternalLinkMode : DEFAULT_SETTINGS.externalLinkMode,
    defaultCodeLanguage: stringOrDefault(value.defaultCodeLanguage, DEFAULT_SETTINGS.defaultCodeLanguage),
    codeBlockWrap: booleanOrDefault(value.codeBlockWrap, DEFAULT_SETTINGS.codeBlockWrap),
    codeBlockShowLanguage: booleanOrDefault(value.codeBlockShowLanguage, DEFAULT_SETTINGS.codeBlockShowLanguage),
    codeBlockTabSize: tabSize === 4 ? 4 : DEFAULT_SETTINGS.codeBlockTabSize,
    codeBlockFontSize: numberInRange(value.codeBlockFontSize, DEFAULT_SETTINGS.codeBlockFontSize, 10, 24),
    clozeMode: CLOZE_MODES.has(value.clozeMode as ClozeMode) ? value.clozeMode as ClozeMode : DEFAULT_SETTINGS.clozeMode,
    clozeRevealOnHover: booleanOrDefault(value.clozeRevealOnHover, DEFAULT_SETTINGS.clozeRevealOnHover),
    showTodoBadge: booleanOrDefault(value.showTodoBadge, DEFAULT_SETTINGS.showTodoBadge),
    showCommentBadge: booleanOrDefault(value.showCommentBadge, DEFAULT_SETTINGS.showCommentBadge),
    defaultZenMode: booleanOrDefault(value.defaultZenMode, DEFAULT_SETTINGS.defaultZenMode),
    defaultReadonlyMode: booleanOrDefault(value.defaultReadonlyMode, DEFAULT_SETTINGS.defaultReadonlyMode),
    defaultViewMode: VIEW_MODES.has(value.defaultViewMode as ViewMode) ? value.defaultViewMode as ViewMode : DEFAULT_SETTINGS.defaultViewMode,
    splitOutlineRatio: numberClamped(value.splitOutlineRatio, DEFAULT_SETTINGS.splitOutlineRatio, 0.25, 0.7),
    dragEdgeAutoPan: booleanOrDefault(value.dragEdgeAutoPan, DEFAULT_SETTINGS.dragEdgeAutoPan),
    restoreSavedView: booleanOrDefault(value.restoreSavedView, DEFAULT_SETTINGS.restoreSavedView),
    limitMindMapInCanvas: booleanOrDefault(value.limitMindMapInCanvas, DEFAULT_SETTINGS.limitMindMapInCanvas),
    minZoomRatio,
    maxZoomRatio,
    fitPadding: numberInRange(value.fitPadding, DEFAULT_SETTINGS.fitPadding, 0, 300),
    secondLevelMarginX: numberInRange(value.secondLevelMarginX, DEFAULT_SETTINGS.secondLevelMarginX, 20, 300),
    secondLevelMarginY: numberInRange(value.secondLevelMarginY, DEFAULT_SETTINGS.secondLevelMarginY, 0, 200),
    nodeMarginX: numberInRange(value.nodeMarginX, DEFAULT_SETTINGS.nodeMarginX, 10, 240),
    nodeMarginY: numberInRange(value.nodeMarginY, DEFAULT_SETTINGS.nodeMarginY, 0, 160),
    defaultSummaryText: stringOrDefault(value.defaultSummaryText, DEFAULT_SETTINGS.defaultSummaryText),
    defaultRelationText: stringOrDefault(value.defaultRelationText, DEFAULT_SETTINGS.defaultRelationText),
    relationAlwaysAboveNode: booleanOrDefault(value.relationAlwaysAboveNode, DEFAULT_SETTINGS.relationAlwaysAboveNode),
    relationAdjustPoints: booleanOrDefault(value.relationAdjustPoints, DEFAULT_SETTINGS.relationAdjustPoints),
    defaultOuterFrameText: stringOrDefault(value.defaultOuterFrameText, DEFAULT_SETTINGS.defaultOuterFrameText),
    outerFramePaddingX: integerClamped(value.outerFramePaddingX, DEFAULT_SETTINGS.outerFramePaddingX, 0, 80),
    outerFramePaddingY: integerClamped(value.outerFramePaddingY, DEFAULT_SETTINGS.outerFramePaddingY, 0, 80),
    shortcutMap: normalizeShortcutMap(value.shortcutMap),
  };
}

export class SettingsStore {
  private state: YeMindSettings = { ...DEFAULT_SETTINGS };
  private readonly listeners = new Set<Listener>();
  private updateQueue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: SettingsStorage) {}

  async load(): Promise<void> {
    const raw = await this.storage.load();
    this.state = raw && typeof raw === 'object'
      ? normalizeSettings(raw as Partial<YeMindSettings>)
      : { ...DEFAULT_SETTINGS };
    this.emit();
  }

  get(): YeMindSettings {
    return { ...this.state, shortcutMap: { ...this.state.shortcutMap } };
  }

  update(patch: Partial<YeMindSettings>): Promise<void> {
    const operation = this.updateQueue.then(async () => {
      const next = normalizeSettings({ ...this.state, ...patch });
      const snapshot = { ...next, shortcutMap: { ...next.shortcutMap } };
      await this.storage.save(snapshot);
      this.state = next;
      this.emit();
    });
    this.updateQueue = operation.catch(() => undefined);
    return operation;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.get());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const value = this.get();
    this.listeners.forEach((listener) => listener(value));
  }
}
