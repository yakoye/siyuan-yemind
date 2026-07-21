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
  showNodeMenuButton: boolean;
  defaultViewMode: ViewMode;
  shortcutMap: ShortcutMap;
}

interface SettingsStorage {
  load(): Promise<unknown>;
  save(value: YeMindSettings): Promise<void>;
}

type Listener = (settings: YeMindSettings) => void;

export const DEFAULT_SETTINGS: YeMindSettings = {
  defaultLayout: 'logicalStructure',
  canvasMode: 'pan',
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
  showNodeMenuButton: true,
  defaultViewMode: 'map',
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
    showNodeMenuButton: booleanOrDefault(value.showNodeMenuButton, DEFAULT_SETTINGS.showNodeMenuButton),
    defaultViewMode: VIEW_MODES.has(value.defaultViewMode as ViewMode) ? value.defaultViewMode as ViewMode : DEFAULT_SETTINGS.defaultViewMode,
    shortcutMap: normalizeShortcutMap(value.shortcutMap),
  };
}

export class SettingsStore {
  private state: YeMindSettings = { ...DEFAULT_SETTINGS };
  private readonly listeners = new Set<Listener>();

  constructor(private readonly storage: SettingsStorage) {}

  async load(): Promise<void> {
    const raw = await this.storage.load();
    this.state = raw && typeof raw === 'object'
      ? normalizeSettings(raw as Partial<YeMindSettings>)
      : { ...DEFAULT_SETTINGS };
    this.emit();
  }

  get(): YeMindSettings {
    return { ...this.state };
  }

  async update(patch: Partial<YeMindSettings>): Promise<void> {
    this.state = normalizeSettings({ ...this.state, ...patch });
    await this.storage.save(this.get());
    this.emit();
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
