import { Menu, Plugin, openTab, showMessage } from 'siyuan';
import { MapRepository } from '../model/MapRepository';
import type { MapStorageDocument } from '../model/types';
import { confirmAction, promptText } from '../ui/dialogs';
import { registerSettings } from '../settings/settings';
import { openYeMindSettingsDialog } from '../settings/settingsDialog';
import { SettingsStore } from '../settings/SettingsStore';
import { ICON_ID, MAP_STORAGE_NAME, SETTINGS_STORAGE_NAME, TAB_TYPE } from './constants';
import { registerYeMindDock } from './dock';
import type { YeMindPluginHost } from './host';
import { registerYeMindTab } from './tabs';
import { OpenMapTabRegistry } from './OpenMapTabRegistry';
import { parseYeMindMapUrl } from './pluginUrl';

export default class YeMindZenPlugin extends Plugin implements YeMindPluginHost {
  repository!: MapRepository;
  settingsStore!: SettingsStore;
  readonly tabRegistry = new OpenMapTabRegistry();
  private ready: Promise<void> = Promise.resolve();

  onload(): void {
    this.addIcons(`<symbol id="${ICON_ID}" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="7" fill="#176b50"/><text x="16" y="21" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">Ye</text></symbol>`);
    this.repository = new MapRepository({
      load: () => this.loadData(MAP_STORAGE_NAME),
      save: async (value: MapStorageDocument) => { await this.saveData(MAP_STORAGE_NAME, value); },
    });

    this.settingsStore = new SettingsStore({
      load: () => this.loadData(SETTINGS_STORAGE_NAME),
      save: async (value) => { await this.saveData(SETTINGS_STORAGE_NAME, value); },
    });

    registerYeMindTab(this, this);
    registerYeMindDock(this, this);
    registerSettings(this, this.settingsStore);
    this.registerCommands();
    this.eventBus.on('open-siyuan-url-plugin', this.onOpenPluginUrl);
    this.ready = this.bootstrap();
  }



  onLayoutReady(): void {
    this.registerTopBar();
  }

  onunload(): void {
    this.eventBus.off('open-siyuan-url-plugin', this.onOpenPluginUrl);
  }

  async openMap(mapId: string): Promise<void> {
    await this.ready;
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
  }

  async createMap(): Promise<void> {
    await this.ready;
    const title = await promptText('新建导图', '未命名导图', '导图名称');
    if (!title) return;
    const map = await this.repository.create(title);
    const settings = this.settingsStore.get();
    await this.repository.update(map.id, { layout: settings.defaultLayout });
    await this.openMap(map.id);
  }

  async renameMap(mapId: string): Promise<void> {
    await this.ready;
    const map = this.repository.get(mapId);
    if (!map) return;
    const title = await promptText('重命名导图', map.title, '导图名称');
    if (!title || title === map.title) return;
    await this.repository.rename(mapId, title);
    this.tabRegistry.updateTitle(mapId, title);
  }

  async deleteMap(mapId: string): Promise<void> {
    await this.ready;
    const map = this.repository.get(mapId);
    if (!map) return;
    const confirmed = await confirmAction('删除导图', `确认删除“${map.title}”？删除后无法撤销。`, '删除');
    if (!confirmed) return;
    this.tabRegistry.close(mapId);
    await this.repository.remove(mapId);
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

  private readonly onOpenPluginUrl = (event: CustomEvent<{ url: string }>): void => {
    const mapId = parseYeMindMapUrl(event.detail?.url ?? '', this.name);
    if (mapId) void this.openMap(mapId);
  };

  private async bootstrap(): Promise<void> {
    try {
      await Promise.all([this.repository.load(), this.settingsStore.load()]);
    } catch (error) {
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
