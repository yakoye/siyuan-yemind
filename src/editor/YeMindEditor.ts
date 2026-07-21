import type MindMap from 'simple-mind-map';
import { Dialog, showMessage } from 'siyuan';
import { createMindMap } from '../core/createMindMap';
import { createCommandAdapter, type YeMindCommands } from '../core/commands';
import { configureNodeDecorations } from '../core/nodeDecorations';
import { configureMindMapPlugins } from '../core/registerPlugins';
import { MapRepository } from '../model/MapRepository';
import type { MindMapTree, YeMindMapDocument } from '../model/types';
import type { SettingsStore, YeMindSettings } from '../settings/SettingsStore';
import { openNodeContextMenu } from '../ui/contextMenu';
import { openCommentsDialog, openFormulaDialog, openTodoDialog } from '../ui/nodeContentDialogs';
import { openCodeBlockDialog, openInlineLinkDialog } from '../ui/richTextDialogs';
import { calculateEditorStats } from './editorStats';
import { createEditorTemplate } from './editorTemplate';
import { RichTextToolbar } from './RichTextToolbar';

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
  private repositoryUnsubscribe: (() => void) | null = null;
  private settingsUnsubscribe: (() => void) | null = null;
  private destroyed = false;
  private current: YeMindMapDocument;
  private settings: YeMindSettings;
  private rootEl!: HTMLElement;
  private canvasEl!: HTMLElement;
  private statsEl!: HTMLElement;
  private zoomEl!: HTMLElement;
  private saveStateEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private richTextToolbar: RichTextToolbar | null = null;
  private readonly onRootKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.rootEl?.dataset.zen === 'true') {
      event.preventDefault();
      this.toggleZen(false);
    }
  };

  constructor(private readonly options: YeMindEditorOptions) {
    const map = options.repository.get(options.mapId);
    if (!map) throw new Error(`Map not found: ${options.mapId}`);
    this.current = map;
    this.settings = options.settingsStore.get();
    this.mount();
  }

  resize(): void {
    this.map?.resize();
  }

  destroy(): void {
    this.destroyed = true;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.repositoryUnsubscribe?.();
    this.settingsUnsubscribe?.();
    this.richTextToolbar?.destroy();
    this.richTextToolbar = null;
    this.rootEl?.removeEventListener('keydown', this.onRootKeydown);
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
      settings: this.settings,
    });
    this.commands = createCommandAdapter(this.map);
    this.richTextToolbar = new RichTextToolbar(this.rootEl, this.commands, {
      onFormula: () => openFormulaDialog(this.commands!),
      onLink: () => openInlineLinkDialog(this.commands!, this.settings),
      onCodeBlock: () => openCodeBlockDialog(this.commands!, this.settings),
    });
    this.rootEl.addEventListener('keydown', this.onRootKeydown);

    this.bindToolbar();
    this.bindMapEvents();
    this.repositoryUnsubscribe = this.options.repository.subscribe((state) => {
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
    this.settingsUnsubscribe = this.options.settingsStore.subscribe((settings) => this.applySettings(settings));
    this.updateStats(this.current.data);
    this.updateZoom();
  }

  private bindToolbar(): void {
    this.rootEl.addEventListener('click', (event) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      if (anchor && this.rootEl.contains(anchor)) {
        this.openInlineLink(event, anchor.href || anchor.getAttribute('href') || '');
        return;
      }
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
    this.map.on('node_contextmenu', (event: MouseEvent, node: any) => {
      if (!this.commands) return;
      this.activateNode(node);
      openNodeContextMenu(event, this.commands, {
        onInlineLink: () => openInlineLinkDialog(this.commands!, this.settings),
        onCodeBlock: () => openCodeBlockDialog(this.commands!, this.settings),
      });
    });
    this.map.on('rich_text_selection_change', (
      hasRange: boolean,
      rectInfo: Record<string, number> | null,
      formatInfo: Record<string, unknown> | null,
    ) => {
      this.richTextToolbar?.update(hasRange, rectInfo as any, formatInfo);
    });
    this.map.on('yemind_todo_toggle', (node: any) => {
      if (!this.commands) return;
      this.activateNode(node);
      this.commands.toggleTodo();
    });
    this.map.on('yemind_badge_click', (type: 'todo' | 'comments', node: any) => {
      if (!this.commands) return;
      this.activateNode(node);
      if (type === 'todo') openTodoDialog(this.commands);
      if (type === 'comments') openCommentsDialog(this.commands);
    });
    this.map.on('node_active', (_node: unknown, list: unknown[]) => {
      this.rootEl.dataset.hasSelection = list.length > 0 ? 'true' : 'false';
    });
    this.map.on('scale', () => this.updateZoom());
  }

  private applySettings(settings: YeMindSettings): void {
    this.settings = settings;
    this.richTextToolbar?.setEnabled(settings.showRichTextToolbar);
    configureMindMapPlugins(settings);
    configureNodeDecorations({
      showTodoBadge: settings.showTodoBadge,
      showCommentBadge: settings.showCommentBadge,
    });
    this.rootEl.dataset.codeWrap = String(settings.codeBlockWrap);
    this.rootEl.dataset.codeLanguage = String(settings.codeBlockShowLanguage);
    this.rootEl.dataset.clozeMode = settings.clozeMode;
    this.rootEl.dataset.clozeHover = String(settings.clozeRevealOnHover);
    this.rootEl.style.setProperty('--ymz-code-tab-size', String(settings.codeBlockTabSize));
    this.rootEl.style.setProperty('--ymz-code-font-size', `${settings.codeBlockFontSize}px`);
    (this.map as any)?.updateConfig?.({
      useLeftKeySelectionRightKeyDrag: settings.canvasMode === 'select',
      mousewheelAction: settings.wheelMode === 'zoom' ? 'zoom' : 'move',
      disableMouseWheelZoom: settings.wheelMode === 'none',
      isShowCreateChildBtnIcon: settings.showQuickCreate,
    });
    (this.map as any)?.render?.();
  }

  private openInlineLink(event: Event, href: string): void {
    if (!href || href === 'about:blank') return;
    event.preventDefault();
    event.stopPropagation();
    if (href.toLowerCase().startsWith('siyuan://')) {
      window.location.href = href;
      return;
    }
    if (this.settings.externalLinkMode === 'current-window') window.location.href = href;
    else window.open(href, '_blank', 'noopener,noreferrer');
  }

  private activateNode(node: any): void {
    if (!this.map || !node) return;
    const renderer = (this.map as any).renderer;
    const activeList = Array.isArray(renderer?.activeNodeList) ? renderer.activeNodeList : [];
    if (activeList.includes(node)) return;
    renderer?.clearActiveNodeList?.();
    if (typeof node.active === 'function') node.active();
    else renderer?.addNodeToActiveList?.(node);
  }

  private scheduleSave(): void {
    if (this.destroyed) return;
    this.saveStateEl.textContent = '保存中…';
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.persist();
    }, this.settings.autosaveDelayMs);
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
    if (document.fullscreenElement) await document.exitFullscreen();
    else await this.rootEl.requestFullscreen();
  }

  private openHelp(): void {
    const dialog = new Dialog({
      title: 'YeMind Zen 快速操作',
      content: `<div class="b3-dialog__content ymz-help">
        <p><b>双击</b> 编辑节点</p>
        <p><b>Tab</b> 添加子节点，<b>Enter</b> 添加同级节点</p>
        <p><b>选中文字</b> 使用格式、行内链接、挖空、公式与代码工具</p>
        <p><b>右键节点</b> 打开节点内容、概要与关联线菜单</p>
      </div>`,
      width: '440px',
    });
    void dialog;
  }
}
