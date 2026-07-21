export type YeMindLayout = 'logicalStructure' | 'logicalStructureLeft' | 'mindMap' | 'organizationStructure' | 'catalogOrganization';
export type CanvasMode = 'pan' | 'select';
export type WheelMode = 'zoom' | 'pan' | 'none';

export interface YeMindSettings {
  defaultLayout: YeMindLayout;
  canvasMode: CanvasMode;
  wheelMode: WheelMode;
  showQuickCreate: boolean;
  autoFitOnOpen: boolean;
}

interface SettingsStorage {
  load(): Promise<unknown>;
  save(value: YeMindSettings): Promise<void>;
}

type Listener = (settings: YeMindSettings) => void;

const DEFAULT_SETTINGS: YeMindSettings = {
  defaultLayout: 'logicalStructure',
  canvasMode: 'pan',
  wheelMode: 'pan',
  showQuickCreate: true,
  autoFitOnOpen: true,
};

const LAYOUTS = new Set<YeMindLayout>(['logicalStructure', 'logicalStructureLeft', 'mindMap', 'organizationStructure', 'catalogOrganization']);
const CANVAS_MODES = new Set<CanvasMode>(['pan', 'select']);
const WHEEL_MODES = new Set<WheelMode>(['zoom', 'pan', 'none']);

export class SettingsStore {
  private state: YeMindSettings = { ...DEFAULT_SETTINGS };
  private readonly listeners = new Set<Listener>();

  constructor(private readonly storage: SettingsStorage) {}

  async load(): Promise<void> {
    const raw = await this.storage.load();
    if (raw && typeof raw === 'object') {
      const value = raw as Partial<YeMindSettings>;
      this.state = {
        defaultLayout: LAYOUTS.has(value.defaultLayout as YeMindLayout) ? value.defaultLayout as YeMindLayout : DEFAULT_SETTINGS.defaultLayout,
        canvasMode: CANVAS_MODES.has(value.canvasMode as CanvasMode) ? value.canvasMode as CanvasMode : DEFAULT_SETTINGS.canvasMode,
        wheelMode: WHEEL_MODES.has(value.wheelMode as WheelMode) ? value.wheelMode as WheelMode : DEFAULT_SETTINGS.wheelMode,
        showQuickCreate: typeof value.showQuickCreate === 'boolean' ? value.showQuickCreate : DEFAULT_SETTINGS.showQuickCreate,
        autoFitOnOpen: typeof value.autoFitOnOpen === 'boolean' ? value.autoFitOnOpen : DEFAULT_SETTINGS.autoFitOnOpen,
      };
    }
    this.emit();
  }

  get(): YeMindSettings {
    return { ...this.state };
  }

  async update(patch: Partial<YeMindSettings>): Promise<void> {
    this.state = { ...this.state, ...patch };
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
