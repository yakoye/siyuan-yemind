import type MindMap from 'simple-mind-map';
import { Dialog, showMessage } from 'siyuan';
import { createMindMap } from '../core/createMindMap';
import { buildDragAndLayoutOptions, normalizePersistedViewData, stripCustomPositions } from '../core/dragBehavior';
import { buildRelationOptions } from '../core/relationConfig';
import { buildOuterFrameOptions } from '../core/outerFrameConfig';
import { sanitizeAssociativeLines } from '../core/relationData';
import { createCommandAdapter, type YeMindCommands } from '../core/commands';
import { configureNodeDecorations } from '../core/nodeDecorations';
import { configureMindMapPlugins } from '../core/registerPlugins';
import { MapRepository } from '../model/MapRepository';
import type { MindMapTree, YeMindMapDocument } from '../model/types';
import type { SettingsStore, ShortcutCommand, ViewMode, YeMindSettings } from '../settings/SettingsStore';
import { openNodeContextMenu } from '../ui/contextMenu';
import { openCommentsDialog, openFormulaDialog, openLinkDialog } from '../ui/nodeContentDialogs';
import { openCodeBlockDialog, openInlineLinkDialog } from '../ui/richTextDialogs';
import { calculateEditorStats } from './editorStats';
import { createEditorTemplate } from './editorTemplate';
import { renderOutlineHtml } from './outline';
import { RichTextToolbar } from './RichTextToolbar';
import { isEditableTarget, matchesShortcut } from './shortcuts';
import { createSelectionPresentation, promoteNodeToPrimary, shouldBlockRootDeleteShortcut } from './selectionPresentation';
import { SaveRevisionTracker } from './saveRevision';
import { createRelationPresentation } from './relationPresentation';
import { createOuterFramePresentation, hexToRgba } from './outerFramePresentation';
import { createToolbarAvailability } from './toolbarAvailability';
import { resolveLinkNavigation } from './linkNavigation';

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
  private readonly saveRevisions = new SaveRevisionTracker();
  private repositoryUnsubscribe: (() => void) | null = null;
  private settingsUnsubscribe: (() => void) | null = null;
  private destroyed = false;
  private current: YeMindMapDocument;
  private settings: YeMindSettings;
  private rootEl!: HTMLElement;
  private canvasEl!: HTMLElement;
  private outlineEl!: HTMLElement;
  private statsEl!: HTMLElement;
  private zoomEl!: HTMLElement;
  private saveStateEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private searchPanelEl!: HTMLElement;
  private searchInputEl!: HTMLInputElement;
  private replaceInputEl!: HTMLInputElement;
  private searchInfoEl!: HTMLElement;
  private selectionCountEl!: HTMLElement;
  private relationPanelEl!: HTMLElement;
  private relationHintEl!: HTMLElement;
  private outerFramePanelEl!: HTMLElement;
  private outerFrameHintEl!: HTMLElement;
  private richTextToolbar: RichTextToolbar | null = null;
  private settingsInitialized = false;
  private viewMode: ViewMode = 'map';
  private searchText = '';

  private readonly onRootKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.commands?.isRelationCreating()) {
      event.preventDefault();
      event.stopPropagation();
      this.commands.cancelRelation();
      this.updateRelationPresentation();
      return;
    }
    if (event.key === 'Escape' && this.rootEl?.dataset.zen === 'true') {
      event.preventDefault();
      this.toggleZen(false);
      return;
    }
    if (!this.commands || isEditableTarget(event.target)) return;
    if (shouldBlockRootDeleteShortcut(event.key, this.commands.getActiveNodes())) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showMessage('根节点不能删除；请选择普通节点后再删除', 3000, 'info');
      return;
    }

    const actions: Array<[ShortcutCommand, () => void]> = [
      ['search', () => this.openSearchPanel()],
      ['toggleZen', () => this.toggleZen(this.rootEl.dataset.zen !== 'true')],
      ['toggleReadonly', () => this.setReadonly(this.rootEl.dataset.readonly !== 'true')],
      ['undo', () => this.commands?.undo()],
      ['redo', () => this.commands?.redo()],
      ['fit', () => this.commands?.fit()],
      ['reset', () => this.commands?.resetZoom()],
      ['addParent', () => this.commands?.addParent()],
      ['comments', () => { if (this.commands?.getPrimaryNode() && !this.commands.isReadonly()) openCommentsDialog(this.commands); }],
      ['summary', () => this.commands?.addSummary()],
      ['relation', () => this.beginRelation()],
    ];
    const action = actions.find(([key]) => matchesShortcut(event, this.settings.shortcutMap[key]));
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    action[1]();
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
    this.flushPendingSave();
    this.destroyed = true;
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
    this.outlineEl = this.options.container.querySelector('[data-role="outline"]') as HTMLElement;
    this.statsEl = this.options.container.querySelector('[data-role="stats"]') as HTMLElement;
    this.zoomEl = this.options.container.querySelector('[data-role="zoom"]') as HTMLElement;
    this.saveStateEl = this.options.container.querySelector('[data-role="save-state"]') as HTMLElement;
    this.titleEl = this.options.container.querySelector('[data-role="title"]') as HTMLElement;
    this.searchPanelEl = this.options.container.querySelector('[data-role="search-panel"]') as HTMLElement;
    this.searchInputEl = this.options.container.querySelector('[data-role="search-input"]') as HTMLInputElement;
    this.replaceInputEl = this.options.container.querySelector('[data-role="replace-input"]') as HTMLInputElement;
    this.searchInfoEl = this.options.container.querySelector('[data-role="search-info"]') as HTMLElement;
    this.selectionCountEl = this.options.container.querySelector('[data-role="selection-count"]') as HTMLElement;
    this.relationPanelEl = this.options.container.querySelector('[data-role="relation-panel"]') as HTMLElement;
    this.relationHintEl = this.options.container.querySelector('[data-role="relation-hint"]') as HTMLElement;
    this.outerFramePanelEl = this.options.container.querySelector('[data-role="outer-frame-panel"]') as HTMLElement;
    this.outerFrameHintEl = this.options.container.querySelector('[data-role="outer-frame-hint"]') as HTMLElement;
    const layoutSelect = this.options.container.querySelector<HTMLSelectElement>('[data-action="layout"]');
    if (layoutSelect) layoutSelect.value = this.current.layout;

    let runtimeData = this.current.data;
    const normalized = stripCustomPositions(runtimeData);
    const sanitized = sanitizeAssociativeLines(normalized.tree);
    runtimeData = sanitized.tree;
    if (normalized.changed || sanitized.changed) {
      this.current.data = runtimeData;
      void this.options.repository.update(this.current.id, { data: runtimeData }).catch((error) => {
        console.error('[YeMind Zen] migrated data save failed', error);
        showMessage('导图兼容数据保存失败，请勿立即关闭该标签', 5000, 'error');
      });
    }
    const runtimeViewData = this.settings.restoreSavedView
      ? normalizePersistedViewData(this.current.viewData)
      : undefined;
    if (this.current.viewData && !runtimeViewData) this.current.viewData = undefined;

    this.map = createMindMap({
      el: this.canvasEl,
      data: runtimeData,
      viewData: runtimeViewData,
      theme: this.current.theme,
      layout: this.current.layout,
      settings: this.settings,
      onHyperlink: (href) => this.openLink(href),
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
    this.renderOutline(this.current.data);
    this.updateZoom();
  }

  private bindToolbar(): void {
    this.rootEl.addEventListener('click', (event) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      if (anchor && this.rootEl.contains(anchor)) {
        event.preventDefault();
        event.stopPropagation();
        this.openLink(anchor.href || anchor.getAttribute('href') || '');
        return;
      }

      const outlineRow = (event.target as HTMLElement).closest<HTMLElement>('[data-outline-uid]');
      if (outlineRow && this.commands) {
        this.commands.goToNode(outlineRow.dataset.outlineUid ?? '');
        this.activateOutlineUid(outlineRow.dataset.outlineUid ?? '');
        return;
      }

      const searchButton = (event.target as HTMLElement).closest<HTMLElement>('[data-search-action]');
      if (searchButton) {
        this.handleSearchAction(searchButton.dataset.searchAction ?? '');
        return;
      }

      const relationButton = (event.target as HTMLElement).closest<HTMLElement>('[data-relation-action]');
      if (relationButton && this.commands) {
        const relationAction = relationButton.dataset.relationAction;
        if (relationAction === 'edit' && !this.commands.isReadonly()) this.commands.editActiveRelationText();
        if (relationAction === 'delete' && !this.commands.isReadonly()) this.commands.removeActiveRelation();
        if (relationAction === 'cancel') this.commands.cancelRelation();
        this.updateRelationPresentation();
        return;
      }

      const outerFrameButton = (event.target as HTMLElement).closest<HTMLElement>('[data-outer-frame-action]');
      if (outerFrameButton && this.commands) {
        const outerFrameAction = outerFrameButton.dataset.outerFrameAction;
        if (outerFrameAction === 'edit' && !this.commands.isReadonly()) {
          this.commands.editActiveOuterFrameText();
          this.updateOuterFramePresentation();
        }
        if (outerFrameAction === 'delete' && !this.commands.isReadonly()) {
          this.commands.removeActiveOuterFrame();
          this.hideOuterFramePresentation();
        }
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
        case 'reset-layout': this.commands.resetLayout(); break;
        case 'toggle-selection-mode': void this.toggleSelectionMode(); break;
        case 'zoom-in': this.commands.zoomIn(); break;
        case 'zoom-out': this.commands.zoomOut(); break;
        case 'view-map': this.setViewMode('map'); break;
        case 'view-split': this.setViewMode('split'); break;
        case 'view-outline': this.setViewMode('outline'); break;
        case 'open-search': this.openSearchPanel(); break;
        case 'readonly': this.setReadonly(this.rootEl.dataset.readonly !== 'true'); break;
        case 'zen': this.toggleZen(true); break;
        case 'zen-exit': this.toggleZen(false); break;
        case 'fullscreen': void this.toggleFullscreen(); break;
        case 'help': this.openHelp(); break;
      }
    });

    this.rootEl.addEventListener('change', (event) => {
      const control = (event.target as HTMLElement).closest<HTMLInputElement | HTMLSelectElement>('[data-outer-frame-setting]');
      if (!control || !this.commands || this.commands.isReadonly()) return;
      const key = control.dataset.outerFrameSetting;
      if (!key) return;
      const rawValue = control.value;
      const value = key === 'fill' ? hexToRgba(rawValue) : rawValue;
      this.commands.updateActiveOuterFrame({ [key]: value });
      this.updateOuterFramePresentation();
    });

    this.searchInputEl.addEventListener('input', () => {
      if (!this.searchInputEl.value.trim()) {
        this.commands?.endSearch();
        this.searchText = '';
        this.updateSearchInfo({ currentIndex: -1, total: 0 });
      } else if (this.searchInputEl.value.trim() !== this.searchText) {
        this.searchInfoEl.textContent = '按 Enter 搜索';
      }
    });
    this.searchInputEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.performSearch(event.shiftKey ? 'previous' : 'next');
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.closeSearchPanel();
      }
    });
    this.replaceInputEl.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      this.replaceCurrentSearch();
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
      this.renderOutline(data);
      this.scheduleSave();
    });
    this.map.on('view_data_change', (viewData: Record<string, unknown>) => {
      this.updateZoom();
      const normalized = normalizePersistedViewData(viewData);
      if (!normalized) return;
      this.current.viewData = normalized;
      this.scheduleSave();
    });
    this.map.on('node_contextmenu', (event: MouseEvent, node: any) => {
      if (!this.commands) return;
      this.activateNode(node);
      this.openContextMenu(event);
    });
    this.map.on('yemind_node_menu', (event: MouseEvent, node: any) => {
      if (!this.commands) return;
      this.activateNode(node);
      this.openContextMenu(event);
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
      if (this.commands.isReadonly()) {
        showMessage('只读模式下不能修改待办', 2500, 'info');
        return;
      }
      this.commands.toggleTodo();
    });
    this.map.on('yemind_badge_click', (type: 'todo' | 'comments', node: any) => {
      if (!this.commands) return;
      this.activateNode(node);
      if (type === 'todo') {
        if (this.commands.isReadonly()) {
          showMessage('只读模式下不能修改待办', 2500, 'info');
          return;
        }
        this.commands.toggleTodo();
      }
      if (type === 'comments') openCommentsDialog(this.commands, { readonly: this.commands.isReadonly() });
    });
    this.map.on('node_active', (node: any, list: any[]) => {
      this.rootEl.dataset.hasSelection = list.length > 0 ? 'true' : 'false';
      this.updateSelectionPresentation(list.length);
      this.updateToolbarAvailability();
      const active = node ?? list[0];
      const uid = active?.getData?.('uid');
      this.activateOutlineUid(uid ? String(uid) : '');
    });
    this.map.on('associative_line_click', () => this.updateRelationPresentation());
    this.map.on('associative_line_deactivate', () => this.updateRelationPresentation());
    this.map.on('outer_frame_active', () => this.updateOuterFramePresentation());
    this.map.on('outer_frame_deactivate', () => this.hideOuterFramePresentation());
    this.map.on('outer_frame_delete', () => this.hideOuterFramePresentation());
    this.map.on('node_click', () => window.setTimeout(() => this.updateRelationPresentation(), 0));
    this.map.on('draw_click', () => window.setTimeout(() => this.updateRelationPresentation(), 0));
    this.map.on('search_info_change', (info: { currentIndex: number; total: number }) => this.updateSearchInfo(info));
    this.map.on('scale', () => this.updateZoom());
  }

  private openContextMenu(event: MouseEvent): void {
    if (!this.commands) return;
    openNodeContextMenu(event, this.commands, {
      onInlineLink: () => openInlineLinkDialog(this.commands!, this.settings),
      onCodeBlock: () => openCodeBlockDialog(this.commands!, this.settings),
      onNodeLink: () => openLinkDialog(this.commands!, this.settings.inlineLinkAutoHttps),
      onRelation: () => this.beginRelation(),
    });
  }

  private beginRelation(): void {
    if (!this.commands) return;
    this.commands.startRelation();
    this.updateRelationPresentation();
  }

  private updateRelationPresentation(): void {
    if (!this.commands || !this.relationPanelEl || !this.relationHintEl) return;
    const presentation = createRelationPresentation({
      isCreating: this.commands.isRelationCreating(),
      isActive: this.commands.hasActiveRelation(),
    });
    this.relationPanelEl.hidden = presentation.hidden;
    this.relationPanelEl.dataset.mode = presentation.mode;
    this.relationHintEl.textContent = presentation.hint;
    this.relationPanelEl.querySelectorAll<HTMLElement>('[data-relation-action]').forEach((button) => {
      const action = button.dataset.relationAction;
      button.hidden = presentation.mode === 'creating' ? action !== 'cancel' : presentation.mode === 'active' ? action === 'cancel' : true;
    });
  }

  private updateOuterFramePresentation(): void {
    if (!this.commands || !this.outerFramePanelEl || !this.outerFrameHintEl) return;
    const presentation = createOuterFramePresentation({
      activeStyle: this.commands.getActiveOuterFrameStyle(),
      readonly: this.commands.isReadonly(),
    });
    this.outerFramePanelEl.hidden = presentation.hidden;
    this.outerFramePanelEl.dataset.readonly = String(presentation.readonly);
    this.outerFrameHintEl.textContent = presentation.hint;
    const values: Record<string, string> = {
      strokeColor: presentation.strokeColor,
      fill: presentation.fill,
      strokeDasharray: presentation.strokeDasharray,
      textAlign: presentation.textAlign,
    };
    this.outerFramePanelEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-outer-frame-setting]').forEach((control) => {
      const key = control.dataset.outerFrameSetting ?? '';
      if (values[key]) control.value = values[key];
      control.disabled = presentation.readonly;
    });
    this.outerFramePanelEl.querySelectorAll<HTMLButtonElement>('[data-outer-frame-action]').forEach((button) => {
      button.hidden = presentation.readonly;
      button.disabled = presentation.readonly;
    });
  }

  private hideOuterFramePresentation(): void {
    if (this.outerFramePanelEl) this.outerFramePanelEl.hidden = true;
  }

  private applySettings(settings: YeMindSettings): void {
    const firstApply = !this.settingsInitialized;
    this.settings = settings;
    this.richTextToolbar?.setEnabled(settings.showRichTextToolbar && this.rootEl.dataset.readonly !== 'true');
    configureMindMapPlugins(settings);
    configureNodeDecorations({
      showTodoBadge: settings.showTodoBadge,
      showCommentBadge: settings.showCommentBadge,
      showNodeMenuButton: settings.showNodeMenuButton,
    });
    this.rootEl.dataset.codeWrap = String(settings.codeBlockWrap);
    this.rootEl.dataset.codeLanguage = String(settings.codeBlockShowLanguage);
    this.rootEl.dataset.clozeMode = settings.clozeMode;
    this.rootEl.dataset.clozeHover = String(settings.clozeRevealOnHover);
    this.rootEl.dataset.nodeMenuButton = String(settings.showNodeMenuButton);
    this.rootEl.style.setProperty('--ymz-code-tab-size', String(settings.codeBlockTabSize));
    this.rootEl.style.setProperty('--ymz-code-font-size', `${settings.codeBlockFontSize}px`);
    const behavior = buildDragAndLayoutOptions(settings);
    const relationOptions = buildRelationOptions(settings);
    const outerFrameOptions = buildOuterFrameOptions(settings);
    this.map?.updateConfig({
      useLeftKeySelectionRightKeyDrag: settings.canvasMode === 'select',
      mousewheelAction: settings.wheelMode === 'zoom' ? 'zoom' : 'move',
      disableMouseWheelZoom: settings.wheelMode === 'none',
      isShowCreateChildBtnIcon: settings.showQuickCreate,
      autoMoveWhenMouseInEdgeOnDrag: behavior.autoMoveWhenMouseInEdgeOnDrag,
      isLimitMindMapInCanvas: behavior.isLimitMindMapInCanvas,
      minZoomRatio: behavior.minZoomRatio,
      maxZoomRatio: behavior.maxZoomRatio,
      fitPadding: behavior.fitPadding,
      ...relationOptions,
      ...outerFrameOptions,
    });
    this.map?.setThemeConfig(behavior.themeConfig);
    (this.map as any)?.associativeLine?.renderAllLines?.();
    (this.map as any)?.outerFrame?.renderOuterFrames?.();
    this.updateRelationPresentation();
    this.updateOuterFramePresentation();
    this.updateSelectionPresentation();

    if (firstApply) {
      this.settingsInitialized = true;
      this.setViewMode(settings.defaultViewMode);
      this.setReadonly(settings.defaultReadonlyMode);
      this.toggleZen(settings.defaultZenMode);
    }
  }

  private async toggleSelectionMode(): Promise<void> {
    const nextMode = this.settings.canvasMode === 'select' ? 'pan' : 'select';
    try {
      await this.options.settingsStore.update({ canvasMode: nextMode });
    } catch (error) {
      console.error('[YeMind Zen] canvas mode save failed', error);
      showMessage('画布操作模式保存失败，已保持原设置', 4000, 'error');
    }
  }

  private updateToolbarAvailability(): void {
    if (!this.commands || !this.rootEl) return;
    const nodes = this.commands.getActiveNodes();
    const primary = nodes[0];
    const state = createToolbarAvailability({
      readonly: this.commands.isReadonly(),
      selectedCount: nodes.length,
      primaryIsRoot: Boolean(primary?.isRoot),
      primaryIsGeneralization: Boolean(primary?.isGeneralization),
      hasRemovableSelection: nodes.some((node) => !node?.isRoot),
    });
    const actionState: Record<string, boolean> = {
      undo: state.undo,
      redo: state.redo,
      'add-child': state.addChild,
      'add-sibling': state.addSibling,
      remove: state.remove,
      'reset-layout': state.resetLayout,
    };
    this.rootEl.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((button) => {
      const action = button.dataset.action ?? '';
      if (Object.prototype.hasOwnProperty.call(actionState, action)) button.disabled = !actionState[action];
    });
    const layout = this.rootEl.querySelector<HTMLSelectElement>('[data-action="layout"]');
    if (layout) layout.disabled = !state.layout;
  }

  private updateSelectionPresentation(count?: number): void {
    const activeList = Array.isArray((this.map as any)?.renderer?.activeNodeList)
      ? (this.map as any).renderer.activeNodeList
      : [];
    const presentation = createSelectionPresentation(count ?? activeList.length, this.settings.canvasMode);
    this.rootEl.dataset.selectionMode = this.settings.canvasMode;
    this.rootEl.dataset.multiSelection = String(presentation.isMultiple);
    this.selectionCountEl.textContent = presentation.countText;
    this.selectionCountEl.hidden = !presentation.isMultiple;
    this.rootEl.querySelectorAll<HTMLElement>('[data-action="toggle-selection-mode"]').forEach((button) => {
      button.classList.toggle('is-active', this.settings.canvasMode === 'select');
      button.title = presentation.modeTitle;
      button.setAttribute('aria-label', presentation.modeTitle);
      button.setAttribute('aria-pressed', String(this.settings.canvasMode === 'select'));
    });
  }

  private setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.rootEl.dataset.view = mode;
    this.rootEl.querySelectorAll<HTMLElement>('[data-action^="view-"]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.action === `view-${mode}`);
    });
    window.requestAnimationFrame(() => this.map?.resize());
  }

  private renderOutline(data: MindMapTree): void {
    this.outlineEl.innerHTML = renderOutlineHtml(data);
  }

  private activateOutlineUid(uid: string): void {
    this.outlineEl.querySelectorAll<HTMLElement>('[data-outline-uid]').forEach((row) => {
      row.classList.toggle('is-active', Boolean(uid) && row.dataset.outlineUid === uid);
    });
  }

  private openSearchPanel(): void {
    this.searchPanelEl.hidden = false;
    this.searchInputEl.focus();
    this.searchInputEl.select();
  }

  private closeSearchPanel(): void {
    this.commands?.endSearch();
    this.searchText = '';
    this.searchPanelEl.hidden = true;
    this.updateSearchInfo({ currentIndex: -1, total: 0 });
    this.canvasEl.focus();
  }

  private handleSearchAction(action: string): void {
    if (action === 'next') this.performSearch('next');
    else if (action === 'previous') this.performSearch('previous');
    else if (action === 'replace') this.replaceCurrentSearch();
    else if (action === 'replace-all') this.replaceAllSearch();
    else if (action === 'close') this.closeSearchPanel();
  }

  private ensureSearch(): boolean {
    const text = this.searchInputEl.value.trim();
    if (!text || !this.commands) return false;
    if (this.searchText !== text) {
      this.searchText = text;
      this.commands.search(text);
    }
    return true;
  }

  private performSearch(direction: 'next' | 'previous'): void {
    if (!this.commands) return;
    const previousText = this.searchText;
    if (!this.ensureSearch()) return;
    if (previousText !== this.searchText) return;
    if (direction === 'previous') this.commands.searchPrevious();
    else this.commands.searchNext();
  }

  private replaceCurrentSearch(): void {
    if (!this.ensureSearch()) return;
    this.commands?.replaceSearch(this.replaceInputEl.value);
  }

  private replaceAllSearch(): void {
    if (!this.ensureSearch()) return;
    this.commands?.replaceSearchAll(this.replaceInputEl.value);
  }

  private updateSearchInfo(info: { currentIndex: number; total: number }): void {
    const current = info.total > 0 && info.currentIndex >= 0 ? info.currentIndex + 1 : 0;
    this.searchInfoEl.textContent = `${current} / ${Math.max(0, info.total)}`;
  }

  private openLink(href: string): void {
    if (!href || href === 'about:blank') return;
    const navigation = resolveLinkNavigation(href, this.settings.externalLinkMode);
    if (!navigation) {
      showMessage('链接地址无效或协议不受支持', 3000, 'error');
      return;
    }
    if (navigation.target === 'siyuan' || navigation.target === 'current-window') {
      window.location.href = navigation.href;
      return;
    }
    window.open(navigation.href, '_blank', 'noopener,noreferrer');
  }

  private activateNode(node: any): void {
    if (!this.map || !node) return;
    const renderer = (this.map as any).renderer;
    const activeList = Array.isArray(renderer?.activeNodeList) ? renderer.activeNodeList : [];
    if (activeList.includes(node)) {
      promoteNodeToPrimary(renderer, node);
      return;
    }
    renderer?.clearActiveNodeList?.();
    if (typeof node.active === 'function') node.active();
    else renderer?.addNodeToActiveList?.(node);
  }

  private scheduleSave(): void {
    if (this.destroyed) return;
    const revision = this.saveRevisions.markChanged();
    this.saveStateEl.textContent = '保存中…';
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.persist(revision);
    }, this.settings.autosaveDelayMs);
  }

  private flushPendingSave(): void {
    if (!this.map || this.destroyed || !this.saveRevisions.isDirty()) return;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    void this.persist(this.saveRevisions.current());
  }

  private async persist(revision: number): Promise<void> {
    if (!this.map || this.destroyed) return;
    try {
      const sanitized = sanitizeAssociativeLines(this.map.getData(false) as MindMapTree);
      const patch = {
        data: sanitized.tree,
        layout: this.map.getLayout(),
        theme: this.map.getTheme(),
        viewData: normalizePersistedViewData(this.map.view.getTransformData()),
      };
      this.current.data = sanitized.tree;
      await this.options.repository.update(this.current.id, patch);
      if (!this.destroyed && this.saveRevisions.markSaved(revision)) {
        this.saveStateEl.textContent = '已保存';
      }
    } catch (error) {
      console.error('[YeMind Zen] save failed', error);
      if (!this.destroyed && revision === this.saveRevisions.current()) {
        this.saveStateEl.textContent = '保存失败';
        showMessage('YeMind Zen 保存失败', 5000, 'error');
      }
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

  private setReadonly(enabled: boolean): void {
    if (!this.map) return;
    this.rootEl.dataset.readonly = String(enabled);
    this.rootEl.querySelectorAll<HTMLElement>('[data-action="readonly"]').forEach((button) => {
      button.classList.toggle('is-active', enabled);
      button.setAttribute('aria-pressed', String(enabled));
    });
    this.replaceInputEl.disabled = enabled;
    this.rootEl.querySelectorAll<HTMLButtonElement>('[data-search-action="replace"], [data-search-action="replace-all"]').forEach((button) => {
      button.disabled = enabled;
    });
    this.relationPanelEl.querySelectorAll<HTMLButtonElement>('[data-relation-action="edit"], [data-relation-action="delete"]').forEach((button) => {
      button.disabled = enabled;
    });
    if (enabled && this.commands?.isRelationCreating()) this.commands.cancelRelation();
    this.richTextToolbar?.setEnabled(this.settings.showRichTextToolbar && !enabled);
    this.map.setMode(enabled ? 'readonly' : 'edit');
    this.updateToolbarAvailability();
    this.updateRelationPresentation();
    this.updateOuterFramePresentation();
  }

  private toggleZen(enabled: boolean): void {
    this.rootEl.dataset.zen = String(enabled);
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.rootEl.requestFullscreen();
    } catch (error) {
      console.error('[YeMind Zen] fullscreen failed', error);
      showMessage('当前环境无法切换全屏', 3000, 'error');
    }
  }

  private openHelp(): void {
    const dialog = new Dialog({
      title: 'YeMind Zen 快速操作',
      content: `<div class="b3-dialog__content ymz-help">
        <p><b>双击</b> 编辑节点</p>
        <p><b>Tab</b> 添加子节点，<b>Enter</b> 添加同级节点</p>
        <p><b>选中文字</b> 使用格式、行内链接、挖空、公式与代码工具</p>
        <p><b>右键节点</b> 直接切换待办，打开批注、概要、外框与关联线</p>
        <p><b>平移优先</b>：平移优先：左键拖动画布，Ctrl/Cmd + 左键框选</p>
        <p><b>选择优先</b>：选择优先：左键框选，右键拖动画布</p>
        <p><b>Ctrl/Cmd + 单击</b>：Ctrl/Cmd + 单击：增减节点选择</p>
        <p><b>批量移动</b>：拖动任一已选节点：批量移动最上层所选子树</p>
        <p><b>Ctrl/Cmd + F</b> 搜索节点，顶部可切换导图、分屏和大纲</p>
      </div>`,
      width: '460px',
    });
    void dialog;
  }
}
