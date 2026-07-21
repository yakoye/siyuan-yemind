import { Menu, Plugin, openTab, showMessage } from 'siyuan';
import { CheckpointService } from '../checkpoints/CheckpointService';
import { DiagnosticsService } from '../diagnostics/DiagnosticsService';
import { runIsolatedLifecycleProbe } from '../diagnostics/isolatedLifecycleProbe';
import { CheckpointRepository } from '../model/CheckpointRepository';
import { MapRepository } from '../model/MapRepository';
import type { CheckpointStorageDocument } from '../model/checkpointTypes';
import type { MapStorageDocument } from '../model/types';
import { confirmAction, promptText } from '../ui/dialogs';
import { openDiagnosticsDialog } from '../ui/diagnosticsDialog';
import { registerSettings } from '../settings/settings';
import { openYeMindSettingsDialog } from '../settings/settingsDialog';
import { SettingsStore } from '../settings/SettingsStore';
import { CHECKPOINT_STORAGE_NAME, DIAGNOSTIC_LIFECYCLE_CHECKPOINT_PREFIX, DIAGNOSTIC_LIFECYCLE_MAP_PREFIX, DIAGNOSTIC_PROBE_STORAGE_NAME, ICON_ID, MAP_STORAGE_NAME, PLUGIN_VERSION, SETTINGS_STORAGE_NAME, TAB_TYPE } from './constants';
import { registerYeMindDock } from './dock';
import type { YeMindPluginHost } from './host';
import { registerYeMindTab } from './tabs';
import { OpenMapTabRegistry } from './OpenMapTabRegistry';
import { parseYeMindMapUrl } from './pluginUrl';
import { runSafeOperation } from './operationSafety';
import { initializePluginStartup } from './pluginStartup';

export default class YeMindZenPlugin extends Plugin implements YeMindPluginHost {
  repository!: MapRepository;
  settingsStore!: SettingsStore;
  checkpointRepository!: CheckpointRepository;
  checkpointService!: CheckpointService;
  diagnostics!: DiagnosticsService;
  readonly tabRegistry = new OpenMapTabRegistry();
  private ready: Promise<void> = Promise.resolve();

  onload(): void {
    this.addIcons(`<symbol id="${ICON_ID}" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="7" fill="#176b50"/><text x="16" y="21" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">Ye</text></symbol>
      <symbol id="iconYeMindNote" viewBox="0 0 24 24"><path d="M6.5 3.75h8.8l3.2 3.2v13.3H6.5a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M15.2 3.9v3.4h3.2M8 11h7.5M8 14.5h7.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></symbol>
      <symbol id="iconYeMindComment" viewBox="0 0 24 24"><path d="M6.25 4.75h11.5A2.5 2.5 0 0 1 20.25 7.25v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.25 2.9v-2.9A2.5 2.5 0 0 1 3.75 15.25v-8a2.5 2.5 0 0 1 2.5-2.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>`);
    this.repository = new MapRepository({
      load: () => this.loadData(MAP_STORAGE_NAME),
      save: async (value: MapStorageDocument) => { await this.saveData(MAP_STORAGE_NAME, value); },
    });

    this.settingsStore = new SettingsStore({
      load: () => this.loadData(SETTINGS_STORAGE_NAME),
      save: async (value) => { await this.saveData(SETTINGS_STORAGE_NAME, value); },
    });

    this.checkpointRepository = new CheckpointRepository({
      load: () => this.loadData(CHECKPOINT_STORAGE_NAME),
      save: async (value: CheckpointStorageDocument) => { await this.saveData(CHECKPOINT_STORAGE_NAME, value); },
    });
    this.checkpointService = new CheckpointService(this.repository, this.checkpointRepository);
    this.diagnostics = new DiagnosticsService({
      pluginId: this.name,
      pluginVersion: PLUGIN_VERSION,
      maps: this.repository,
      checkpoints: this.checkpointRepository,
      settings: this.settingsStore,
      storageProbe: {
        run: async () => {
          const nonce = globalThis.crypto?.randomUUID?.() ?? `probe-${Date.now()}`;
          const value = { nonce, createdAt: Date.now() };
          let write = false;
          let read = false;
          let remove = false;
          try {
            await this.saveData(DIAGNOSTIC_PROBE_STORAGE_NAME, value);
            write = true;
            const loaded = await this.loadData(DIAGNOSTIC_PROBE_STORAGE_NAME) as { nonce?: string } | null;
            read = loaded?.nonce === nonce;
          } finally {
            try {
              await this.removeData(DIAGNOSTIC_PROBE_STORAGE_NAME);
              remove = true;
            } catch (error) {
              this.diagnostics?.recordError('storage', 'probe-remove-failed', error, undefined, true);
            }
          }
          return { write, read, remove };
        },
      },
      lifecycleProbe: {
        run: () => this.runDiagnosticLifecycleProbe(),
      },
    });
    this.diagnostics.start();
    this.diagnostics.attachGlobalListeners();
    this.diagnostics.record('plugin', 'onload', undefined, undefined, 'info', true);

    initializePluginStartup({
      startBootstrap: () => this.bootstrap(),
      publishReady: (ready) => { this.ready = ready; },
      registrations: [
        { name: 'tab', register: () => registerYeMindTab(this, this) },
        { name: 'dock', register: () => registerYeMindDock(this, this) },
        { name: 'settings', register: () => registerSettings(this, this.settingsStore) },
        { name: 'commands', register: () => this.registerCommands() },
        { name: 'plugin-url', register: () => this.eventBus.on('open-siyuan-url-plugin', this.onOpenPluginUrl) },
      ],
      onRegistrationStart: (name) => this.diagnostics.record('plugin', 'registration-started', undefined, { name }, 'info', true),
      onRegistrationComplete: (name) => this.diagnostics.record('plugin', 'registration-completed', undefined, { name }, 'info', true),
      onRegistrationError: (name, error) => {
        this.diagnostics.recordError('plugin', 'registration-failed', error, undefined, true);
        this.diagnostics.record('plugin', 'registration-failed-step', undefined, { name }, 'error', true);
        console.error(`[YeMind Zen] ${name} registration failed`, error);
      },
    });
  }



