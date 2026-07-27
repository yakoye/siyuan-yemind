import { YeMindEditor, type YeMindEditorOptions } from '../../src/editor/YeMindEditor';
import { PLUGIN_VERSION } from '../../src/plugin/constants';
import { confirm, showMessage } from './siyuanAdapter';
import {
  createBackup,
  downloadJson,
  exportMapFile,
  importMapFile,
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

const safeFilename = (value: string): string =>
  value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim() || '未命名导图';

export class YeMindWebApp {
  private editor: EditorHandle | null = null;
  private editorHost: HTMLElement | null = null;
  private mapList: HTMLElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private unsubscribe: (() => void) | null = null;
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
    window.removeEventListener('resize', this.onResize);
    this.root.removeEventListener('click', this.onClick);
    this.fileInput?.removeEventListener('change', this.onFileChange);
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
    });
    this.renderMapList();
  }

  private renderShell(): void {
    this.root.innerHTML = `
      <div class="ymw-app">
        <aside class="ymw-sidebar" aria-label="导图库">
          <header class="ymw-sidebar__header">
            <div class="ymw-brand"><img src="./icon.png" alt=""><span><strong>YeMind</strong><small>本地网页版 · v${PLUGIN_VERSION}</small></span></div>
            <button type="button" class="ymw-primary" data-web-action="new-map">＋ 新建</button>
          </header>
          <div class="ymw-map-list" data-web-map-list></div>
          <footer class="ymw-sidebar__footer">
            <button type="button" data-web-action="import">导入</button>
            <button type="button" data-web-action="export">导出</button>
            <button type="button" data-web-action="backup">备份</button>
            <button type="button" data-web-action="restore">恢复</button>
          </footer>
        </aside>
        <main class="ymw-editor" data-web-editor></main>
        <button type="button" class="ymw-sidebar-toggle" data-web-action="toggle-sidebar" aria-label="打开导图库">☰</button>
        <input type="file" data-web-file hidden accept=".json,.yemind,application/json">
      </div>
    `;
    this.editorHost = this.root.querySelector<HTMLElement>('[data-web-editor]');
    this.mapList = this.root.querySelector<HTMLElement>('[data-web-map-list]');
    this.fileInput = this.root.querySelector<HTMLInputElement>('[data-web-file]');
    this.root.addEventListener('click', this.onClick);
    this.fileInput?.addEventListener('change', this.onFileChange);
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
      if (action === 'export') this.exportActiveMap();
      if (action === 'backup') this.exportBackup();
      if (action === 'import' || action === 'restore') {
        if (this.fileInput) {
          this.fileInput.dataset.mode = action;
          this.fileInput.value = '';
          this.fileInput.click();
        }
      }
      if (action === 'toggle-sidebar') {
        this.root.querySelector('.ymw-app')?.classList.toggle('is-sidebar-open');
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '操作失败', 4000, 'error');
    }
  };

  private exportActiveMap(): void {
    const id = this.services.repository.getActiveMapId();
    const map = id ? this.services.repository.get(id) : undefined;
    if (!map) throw new Error('没有可导出的导图');
    downloadJson(`${safeFilename(map.title)}.yemind`, exportMapFile(map));
  }

  private exportBackup(): void {
    const backup = createBackup(
      this.services.repository.snapshot(),
      this.services.settingsStore.get(),
      { version: 1, checkpoints: this.services.checkpointRepository.listAll() },
    );
    downloadJson(`yemind-backup-${new Date().toISOString().slice(0, 10)}.json`, backup);
  }

  private readonly onFileChange = async (): Promise<void> => {
    const file = this.fileInput?.files?.[0];
    const mode = this.fileInput?.dataset.mode;
    if (!file || !mode) return;
    try {
      const value = JSON.parse(await file.text()) as unknown;
      if (mode === 'restore') {
        const accepted = await confirm('恢复备份', '恢复会替换当前网页版导图库，是否继续？');
        if (!accepted) return;
        await restoreBackup(this.services.store, value);
        window.location.reload();
        return;
      }
      const imported = importMapFile(value);
      const created = await this.services.repository.create(imported.title, imported.layout);
      await this.services.repository.update(created.id, {
        data: imported.data,
        layout: imported.layout,
        layoutPresetId: imported.layoutPresetId,
        theme: imported.theme,
        lineStyle: imported.lineStyle,
        projectStyle: imported.projectStyle,
        viewData: imported.viewData,
      });
      await this.mountMap(created.id);
      showMessage('导图已导入');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '文件读取失败', 5000, 'error');
    }
  };
}
