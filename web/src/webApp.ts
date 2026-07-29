import { YeMindEditor, type YeMindEditorOptions } from '../../src/editor/YeMindEditor';
import { RELEASE_INFO } from '../../src/releaseInfo';
import { AppearanceController } from '../../src/ui/AppearanceController';
import { confirm, showMessage } from './siyuanAdapter';
import {
  createBackup,
  downloadJson,
  restoreBackup,
} from './webFileTransfer';
import type { WebServices } from './webServices';

interface EditorHandle {
  destroy(): void;
  resize(): void;
}

interface WebAppOptions {
  createEditor?: (options: YeMindEditorOptions) => EditorHandle;
}

export class YeMindWebApp {
  private editor: EditorHandle | null = null;
  private editorHost: HTMLElement | null = null;
  private mapList: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;
  private appearanceUnsubscribe: (() => void) | null = null;
  private appearanceController: AppearanceController | null = null;
  private longPressTimer: number | null = null;
  private longPressStart: { x: number; y: number; target: HTMLElement } | null = null;
  private readonly createEditor: (options: YeMindEditorOptions) => EditorHandle;

  constructor(
    private readonly root: HTMLElement,
    private readonly services: WebServices,
    options: WebAppOptions = {},
  ) {
    this.createEditor = options.createEditor ?? ((editorOptions) => new YeMindEditor(editorOptions));
  }

  async start(): Promise<void> {
    await this.services.load();
    const getSystemDark = (): boolean => typeof matchMedia === 'function'
      && matchMedia('(prefers-color-scheme: dark)').matches;
    this.appearanceController = new AppearanceController({
      root: document.documentElement,
      getSystemDark,
      subscribeSystem: (listener) => {
        if (typeof matchMedia !== 'function') return () => undefined;
        const media = matchMedia('(prefers-color-scheme: dark)');
        const onChange = (event: MediaQueryListEvent): void => listener(event.matches);
        media.addEventListener?.('change', onChange);
        return () => media.removeEventListener?.('change', onChange);
      },
    });
    this.appearanceUnsubscribe = this.services.settingsStore.subscribe((settings) => {
      this.appearanceController?.setMode(settings.appearanceMode);
    });
    this.renderShell();
    this.unsubscribe = this.services.repository.subscribe(() => this.renderMapList());
    const active = this.services.repository.getActiveMapId()
      ?? this.services.repository.list()[0]?.id;
    if (active) await this.mountMap(active);
  }

  destroy(): void {
    this.editor?.destroy();
    this.editor = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.appearanceUnsubscribe?.();
    this.appearanceUnsubscribe = null;
    this.appearanceController?.destroy();
    this.appearanceController = null;
    window.removeEventListener('resize', this.onResize);
    this.root.removeEventListener('click', this.onClick);
    this.editorHost?.removeEventListener('pointerdown', this.onLongPressStart);
    this.editorHost?.removeEventListener('pointermove', this.onLongPressMove);
    this.editorHost?.removeEventListener('pointerup', this.cancelLongPress);
    this.editorHost?.removeEventListener('pointercancel', this.cancelLongPress);
    this.cancelLongPress();
    this.root.innerHTML = '';
  }

  async createMap(title = '未命名导图'): Promise<void> {
    const map = await this.services.repository.create(
      title,
      this.services.settingsStore.get().defaultLayout,
    );
    await this.mountMap(map.id);
  }

  async mountMap(mapId: string): Promise<void> {
    if (!this.editorHost) return;
    const map = this.services.repository.get(mapId);
    if (!map) return;
    this.editor?.destroy();
    this.editor = null;
    this.editorHost.innerHTML = '';
    await this.services.repository.setActiveMap(mapId);
    const basePath = new URL('./', document.baseURI).pathname.replace(/\/$/, '') || '.';
    this.editor = this.createEditor({
      container: this.editorHost,
      mapId,
      repository: this.services.repository,
      settingsStore: this.services.settingsStore,
      checkpointRepository: this.services.checkpointRepository,
      checkpointService: this.services.checkpointService,
      diagnostics: this.services.diagnostics,
      pluginBaseUrl: basePath,
      onTitleChange: () => this.renderMapList(),
      onMissing: () => this.renderMapList(),
      onImport: async (imported) => {
        const created = await this.services.repository.create(imported.title, imported.layout);
        try {
          await this.services.repository.update(created.id, {
            data: imported.data,
            layout: imported.layout,
            layoutPresetId: imported.layoutPresetId,
            theme: imported.theme,
            lineStyle: imported.lineStyle,
            projectStyle: imported.projectStyle,
            viewData: imported.viewData,
            studyCards: imported.studyCards,
          });
        } catch (error) {
          await this.services.repository.remove(created.id);
          throw error;
        }
        await this.mountMap(created.id);
      },
      onExportBackup: () => this.exportBackup(),
      onRestoreBackup: (file) => this.restoreFromBackup(file),
    });
    this.renderMapList();
  }