  onLayoutReady(): void {
    this.registerTopBar();
  }

  onunload(): void {
    this.eventBus.off('open-siyuan-url-plugin', this.onOpenPluginUrl);
    this.diagnostics?.record('plugin', 'unload', undefined, undefined, 'info', true);
    this.diagnostics?.detachGlobalListeners();
    this.diagnostics?.stop();
  }

  whenReady(): Promise<void> {
    return this.ready;
  }

  async openMap(mapId: string): Promise<void> {
    await runSafeOperation(async () => {
      await this.ready;
      this.diagnostics.record('operation', 'open-map-requested', mapId);
      const map = this.repository.get(mapId);
      if (!map) {
        showMessage('导图不存在或已被删除', 4000, 'error');
        return;
      }
      await this.repository.setActiveMap(mapId);
      if (this.tabRegistry.activate(mapId)) return;
      await openTab({
        app: this.app,
        custom: {
          id: `${this.name}${TAB_TYPE}`,
          icon: ICON_ID,
          title: map.title,
          data: { mapId },
        },
        openNewTab: true,
        keepCursor: false,
      });
    }, (error) => this.reportOperationFailure('打开导图', error));
  }

  async createMap(): Promise<void> {
    await runSafeOperation(async () => {
      await this.ready;
      const title = await promptText('新建导图', '未命名导图', '导图名称');
      if (!title) return;
      const settings = this.settingsStore.get();
      const map = await this.repository.create(title, settings.defaultLayout);
      this.diagnostics.record('operation', 'map-created', map.id, { layout: map.layout });
      await this.openMap(map.id);
    }, (error) => this.reportOperationFailure('新建导图', error));
  }

  async renameMap(mapId: string): Promise<void> {
    await runSafeOperation(async () => {
      await this.ready;
      const map = this.repository.get(mapId);
      if (!map) return;
      const title = await promptText('重命名导图', map.title, '导图名称');
      if (!title || title === map.title) return;
      await this.repository.rename(mapId, title);
      this.diagnostics.record('operation', 'map-renamed', mapId);
      this.tabRegistry.updateTitle(mapId, title);
    }, (error) => this.reportOperationFailure('重命名导图', error));
  }

  async deleteMap(mapId: string): Promise<void> {
    await runSafeOperation(async () => {
      await this.ready;
      const map = this.repository.get(mapId);
      if (!map) return;
      const confirmed = await confirmAction('删除导图', `确认删除“${map.title}”？删除后无法撤销。`, '删除');
      if (!confirmed) return;
      await this.repository.remove(mapId);
      this.diagnostics.record('operation', 'map-deleted', mapId);
      try {
        await this.checkpointRepository.removeForMap(mapId);
      } catch (error) {
        console.error('[YeMind Zen] checkpoint cleanup after map deletion failed', error);
      }
      this.tabRegistry.close(mapId);
    }, (error) => this.reportOperationFailure('删除导图', error));
  }

