import type MindMap from 'simple-mind-map';
import { Dialog, showMessage } from 'siyuan';
import { createMindMap } from '../core/createMindMap';
import { createCommandAdapter, type YeMindCommands } from '../core/commands';
import { MapRepository } from '../model/MapRepository';
import type { MindMapTree, YeMindMapDocument } from '../model/types';
import { openNodeContextMenu } from '../ui/contextMenu';
import { calculateEditorStats } from './editorStats';
import { createEditorTemplate } from './editorTemplate';
import type { SettingsStore } from '../settings/SettingsStore';

export interface YeMindEditorOptions {
  container: HTMLElement;
  mapId: string;
  repository: MapRepository;
  settingsStore: SettingsStore;
  onMissing?: () => void;
}

export class YeMindEditor {
  private map: MindMap | null = null;
  private commands: YeMindCommands | null = null;
  private saveTimer: number | null = null;
  private unsubscribe: (() => void) | null = null;
  private destroyed = false;
  private current: YeMindMapDocument;
  private rootEl!: HTMLElement;
  private canvasEl!: HTMLElement;
  private statsEl!: HTMLElement;
  private zoomEl!: HTMLElement;
  private saveStateEl!: HTMLElement;
  private titleEl!: HTMLElement;

  constructor(private readonly options: YeMindEditorOptions) {
    const map = options.repository.get(options.mapId);
    if (!map) throw new Error(`Map not found: ${options.mapId}`);
    this.current = map;
    this.mount();
  }

  resize(): void {
    this.map?.resize();
  }

  destroy(): void {
    this.destroyed = true;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.unsubscribe?.();
    this.map?.destroy();
    this.map = null;
    this.options.container.innerHTML = '';
  }

  private mount(): void {
    this.options.container.innerHTML = createEditorTemplate(this.current.title);
    this.rootEl = this.options.container.querySelector('.ymz-editor') as HTMLElement;
    this.canvasEl = this.options.container.querySelector('[data-role="canvas"]') as HTMLElement;
    this.statsEl = this.options.container.querySelector('[data-role="stats"]') as HTMLElement;
    this.zoomEl = this.options.container.querySelector('[data-role="zoom"]') as HTMLElement;
    this.saveStateEl = this.options.container.querySelector('[data-role="save-state"]') as HTMLElement;
    this.titleEl = this.options.container.querySelector('[data-role="title"]') as HTMLElement;
    const layoutSelect = this.options.container.querySelector<HTMLSelectElement>('[data-action="layout"]');
    if (layoutSelect) layoutSelect.value = this.current.layout;

    this.map = createMindMap({
      el: this.canvasEl,
      data: this.current.data,
      viewData: this.current.viewData,
      theme: this.current.theme,
      layout: this.current.layout,
      settings: this.options.settingsStore.get(),
    });
    this.commands = createCommandAdapter(this.map);

    this.bindToolbar();
    this.bindMapEvents();
    this.unsubscribe = this.options.repository.subscribe((state) => {
      const next = state.maps.find((item) => item.id === this.current.id);
      if (!next) {
        this.options.onMissing?.();
        return;
      }
      if (next.title !== this.current.title) {
        this.current.title = next.title;
        this.titleEl.textContent = next.title;
        this.titleEl.title = next.title;
      }
    });
    this.updateStats(this.current.data);
    this.updateZoom();
  }

  private bindToolbar(): void {
    this.rootEl.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!button || !this.commands || !this.map) return;
      const action = button.dataset.action;
      switch (action) {
        case 'undo': this.commands.undo(); break;
        case 'redo': this.commands.redo(); break;
        case 'add-child': this.commands.addChild(); break;
        case 'add-sibling': this.commands.addSibling(); break;
        case 'remove': this.commands.remove(); break;
        case 'fit': this.commands.fit(); break;
        case 'reset': this.commands.resetZoom(); break;
        case 'zoom-in': this.commands.zoomIn(); break;
        case 'zoom-out': this.commands.zoomOut(); break;
        case 'readonly': this.toggleReadonly(button); break;
        case 'zen': this.toggleZen(true); break;
        case 'zen-exit': this.toggleZen(false); break;
        case 'fullscreen': void this.toggleFullscreen(); break;
        case 'help': this.openHelp(); break;
      }
    });

    this.rootEl.querySelector<HTMLSelectElement>('[data-action="layout"]')?.addEventListener('change', (event) => {
      if (!this.map) return;
      const layout = (event.target as HTMLSelectElement).value;
      this.map.setLayout(layout);
      this.current.layout = layout;
      this.scheduleSave();
    });
  }

  private bindMapEvents(): void {
    if (!this.map) return;
    this.map.on('data_change', (data: MindMapTree) => {
      this.current.data = data;
      this.updateStats(data);
      this.scheduleSave();
    });
    this.map.on('view_data_change', (viewData: Record<string, unknown>) => {
      this.current.viewData = viewData;
      this.updateZoom();
      this.scheduleSave();
    });
    this.map.on('node_contextmenu', (event: MouseEvent) => {
      if (this.commands) openNodeContextMenu(event, this.commands);
    });
    this.map.on('node_active', (_node: unknown, list: unknown[]) => {
      this.rootEl.dataset.hasSelection = list.length > 0 ? 'true' : 'false';
    });
    this.map.on('scale', () => this.updateZoom());
  }

  private scheduleSave(): void {
    if (this.destroyed) return;
    this.saveStateEl.textContent = '保存中…';
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.persist();
    }, 350);
  }

  private async persist(): Promise<void> {
    if (!this.map || this.destroyed) return;
    try {
      await this.options.repository.update(this.current.id, {
        data: this.map.getData(false) as MindMapTree,
        layout: this.map.getLayout(),
        theme: this.map.getTheme(),
        viewData: this.map.view.getTransformData(),
      });
      this.saveStateEl.textContent = '已保存';
    } catch (error) {
      console.error('[YeMind Zen] save failed', error);
      this.saveStateEl.textContent = '保存失败';
      showMessage('YeMind Zen 保存失败', 5000, 'error');
    }
  }

  private updateStats(data: MindMapTree): void {
    const stats = calculateEditorStats(data);
    this.statsEl.textContent = `roots ${stats.roots} · nodes ${stats.nodes} · words ${stats.words}`;
  }

  private updateZoom(): void {
    const scale = Number((this.map?.view as any)?.scale ?? 1);
    this.zoomEl.textContent = `${Math.round(scale * 100)}%`;
  }

  private toggleReadonly(button: HTMLElement): void {
    if (!this.map) return;
    const next = this.rootEl.dataset.readonly !== 'true';
    this.rootEl.dataset.readonly = String(next);
    button.classList.toggle('is-active', next);
    this.map.setMode(next ? 'readonly' : 'edit');
  }

  private toggleZen(enabled: boolean): void {
    this.rootEl.dataset.zen = String(enabled);
  }

  private async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await this.rootEl.requestFullscreen();
    }
  }

  private openHelp(): void {
    const dialog = new Dialog({
      title: 'YeMind Zen 快速操作',
      content: `<div class="b3-dialog__content ymz-help">
        <p><b>双击</b> 编辑节点</p>
        <p><b>Tab</b> 添加子节点，<b>Enter</b> 添加同级节点</p>
        <p><b>拖拽节点</b> 调整层级，<b>Ctrl/Cmd + 拖拽</b> 框选</p>
        <p><b>Backspace/Delete</b> 删除节点，<b>Ctrl/Cmd + Z</b> 撤销</p>
      </div>`,
      width: '420px',
    });
    void dialog;
  }
}