  private renderShell(): void {
    this.root.innerHTML = webShellTemplate();
    const version = this.root.querySelector<HTMLElement>('[data-web-version]');
    if (version) {
      version.textContent = `本地网页版 · ${RELEASE_INFO.sourceBuildLabel}`;
      version.title = `源码构建时间：${RELEASE_INFO.sourceBuildTime}`;
    }
    this.editorHost = this.root.querySelector<HTMLElement>('[data-web-editor]');
    this.mapList = this.root.querySelector<HTMLElement>('[data-web-map-list]');
    this.root.addEventListener('click', this.onClick);
    this.editorHost?.addEventListener('pointerdown', this.onLongPressStart);
    this.editorHost?.addEventListener('pointermove', this.onLongPressMove);
    this.editorHost?.addEventListener('pointerup', this.cancelLongPress);
    this.editorHost?.addEventListener('pointercancel', this.cancelLongPress);
    window.addEventListener('resize', this.onResize);
    this.renderMapList();
  }

  private renderMapList(): void {
    if (!this.mapList) return;
    const activeId = this.services.repository.getActiveMapId();
    this.mapList.innerHTML = '';
    for (const map of this.services.repository.list()) {
      const row = document.createElement('div');
      row.className = `ymw-map-row${map.id === activeId ? ' is-active' : ''}`;
      row.dataset.webMapId = map.id;
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'ymw-map-row__open';
      open.dataset.webAction = 'open-map';
      open.dataset.mapId = map.id;
      open.innerHTML = `<strong></strong><small>${new Date(map.updatedAt).toLocaleString()}</small>`;
      open.querySelector('strong')!.textContent = map.title;
      const rename = document.createElement('button');
      rename.type = 'button';
      rename.dataset.webAction = 'rename-map';
      rename.dataset.mapId = map.id;
      rename.title = '重命名';
      rename.textContent = '✎';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.webAction = 'delete-map';
      remove.dataset.mapId = map.id;
      remove.title = '删除';
      remove.textContent = '×';
      row.append(open, rename, remove);
      this.mapList.appendChild(row);
    }
  }

  private readonly onResize = (): void => this.editor?.resize();

  private readonly onLongPressStart = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch' || event.button !== 0) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (
      !target
      || target.closest('input,textarea,[contenteditable="true"],button,select')
      || !target.closest('.ymz-canvas,.ymz-outline-tree')
    ) return;
    this.cancelLongPress();
    this.longPressStart = { x: event.clientX, y: event.clientY, target };
    this.longPressTimer = window.setTimeout(() => {
      const start = this.longPressStart;
      this.longPressTimer = null;
      this.longPressStart = null;
      if (!start || !start.target.isConnected) return;
      start.target.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: start.x,
        clientY: start.y,
        button: 2,
      }));
    }, 560);
  };

  private readonly onLongPressMove = (event: PointerEvent): void => {
    const start = this.longPressStart;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10) return;
    this.cancelLongPress();
  };

  private readonly cancelLongPress = (): void => {
    if (this.longPressTimer !== null) window.clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
    this.longPressStart = null;
  };

  private readonly onClick = async (event: MouseEvent): Promise<void> => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-web-action]');
    if (!button) return;
    const action = button.dataset.webAction;
    const mapId = button.dataset.mapId;
    try {
      if (action === 'new-map') await this.createMap();
      if (action === 'open-map' && mapId) await this.mountMap(mapId);
      if (action === 'rename-map' && mapId) {
        const current = this.services.repository.get(mapId);
        const title = window.prompt('导图名称', current?.title ?? '');
        if (title?.trim()) await this.services.repository.rename(mapId, title);
      }
      if (action === 'delete-map' && mapId) {
        const current = this.services.repository.get(mapId);
        const accepted = await confirm('删除导图', `确定删除“${current?.title ?? '未命名导图'}”吗？`);
        if (accepted) {
          this.editor?.destroy();
          this.editor = null;
          await this.services.checkpointRepository.removeForMap(mapId);
          await this.services.repository.remove(mapId);
          if (this.services.repository.list().length === 0) await this.createMap();
          else {
            const active = this.services.repository.getActiveMapId()!;
            await this.mountMap(active);
          }
        }
      }
      if (action === 'toggle-sidebar') {
        this.root.querySelector('.ymw-app')?.classList.toggle('is-sidebar-open');
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '操作失败', 4000, 'error');
    }
  };

  private exportBackup(): void {
    const backup = createBackup(
      this.services.repository.snapshot(),
      this.services.settingsStore.get(),
      { version: 1, checkpoints: this.services.checkpointRepository.listAll() },
    );
    downloadJson(`yemind-backup-${new Date().toISOString().slice(0, 10)}.json`, backup);
  }

  private async restoreFromBackup(file: File): Promise<void> {
    const value = JSON.parse(await file.text()) as unknown;
    const accepted = await confirm(
      '恢复完整备份',
      '恢复会替换当前网页版全部导图、设置和检查点，是否继续？',
    );
    if (!accepted) return;
    await restoreBackup(this.services.store, value);
    window.location.reload();
  }
}

export function webShellTemplate(): string {
  return `
    <div class="ymw-app">
      <aside class="ymw-sidebar" aria-label="导图库">
        <header class="ymw-sidebar__header">
          <div class="ymw-brand"><img src="./icon.png" alt=""><span><strong>YeMind</strong><small data-web-version>本地网页版</small></span></div>
          <button type="button" class="ymw-primary" data-web-action="new-map">＋ 新建</button>
        </header>
        <div class="ymw-map-list" data-web-map-list></div>
      </aside>
      <main class="ymw-editor" data-web-editor></main>
      <button type="button" class="ymw-sidebar-toggle" data-web-action="toggle-sidebar" aria-label="打开导图库">☰</button>
    </div>
  `;
}