  async copyMapLink(mapId: string): Promise<void> {
    await this.ready;
    const link = `siyuan://plugins/${this.name}?map=${encodeURIComponent(mapId)}`;
    try {
      await navigator.clipboard.writeText(link);
      showMessage('导图链接已复制');
    } catch {
      showMessage(link, 8000);
    }
  }


  private async runDiagnosticLifecycleProbe(): Promise<{ create: boolean; update: boolean; checkpoint: boolean; restore: boolean; cleanup: boolean }> {
    const nonce = globalThis.crypto?.randomUUID?.() ?? `probe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mapStorageName = `${DIAGNOSTIC_LIFECYCLE_MAP_PREFIX}-${nonce}.json`;
    const checkpointStorageName = `${DIAGNOSTIC_LIFECYCLE_CHECKPOINT_PREFIX}-${nonce}.json`;
    const removeProbeData = async (): Promise<void> => {
      const failures: unknown[] = [];
      for (const name of [mapStorageName, checkpointStorageName]) {
        try {
          await this.removeData(name);
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length > 0) throw failures[0];
    };
    return runIsolatedLifecycleProbe({
      maps: {
        load: () => this.loadData(mapStorageName),
        save: async (value) => { await this.saveData(mapStorageName, value); },
      },
      checkpoints: {
        load: () => this.loadData(checkpointStorageName),
        save: async (value) => { await this.saveData(checkpointStorageName, value); },
      },
      cleanup: removeProbeData,
    }, this.settingsStore.get().defaultLayout);
  }

  private reportOperationFailure(action: string, error: unknown): void {
    this.diagnostics?.recordError('operation', `${action}-failed`, error, undefined, true);
    console.error(`[YeMind Zen] ${action} failed`, error);
    showMessage(`YeMind Zen ${action}失败，请稍后重试`, 5000, 'error');
  }

  private readonly onOpenPluginUrl = (event: CustomEvent<{ url: string }>): void => {
    const mapId = parseYeMindMapUrl(event.detail?.url ?? '', this.name);
    if (mapId) void this.openMap(mapId);
  };

  private async bootstrap(): Promise<void> {
    this.diagnostics.record('plugin', 'bootstrap-started', undefined, undefined, 'info', true);
    try {
      await Promise.all([this.repository.load(), this.settingsStore.load(), this.checkpointRepository.load()]);
      this.diagnostics.record('plugin', 'bootstrap-completed', undefined, { mapCount: this.repository.list().length, checkpointCount: this.checkpointRepository.listAll().length }, 'info', true);
    } catch (error) {
      this.diagnostics.recordError('plugin', 'bootstrap-failed', error, undefined, true);
      console.error('[YeMind Zen] failed to load storage', error);
      showMessage('YeMind Zen 数据加载失败', 6000, 'error');
    }
  }

  private registerTopBar(): void {
    this.addTopBar({
      icon: ICON_ID,
      title: 'YeMind Zen',
      position: 'right',
      callback: (event) => {
        void this.openTopBarMenu(event);
      },
    });
  }

  private async openTopBarMenu(event: MouseEvent): Promise<void> {
    await this.ready;
    const menu = new Menu('siyuan-yemind-zen-top-menu');
    menu.addItem({ icon: 'iconAdd', label: '新建导图', click: () => { void this.createMap(); } });
    const maps = this.repository.list();
    if (maps.length > 0) {
      menu.addSeparator();
      maps.slice(0, 12).forEach((map) => {
        menu.addItem({ icon: ICON_ID, label: map.title, click: () => { void this.openMap(map.id); } });
      });
    }
    menu.addSeparator();
    menu.addItem({ icon: 'iconSettings', label: '设置', click: () => openYeMindSettingsDialog(this.settingsStore) });
    menu.addItem({ icon: 'iconInfo', label: '诊断与回归', click: () => openDiagnosticsDialog(this.diagnostics) });
    menu.open({ x: event.clientX, y: event.clientY });
  }

  private registerCommands(): void {
    this.addCommand({
      langKey: 'newYeMindMap',
      langText: '新建 YeMind 导图',
      hotkey: '⌥⇧M',
      callback: () => { void this.createMap(); },
    });
    this.addCommand({
      langKey: 'openYeMindDiagnostics',
      langText: '打开 YeMind 诊断与回归',
      callback: () => openDiagnosticsDialog(this.diagnostics),
    });
    this.addCommand({
      langKey: 'openActiveYeMindMap',
      langText: '打开最近的 YeMind 导图',
      callback: () => {
        const id = this.repository.getActiveMapId() ?? this.repository.list()[0]?.id;
        if (id) void this.openMap(id);
        else void this.createMap();
      },
    });
  }
}
