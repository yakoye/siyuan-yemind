import type MindMap from "simple-mind-map";
import { Dialog, Menu, showMessage } from "siyuan";
import { createMindMap } from "../core/createMindMap";
import {
  buildDragAndLayoutOptions,
  normalizePersistedViewData,
  stripCustomPositions,
} from "../core/dragBehavior";
import {
  buildThemeConfig,
  detectAppearance,
  normalizeLineStyle,
  normalizeThemePresetId,
  type YeMindAppearance,
} from "../core/themePresets";
import { buildRelationOptions } from "../core/relationConfig";
import { buildOuterFrameOptions } from "../core/outerFrameConfig";
import { sanitizeAssociativeLines } from "../core/relationData";
import { createCommandAdapter, type YeMindCommands } from "../core/commands";
import { configureNodeDecorations } from "../core/nodeDecorations";
import { configureMindMapPlugins } from "../core/registerPlugins";
import type { CheckpointService } from "../checkpoints/CheckpointService";
import type { DiagnosticsService } from "../diagnostics/DiagnosticsService";
import type { CheckpointRepository } from "../model/CheckpointRepository";
import { MapRepository } from "../model/MapRepository";
import type { MindMapTree, YeMindMapDocument } from "../model/types";
import type {
  SettingsStore,
  ShortcutCommand,
  ViewMode,
  YeMindSettings,
} from "../settings/SettingsStore";
import { openCheckpointManager } from "../ui/checkpointDialog";
import { openCanvasContextMenu, openNodeContextMenu } from "../ui/contextMenu";
import { promptText } from "../ui/dialogs";
import {
  openCommentsDialog,
  openFormulaDialog,
  openLinkDialog,
  openNoteDialog,
} from "../ui/nodeContentDialogs";
import {
  openCodeBlockDialog,
  openInlineLinkDialog,
} from "../ui/richTextDialogs";
import { calculateEditorStats } from "./editorStats";
import { createEditorTemplate } from "./editorTemplate";
import {
  flattenOutline,
  outlineStructureSignature,
  patchOutlineTree,
  resolveOutlineKeyAction,
  resolveOutlineToggleState,
} from "./outline";
import {
  resolveOutlinePointerDropIntent,
  isOutlinePointerInDragZone,
  isOutlineTextSelectionTarget,
  shouldStartOutlinePointerDrag,
  type OutlineDropPosition,
  type OutlinePointerDropIntent,
} from "./outlineDrag";
import {
  OutlineRichTextController,
  type OutlineFocusPlacement,
} from "./OutlineRichTextController";
import {
  DEFAULT_SPLIT_OUTLINE_RATIO,
  normalizeSplitOutlineRatio,
  ratioFromPointer,
} from "./splitPane";
import { RichTextToolbar } from "./RichTextToolbar";
import { isEditableTarget, matchesShortcut } from "./shortcuts";
import {
  createSelectionPresentation,
  promoteNodeToPrimary,
} from "./selectionPresentation";
import { SaveRevisionTracker } from "./saveRevision";
import { createRelationPresentation } from "./relationPresentation";
import {
  createOuterFramePresentation,
  hexToRgba,
} from "./outerFramePresentation";
import { createToolbarAvailability } from "./toolbarAvailability";
import { resolveLinkNavigation } from "./linkNavigation";
import { hasNonZeroSize } from "../plugin/visibleElement";
import { loadImageFileSelection } from "../ui/imageFileLoading";
import {
  extractImageFile,
  findRenderedNodeAtClientPoint,
  hasImageFile,
} from "../ui/nodeImageInput";
import { NodeHoverPreview } from "../ui/nodeHoverPreview";
import { NodeStylePanel } from "../ui/nodeStylePanel";
import { ProjectStylePanel } from "../ui/projectStylePanel";
import { synchronizeCanvasRichTextVisibility } from "./canvasRichTextVisibility";
import { setSearchReplaceExpanded } from "./searchPanelState";
import { normalizeProjectStyle, resolveProjectAppearance } from "./projectStyle";
import { NodeQuickActionsController } from "./nodeQuickActions";
import { canvasModeIcon, lineStyleIcon } from "./projectControls";
import { normalizeNodeNote } from "../content/nodeNoteState";
import { CanvasRightDragController } from "./canvasRightDrag";
import { scheduleFocusedNodeHighlight } from "./focusHighlight";

export interface YeMindEditorOptions {
  container: HTMLElement;
  mapId: string;
  repository: MapRepository;
  settingsStore: SettingsStore;
  checkpointRepository: CheckpointRepository;
  checkpointService: CheckpointService;
  diagnostics: DiagnosticsService;
  onMissing?: () => void;
}

interface PendingOutlineFocus {
  uid: string;
  placement: OutlineFocusPlacement;
  start?: number;
  end?: number;
}

interface OutlinePointerDragSession {
  pointerId: number;
  sourceUid: string;
  sourceRow: HTMLElement;
  startX: number;
  startY: number;
  startedAt: number;
  fromEditor: boolean;
  interactive: boolean;
  dragging: boolean;
  ghost: HTMLElement | null;
  intent: OutlinePointerDropIntent | null;
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
  private splitDividerEl!: HTMLElement;
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
  private nodeHoverPreview: NodeHoverPreview | null = null;
  private nodeStylePanel: NodeStylePanel | null = null;
  private projectStylePanel: ProjectStylePanel | null = null;
  private nodeQuickActions: NodeQuickActionsController | null = null;
  private canvasRightDrag: CanvasRightDragController | null = null;
  private cancelFocusedNodeHighlight: (() => void) | null = null;
  private outlineRichText: OutlineRichTextController | null = null;
  private settingsInitialized = false;
  private viewMode: ViewMode = "map";
  private searchText = "";
  private applyingCheckpoint = false;
  private resizeFrame: number | null = null;
  private splitResizeFrame: number | null = null;
  private splitDragPointerId: number | null = null;
  private pendingSplitClientX: number | null = null;
  private splitOutlineRatio = DEFAULT_SPLIT_OUTLINE_RATIO;
  private outlineTextCommitUid: string | null = null;
  private outlineStructureBusy = false;
  private outlinePointerDrag: OutlinePointerDragSession | null = null;
  private outlineStructureKey = "";
  private suppressOutlineClickUntil = 0;
  private pendingOutlineFocus: PendingOutlineFocus | null = null;
  private appearanceObserver: MutationObserver | null = null;
  private appearanceMedia: MediaQueryList | null = null;
  private appearanceMode: YeMindAppearance | null = null;
  private readonly onAppearanceMediaChange = (): void => {
    this.refreshAppearanceIfNeeded();
  };

  private readonly onOutlinePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.commands || this.commands.isReadonly())
      return;
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>("[data-outline-uid]");
    if (!row || row.dataset.outlineDragSource !== "true") return;
    const sourceUid = row.dataset.outlineUid ?? "";
    if (!sourceUid || row.dataset.outlineRoot === "true") return;
    const editor = row.querySelector<HTMLElement>("[data-outline-editor]");
    if (!editor || !isOutlinePointerInDragZone({
      clientX: event.clientX,
      textLeft: editor.getBoundingClientRect().left,
    })) return;
    const fromEditor = Boolean(target.closest("[data-outline-editor]"));
    const editing = isOutlineTextSelectionTarget(
      target,
      this.outlineRichText?.activeHost ?? null,
    );
    const interactive =
      editing ||
      Boolean(
        target.closest(
          'button,a,input,textarea,select,[role="button"],[contenteditable="true"],.ql-editor',
        ),
      );
    if (interactive) return;
    this.outlinePointerDrag = {
      pointerId: event.pointerId,
      sourceUid,
      sourceRow: row,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
      fromEditor,
      interactive,
      dragging: false,
      ghost: null,
      intent: null,
    };
  };

  private readonly onOutlinePointerMove = (event: PointerEvent): void => {
    const session = this.outlinePointerDrag;
    if (!session || session.pointerId !== event.pointerId || !this.commands)
      return;
    const distance = Math.hypot(
      event.clientX - session.startX,
      event.clientY - session.startY,
    );
    if (!session.dragging) {
      const start = shouldStartOutlinePointerDrag({
        interactive: session.interactive,
        fromEditor: session.fromEditor,
        editing: false,
        elapsedMs: performance.now() - session.startedAt,
        distancePx: distance,
      });
      if (!start) return;
      event.preventDefault();
      this.outlineRichText?.commitAndDetach("pointer-drag-start");
      session.dragging = true;
      session.sourceRow.classList.add("is-dragging");
      session.ghost = this.createOutlineDragGhost(session.sourceRow);
      this.options.diagnostics.record(
        "outline",
        "pointer-drag-start",
        this.current.id,
        {
          sourceDepth: this.outlineDepth(session.sourceRow),
          fromEditor: session.fromEditor,
        },
      );
    }

    event.preventDefault();
    if (session.ghost) {
      session.ghost.style.transform = `translate3d(${event.clientX + 14}px,${event.clientY + 10}px,0)`;
    }
    const targetRow = this.findOutlineRowAtPoint(event.clientX, event.clientY);
    this.clearOutlineDropState();
    session.intent = null;
    if (!targetRow || this.isOutlineDescendantRow(session.sourceRow, targetRow))
      return;
    const targetUid = targetRow.dataset.outlineUid ?? "";
    const editor = targetRow.querySelector<HTMLElement>(
      "[data-outline-editor]",
    );
    if (!targetUid || !editor) return;
    const intent = resolveOutlinePointerDropIntent({
      sourceUid: session.sourceUid,
      targetUid,
      clientX: event.clientX,
      clientY: event.clientY,
      rect: targetRow.getBoundingClientRect(),
      targetTextLeft: editor.getBoundingClientRect().left,
      targetDepth: this.outlineDepth(targetRow),
      indentWidth: 22,
      targetAncestors: this.collectOutlineAncestors(targetRow),
    });
    if (!intent) return;
    session.intent = intent;
    targetRow.classList.add(`is-drop-${intent.position}`);
    targetRow.style.setProperty(
      "--ymz-outline-drop-depth",
      String(intent.desiredDepth),
    );
  };

  private readonly onOutlinePointerUp = (event: PointerEvent): void => {
    const session = this.outlinePointerDrag;
    if (!session || session.pointerId !== event.pointerId) return;
    const { dragging, intent, sourceUid } = session;
    this.cleanupOutlinePointerDrag();
    if (!dragging || !intent || !this.commands) return;
    event.preventDefault();
    this.suppressOutlineClickUntil = Date.now() + 300;
    const moved = this.commands.moveNodeByUid(
      sourceUid,
      intent.targetUid,
      intent.position as OutlineDropPosition,
    );
    this.options.diagnostics.record(
      "outline",
      "pointer-drag-drop",
      this.current.id,
      {
        position: intent.position,
        desiredDepth: intent.desiredDepth,
        moved,
      },
    );
    if (moved) this.commands.goToNode(sourceUid);
  };

  private readonly onOutlinePointerCancel = (event: PointerEvent): void => {
    if (this.outlinePointerDrag?.pointerId !== event.pointerId) return;
    this.cleanupOutlinePointerDrag();
  };

  private readonly onImagePaste = (event: ClipboardEvent): void => {
    if (!this.map || !this.commands || this.commands.isReadonly()) return;
    const file = extractImageFile(event.clipboardData);
    const node = this.commands.getPrimaryNode();
    if (!file || !node) return;
    event.preventDefault();
    event.stopPropagation();
    void this.applyNodeImageFile(file, node, "paste");
  };

  private readonly onImageDragOver = (event: DragEvent): void => {
    if (!this.map || !this.commands || this.commands.isReadonly()) return;
    if (!hasImageFile(event.dataTransfer)) return;
    const node = findRenderedNodeAtClientPoint(
      this.map,
      event.clientX,
      event.clientY,
    );
    if (!node) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };

  private readonly onImageDrop = (event: DragEvent): void => {
    if (!this.map || !this.commands || this.commands.isReadonly()) return;
    const file = extractImageFile(event.dataTransfer);
    const node = file
      ? findRenderedNodeAtClientPoint(this.map, event.clientX, event.clientY)
      : null;
    if (!file || !node) return;
    event.preventDefault();
    event.stopPropagation();
    void this.applyNodeImageFile(file, node, "drop");
  };

  private readonly onOutlineKeydownBubble = (event: KeyboardEvent): void => {
    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      (event.target as HTMLElement | null)?.closest?.("[data-outline-editor]")
    ) {
      // Quill/default text editing already ran at the target. Stop the event
      // here so simple-mind-map's window shortcut cannot reinterpret it as
      // structural node deletion.
      event.stopPropagation();
    }
  };

  private readonly onRootKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.commands?.isRelationCreating()) {
      event.preventDefault();
      event.stopPropagation();
      this.commands.cancelRelation();
      this.updateRelationPresentation();
      return;
    }
    if (event.key === "Escape" && this.rootEl?.dataset.zen === "true") {
      event.preventDefault();
      this.toggleZen(false);
      return;
    }
    const activeOutlineEditor = this.outlineRichText?.activeHost;
    const eventTarget = event.target instanceof Node ? event.target : null;
    const activeElement = document.activeElement;
    const outlineEditing = Boolean(
      activeOutlineEditor &&
        ((eventTarget && activeOutlineEditor.contains(eventTarget)) ||
          (activeElement && activeOutlineEditor.contains(activeElement))),
    );
    if (!this.commands || outlineEditing || isEditableTarget(event.target)) return;
    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.commands.remove();
      return;
    }

    const actions: Array<[ShortcutCommand, () => void]> = [
      ["search", () => this.openSearchPanel()],
      ["toggleZen", () => this.toggleZen(this.rootEl.dataset.zen !== "true")],
      [
        "toggleReadonly",
        () => this.setReadonly(this.rootEl.dataset.readonly !== "true"),
      ],
      ["undo", () => this.commands?.undo()],
      ["redo", () => this.commands?.redo()],
      ["fit", () => this.commands?.fit()],
      ["reset", () => this.commands?.resetZoom()],
      ["addParent", () => this.commands?.addParent()],
      [
        "comments",
        () => {
          if (this.commands?.getPrimaryNode() && !this.commands.isReadonly())
            openCommentsDialog(this.commands);
        },
      ],
      ["summary", () => this.commands?.addSummary()],
      ["relation", () => this.beginRelation()],
    ];
    const action = actions.find(([key]) =>
      matchesShortcut(event, this.settings.shortcutMap[key]),
    );
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
    this.splitOutlineRatio = normalizeSplitOutlineRatio(
      this.settings.splitOutlineRatio,
    );
    this.mount();
  }

  focusNode(uid: string): void {
    if (!uid || !this.commands) return;
    this.commands.goToNode(uid);
    this.activateOutlineUid(uid);
    this.cancelFocusedNodeHighlight?.();
    this.cancelFocusedNodeHighlight = scheduleFocusedNodeHighlight(
      () => (this.map?.renderer as any) ?? null,
      uid,
    );
  }

  resize(): void {
    this.scheduleSafeResize();
  }

  destroy(): void {
    this.options.diagnostics.record(
      "editor",
      "destroy-started",
      this.current.id,
      { dirty: this.saveRevisions.isDirty() },
    );
    this.outlineRichText?.destroy();
    this.outlineRichText = null;
    this.flushPendingSave();
    this.destroyed = true;
    this.repositoryUnsubscribe?.();
    this.settingsUnsubscribe?.();
    this.appearanceObserver?.disconnect();
    this.appearanceObserver = null;
    this.appearanceMedia?.removeEventListener?.(
      "change",
      this.onAppearanceMediaChange,
    );
    this.appearanceMedia = null;
    this.richTextToolbar?.destroy();
    this.richTextToolbar = null;
    this.nodeHoverPreview?.destroy();
    this.nodeHoverPreview = null;
    this.nodeStylePanel?.destroy();
    this.nodeStylePanel = null;
    this.projectStylePanel?.destroy();
    this.projectStylePanel = null;
    this.nodeQuickActions?.destroy();
    this.nodeQuickActions = null;
    this.canvasRightDrag?.destroy();
    this.canvasRightDrag = null;
    this.cancelFocusedNodeHighlight?.();
    this.cancelFocusedNodeHighlight = null;
    this.rootEl?.removeEventListener("keydown", this.onRootKeydown, true);
    this.outlineEl?.removeEventListener("keydown", this.onOutlineKeydownBubble);
    this.rootEl?.removeEventListener("paste", this.onImagePaste);
    this.canvasEl?.removeEventListener("dragover", this.onImageDragOver);
    this.canvasEl?.removeEventListener("drop", this.onImageDrop);
    this.outlineEl?.removeEventListener(
      "pointerdown",
      this.onOutlinePointerDown,
    );
    window.removeEventListener("pointermove", this.onOutlinePointerMove);
    window.removeEventListener("pointerup", this.onOutlinePointerUp);
    window.removeEventListener("pointercancel", this.onOutlinePointerCancel);
    this.cleanupOutlinePointerDrag();
    if (this.resizeFrame !== null)
      window.cancelAnimationFrame(this.resizeFrame);
    if (this.splitResizeFrame !== null)
      window.cancelAnimationFrame(this.splitResizeFrame);
    this.resizeFrame = null;
    this.splitResizeFrame = null;
    this.splitDragPointerId = null;
    this.map?.destroy();
    this.map = null;
    this.options.diagnostics.removeEditorState(this.current.id);
    this.options.diagnostics.record(
      "editor",
      "destroy-completed",
      this.current.id,
    );
    this.options.container.innerHTML = "";
  }

  private mount(): void {
    this.current.theme = normalizeThemePresetId(this.current.theme);
    this.current.lineStyle = normalizeLineStyle(this.current.lineStyle);
    this.options.container.innerHTML = createEditorTemplate(
      this.current.title,
      this.current.theme,
      this.current.lineStyle,
    );
    this.rootEl = this.options.container.querySelector(
      ".ymz-editor",
    ) as HTMLElement;
    this.canvasEl = this.options.container.querySelector(
      '[data-role="canvas"]',
    ) as HTMLElement;
    this.splitDividerEl = this.options.container.querySelector(
      '[data-role="split-divider"]',
    ) as HTMLElement;
    this.outlineEl = this.options.container.querySelector(
      '[data-role="outline"]',
    ) as HTMLElement;
    this.statsEl = this.options.container.querySelector(
      '[data-role="stats"]',
    ) as HTMLElement;
    this.zoomEl = this.options.container.querySelector(
      '[data-role="zoom"]',
    ) as HTMLElement;
    this.saveStateEl = this.options.container.querySelector(
      '[data-role="save-state"]',
    ) as HTMLElement;
    this.titleEl = this.options.container.querySelector(
      '[data-role="title"]',
    ) as HTMLElement;
    this.searchPanelEl = this.options.container.querySelector(
      '[data-role="search-panel"]',
    ) as HTMLElement;
    this.searchInputEl = this.options.container.querySelector(
      '[data-role="search-input"]',
    ) as HTMLInputElement;
    this.replaceInputEl = this.options.container.querySelector(
      '[data-role="replace-input"]',
    ) as HTMLInputElement;
    this.searchInfoEl = this.options.container.querySelector(
      '[data-role="search-info"]',
    ) as HTMLElement;
    this.selectionCountEl = this.options.container.querySelector(
      '[data-role="selection-count"]',
    ) as HTMLElement;
    this.relationPanelEl = this.options.container.querySelector(
      '[data-role="relation-panel"]',
    ) as HTMLElement;
    this.relationHintEl = this.options.container.querySelector(
      '[data-role="relation-hint"]',
    ) as HTMLElement;
    this.outerFramePanelEl = this.options.container.querySelector(
      '[data-role="outer-frame-panel"]',
    ) as HTMLElement;
    this.outerFrameHintEl = this.options.container.querySelector(
      '[data-role="outer-frame-hint"]',
    ) as HTMLElement;
    const layoutSelect =
      this.options.container.querySelector<HTMLSelectElement>(
        '[data-action="layout"]',
      );
    if (layoutSelect) layoutSelect.value = this.current.layout;
    const themeSelect = this.options.container.querySelector<HTMLSelectElement>(
      '[data-action="theme"]',
    );
    if (themeSelect) themeSelect.value = this.current.theme;
    const lineStyleSelect =
      this.options.container.querySelector<HTMLSelectElement>(
        '[data-action="line-style"]',
      );
    if (lineStyleSelect) lineStyleSelect.value = this.current.lineStyle;

    let runtimeData = this.current.data;
    const normalized = stripCustomPositions(runtimeData);
    const sanitized = sanitizeAssociativeLines(normalized.tree);
    runtimeData = sanitized.tree;
    if (normalized.changed || sanitized.changed) {
      this.current.data = runtimeData;
      void this.options.repository
        .update(this.current.id, { data: runtimeData })
        .catch((error) => {
          console.error("[YeMind Zen] migrated data save failed", error);
          showMessage(
            "导图兼容数据保存失败，请勿立即关闭该标签",
            5000,
            "error",
          );
        });
    }
    const runtimeViewData = this.settings.restoreSavedView
      ? normalizePersistedViewData(this.current.viewData)
      : undefined;
    if (this.current.viewData && !runtimeViewData)
      this.current.viewData = undefined;

    this.map = createMindMap({
      el: this.canvasEl,
      data: runtimeData,
      viewData: runtimeViewData,
      theme: this.current.theme,
      lineStyle: this.current.lineStyle,
      layout: this.current.layout,
      settings: this.settings,
      onHyperlink: (href) => this.openLink(href),
      onDeleteShortcut: () => this.commands?.remove(),
    });
    this.commands = createCommandAdapter(this.map);
    this.canvasRightDrag = new CanvasRightDragController({
      root: this.rootEl,
      map: this.map,
      mode: () => this.settings.canvasMode,
    });
    this.nodeStylePanel = new NodeStylePanel(this.rootEl, this.commands);
    this.projectStylePanel = new ProjectStylePanel(
      this.rootEl,
      this.current.projectStyle,
      () => Boolean(this.commands?.isReadonly()),
      (style) => {
        this.current.projectStyle = normalizeProjectStyle(style);
        this.applyMapAppearance();
        this.scheduleSave();
      },
    );
    this.nodeQuickActions = new NodeQuickActionsController({
      root: this.rootEl,
      canvas: this.canvasEl,
      getRendererRoot: () => (this.map as any)?.renderer?.root,
      getActiveNodes: () => this.commands?.getActiveNodes() ?? [],
      readonly: () => Boolean(this.commands?.isReadonly()),
      onAddChild: (uid) => {
        if (this.commands?.addChildByUid(uid)) this.nodeQuickActions?.scheduleRefresh();
      },
      onSetExpanded: (uid, expanded) => {
        if (this.commands?.setNodeExpandedByUid(uid, expanded)) this.nodeQuickActions?.scheduleRefresh();
      },
    });
    this.nodeHoverPreview = new NodeHoverPreview(this.rootEl);
    this.richTextToolbar = new RichTextToolbar(this.rootEl, this.commands, {
      onFormula: (target) => openFormulaDialog(target),
      onLink: (target) => openInlineLinkDialog(target, this.settings),
      onCodeBlock: (target) => openCodeBlockDialog(target, this.settings),
      onAction: (action) =>
        this.options.diagnostics.record("rich-text", action, this.current.id),
    });
    this.outlineRichText = new OutlineRichTextController({
      root: this.rootEl,
      isReadonly: () => Boolean(this.commands?.isReadonly()),
      onCommit: (uid, html) => this.commitOutlineRichText(uid, html),
      onDiagnostic: (action, details) =>
        this.options.diagnostics.record(
          "outline",
          action,
          this.current.id,
          details,
        ),
      onSelectionChange: (hasRange, rect, format, target) => {
        this.richTextToolbar?.update(hasRange, rect, format, target);
      },
    });
    this.rootEl.addEventListener("keydown", this.onRootKeydown, true);
    this.rootEl.addEventListener("paste", this.onImagePaste);
    this.canvasEl.addEventListener("dragover", this.onImageDragOver);
    this.canvasEl.addEventListener("drop", this.onImageDrop);

    this.bindToolbar();
    this.bindMapEvents();
    this.bindAppearanceObserver();
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
    this.settingsUnsubscribe = this.options.settingsStore.subscribe(
      (settings) => this.applySettings(settings),
    );
    this.updateStats(this.current.data);
    this.renderOutline(this.current.data);
    this.nodeQuickActions?.scheduleRefresh();
    this.updateZoom();
    const runtime = this.map as any;
    this.options.diagnostics.record("editor", "mounted", this.current.id, {
      layout: this.current.layout,
      theme: this.current.theme,
      lineStyle: this.current.lineStyle,
      pluginStates: {
        drag: Boolean(runtime.drag),
        select: Boolean(runtime.select),
        search: Boolean(runtime.search),
        richText: Boolean(runtime.richText),
        associativeLine: Boolean(runtime.associativeLine),
        outerFrame: Boolean(runtime.outerFrame),
      },
    });
    this.updateDiagnosticState({ mounted: true });
  }

  private bindToolbar(): void {
    this.rootEl.addEventListener("click", (event) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (anchor && this.rootEl.contains(anchor)) {
        event.preventDefault();
        event.stopPropagation();
        this.openLink(anchor.href || anchor.getAttribute("href") || "");
        return;
      }

      const outlineToggle = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-outline-toggle]",
      );
      const outlineRow = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-outline-uid]",
      );
      if (outlineToggle && outlineRow && this.commands) {
        event.preventDefault();
        event.stopPropagation();
        const uid = outlineRow.dataset.outlineUid ?? "";
        const next = resolveOutlineToggleState({
          hasChildren: outlineRow.dataset.outlineHasChildren === "true",
          expanded: outlineRow.dataset.outlineExpanded === "true",
        });
        if (!uid || next === null) return;
        this.activateOutlineUid(uid);
        this.setOutlineExpanded(uid, next);
        return;
      }
      if (outlineRow && this.commands) {
        if (Date.now() < this.suppressOutlineClickUntil) return;
        const uid = outlineRow.dataset.outlineUid ?? "";
        this.commands.goToNode(uid);
        this.activateOutlineUid(uid);
        return;
      }

      const searchButton = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-search-action]",
      );
      if (searchButton) {
        this.handleSearchAction(searchButton.dataset.searchAction ?? "");
        return;
      }

      const relationButton = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-relation-action]",
      );
      if (relationButton && this.commands) {
        const relationAction = relationButton.dataset.relationAction;
        if (relationAction === "edit" && !this.commands.isReadonly())
          this.commands.editActiveRelationText();
        if (relationAction === "delete" && !this.commands.isReadonly())
          this.commands.removeActiveRelation();
        if (relationAction === "cancel") this.commands.cancelRelation();
        this.updateRelationPresentation();
        return;
      }

      const outerFrameButton = (
        event.target as HTMLElement
      ).closest<HTMLElement>("[data-outer-frame-action]");
      if (outerFrameButton && this.commands) {
        const outerFrameAction = outerFrameButton.dataset.outerFrameAction;
        if (outerFrameAction === "edit" && !this.commands.isReadonly()) {
          this.commands.editActiveOuterFrameText();
          this.updateOuterFramePresentation();
        }
        if (outerFrameAction === "delete" && !this.commands.isReadonly()) {
          this.commands.removeActiveOuterFrame();
          this.hideOuterFramePresentation();
        }
        return;
      }

      const button = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-action]",
      );
      if (!button || !this.commands || !this.map) return;
      const action = button.dataset.action;
      if (action)
        this.options.diagnostics.record("toolbar", action, this.current.id);
      switch (action) {
        case "undo":
          this.commands.undo();
          break;
        case "redo":
          this.commands.redo();
          break;
        case "add-child":
          this.commands.addChild();
          break;
        case "add-sibling":
          this.commands.addSibling();
          break;
        case "remove":
          this.commands.remove();
          break;
        case "fit":
          this.commands.fit();
          break;
        case "reset":
          this.commands.resetZoom();
          break;
        case "reset-layout":
          this.commands.resetLayout();
          break;
        case "toggle-selection-mode":
          void this.toggleSelectionMode();
          break;
        case "zoom-in":
          this.commands.zoomIn();
          break;
        case "zoom-out":
          this.commands.zoomOut();
          break;
        case "view-map":
          this.setViewMode("map");
          break;
        case "view-split":
          this.setViewMode("split");
          break;
        case "view-outline":
          this.setViewMode("outline");
          break;
        case "open-search":
          this.openSearchPanel();
          break;
        case "checkpoints":
          this.openCheckpointMenu(button);
          break;
        case "node-style":
          this.nodeStylePanel?.show();
          break;
        case "project-style":
          this.projectStylePanel?.show();
          break;
        case "readonly":
          this.setReadonly(this.rootEl.dataset.readonly !== "true");
          break;
        case "zen":
          this.toggleZen(true);
          break;
        case "zen-exit":
          this.toggleZen(false);
          break;
        case "fullscreen":
          void this.toggleFullscreen();
          break;
        case "help":
          this.openHelp();
          break;
      }
    });

    this.outlineEl.addEventListener("focusin", (event) => {
      const editor = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-outline-editor]",
      );
      const row = editor?.closest<HTMLElement>("[data-outline-uid]");
      const uid = row?.dataset.outlineUid ?? "";
      if (!editor || !uid || !this.commands || !this.outlineRichText) return;
      const request =
        this.pendingOutlineFocus?.uid === uid
          ? this.pendingOutlineFocus
          : undefined;
      if (request) this.pendingOutlineFocus = null;
      this.outlineRichText.activate(editor, uid, request);
      this.commands.goToNode(uid);
      this.activateOutlineUid(uid);
    });
    // Capture structural keys before Quill's own keyboard module consumes them.
    this.outlineEl.addEventListener(
      "keydown",
      (event) => this.handleOutlineKeydown(event),
      true,
    );
    this.outlineEl.addEventListener("keydown", this.onOutlineKeydownBubble);
    this.bindOutlineDrag();
    this.bindSplitDivider();

    this.rootEl.addEventListener("change", (event) => {
      const control = (event.target as HTMLElement).closest<
        HTMLInputElement | HTMLSelectElement
      >("[data-outer-frame-setting]");
      if (!control || !this.commands || this.commands.isReadonly()) return;
      const key = control.dataset.outerFrameSetting;
      if (!key) return;
      const rawValue = control.value;
      const value = key === "fill" ? hexToRgba(rawValue) : rawValue;
      this.commands.updateActiveOuterFrame({ [key]: value });
      this.updateOuterFramePresentation();
    });

    this.searchInputEl.addEventListener("input", () => {
      if (!this.searchInputEl.value.trim()) {
        this.commands?.endSearch();
        this.searchText = "";
        this.updateSearchInfo({ currentIndex: -1, total: 0 });
      } else if (this.searchInputEl.value.trim() !== this.searchText) {
        this.searchInfoEl.textContent = "按 Enter 搜索";
      }
    });
    this.searchInputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.performSearch(event.shiftKey ? "previous" : "next");
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.closeSearchPanel();
      }
    });
    this.replaceInputEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      this.replaceCurrentSearch();
    });

    this.rootEl
      .querySelector<HTMLSelectElement>('[data-action="layout"]')
      ?.addEventListener("change", (event) => this.setLayout((event.target as HTMLSelectElement).value));
    this.rootEl
      .querySelector<HTMLSelectElement>('[data-action="theme"]')
      ?.addEventListener("change", (event) => this.setTheme((event.target as HTMLSelectElement).value));
    this.rootEl
      .querySelector<HTMLSelectElement>('[data-action="line-style"]')
      ?.addEventListener("change", (event) => this.setLineStyle((event.target as HTMLSelectElement).value));
  }

  private setLayout(value: string): void {
    if (!this.map || this.commands?.isReadonly()) return;
    this.current.layout = value;
    this.map.setLayout(value);
    const select = this.rootEl.querySelector<HTMLSelectElement>('[data-action="layout"]');
    if (select) select.value = value;
    this.options.diagnostics.record("appearance", "layout-changed", this.current.id, { layout: value });
    this.nodeQuickActions?.scheduleRefresh();
    this.scheduleSave();
  }

  private setTheme(value: string): void {
    if (!this.map || this.commands?.isReadonly()) return;
    this.current.theme = normalizeThemePresetId(value);
    const select = this.rootEl.querySelector<HTMLSelectElement>('[data-action="theme"]');
    if (select) select.value = this.current.theme;
    this.applyMapAppearance();
    this.options.diagnostics.record("appearance", "theme-changed", this.current.id, { theme: this.current.theme });
    this.nodeQuickActions?.scheduleRefresh();
    this.scheduleSave();
  }

  private setLineStyle(value: unknown): void {
    if (!this.map || this.commands?.isReadonly()) return;
    this.current.lineStyle = normalizeLineStyle(value);
    const select = this.rootEl.querySelector<HTMLSelectElement>('[data-action="line-style"]');
    if (select) select.value = this.current.lineStyle;
    const icon = this.rootEl.querySelector<HTMLElement>('[data-role="line-style-icon"]');
    if (icon) icon.innerHTML = lineStyleIcon(this.current.lineStyle);
    this.applyMapAppearance();
    this.options.diagnostics.record("appearance", "line-style-changed", this.current.id, { lineStyle: this.current.lineStyle });
    this.nodeQuickActions?.scheduleRefresh();
    this.scheduleSave();
  }

  private bindMapEvents(): void {
    if (!this.map) return;
    this.map.on("before_show_text_edit", () => {
      this.canvasRightDrag?.cancel();
      queueMicrotask(() => synchronizeCanvasRichTextVisibility(this.map as any));
      window.requestAnimationFrame(() => synchronizeCanvasRichTextVisibility(this.map as any));
    });
    this.map.on("data_change", (data: MindMapTree) => {
      if (this.applyingCheckpoint) return;
      this.current.data = data;
      this.options.diagnostics.record(
        "editor",
        "data-change",
        this.current.id,
        { nodeCount: calculateEditorStats(data).nodes },
      );
      this.updateStats(data);
      this.renderOutline(data);
      this.nodeStylePanel?.refresh();
      this.nodeQuickActions?.scheduleRefresh();
      this.scheduleSave();
    });
    this.map.on("view_data_change", (viewData: Record<string, unknown>) => {
      if (this.applyingCheckpoint) return;
      this.updateZoom();
      const normalized = normalizePersistedViewData(viewData);
      if (!normalized) return;
      this.current.viewData = normalized;
      this.options.diagnostics.record(
        "editor",
        "view-change",
        this.current.id,
        { zoom: Number((this.map?.view as any)?.scale ?? 1) },
      );
      this.updateDiagnosticState();
      this.nodeQuickActions?.scheduleRefresh();
      this.scheduleSave();
    });
    this.map.on("node_contextmenu", (event: MouseEvent, node: any) => {
      if (this.canvasRightDrag?.consumeContextMenu()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!this.commands) return;
      this.activateNode(node);
      this.openContextMenu(event);
    });
    this.map.on("contextmenu", (event: MouseEvent) => {
      if (this.canvasRightDrag?.consumeContextMenu()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      this.openCanvasMenu(event);
    });
    this.map.on(
      "rich_text_selection_change",
      (
        hasRange: boolean,
        rectInfo: Record<string, number> | null,
        formatInfo: Record<string, unknown> | null,
      ) => {
        this.richTextToolbar?.update(
          hasRange,
          rectInfo as any,
          formatInfo,
          this.commands,
        );
      },
    );
    this.map.on("yemind_todo_toggle", (node: any) => {
      if (!this.commands) return;
      this.activateNode(node);
      if (this.commands.isReadonly()) {
        showMessage("只读模式下不能修改待办", 2500, "info");
        return;
      }
      this.commands.toggleTodo();
    });
    this.map.on(
      "yemind_badge_click",
      (type: "todo" | "note" | "comments", node: any) => {
        if (!this.commands) return;
        this.activateNode(node);
        if (type === "todo") {
          if (this.commands.isReadonly()) {
            showMessage("只读模式下不能修改待办", 2500, "info");
            return;
          }
          this.commands.toggleTodo();
        }
        if (type === "note")
          openNoteDialog(this.commands, {
            readonly: this.commands.isReadonly(),
          });
        if (type === "comments")
          openCommentsDialog(this.commands, {
            readonly: this.commands.isReadonly(),
          });
      },
    );
    this.map.on(
      "yemind_badge_hover",
      (
        type: "note" | "comments",
        node: any,
        anchor: HTMLElement,
        entering: boolean,
      ) => {
        if (!this.nodeHoverPreview) return;
        if (!entering) {
          this.nodeHoverPreview.scheduleHide();
          return;
        }
        const value =
          type === "note"
            ? normalizeNodeNote(
                node.getData?.("yemindNote") ?? node.getData?.("note"),
              )
            : ((node.getData?.("yemindComments") ?? []) as any[]);
        if (!value || (Array.isArray(value) && value.length === 0)) return;
        this.nodeHoverPreview.show(type, value as any, anchor);
      },
    );
    this.map.on("node_active", (node: any, list: any[]) => {
      this.rootEl.dataset.hasSelection = list.length > 0 ? "true" : "false";
      this.updateSelectionPresentation(list.length);
      this.updateDiagnosticState({ selectedNodeCount: list.length });
      this.updateToolbarAvailability();
      if (list.length > 0) this.nodeStylePanel?.refresh();
      else this.nodeStylePanel?.hide();
      this.nodeQuickActions?.scheduleRefresh();
      const active = node ?? list[0];
      const uid = active?.getData?.("uid");
      this.activateOutlineUid(uid ? String(uid) : "");
    });
    this.map.on("associative_line_click", () =>
      this.updateRelationPresentation(),
    );
    this.map.on("associative_line_deactivate", () =>
      this.updateRelationPresentation(),
    );
    this.map.on("outer_frame_active", () =>
      this.updateOuterFramePresentation(),
    );
    this.map.on("outer_frame_deactivate", () =>
      this.hideOuterFramePresentation(),
    );
    this.map.on("outer_frame_delete", () => this.hideOuterFramePresentation());
    this.map.on("node_click", () =>
      window.setTimeout(() => this.updateRelationPresentation(), 0),
    );
    this.map.on("draw_click", () =>
      window.setTimeout(() => this.updateRelationPresentation(), 0),
    );
    this.map.on(
      "search_info_change",
      (info: { currentIndex: number; total: number }) =>
        this.updateSearchInfo(info),
    );
    this.map.on("scale", () => {
      this.updateZoom();
      this.nodeQuickActions?.scheduleRefresh();
    });
    this.map.on("node_tree_render_end", () => this.nodeQuickActions?.scheduleRefresh());
  }

  private openContextMenu(event: MouseEvent): void {
    if (!this.commands) return;
    this.options.diagnostics.record("context-menu", "opened", this.current.id, {
      selectedNodeCount: this.commands.getActiveNodes().length,
    });
    openNodeContextMenu(event, this.commands, {
      onInlineLink: () => openInlineLinkDialog(this.commands!, this.settings),
      onCodeBlock: () => openCodeBlockDialog(this.commands!, this.settings),
      onNodeLink: () =>
        openLinkDialog(this.commands!, this.settings.inlineLinkAutoHttps),
      onRelation: () => this.beginRelation(),
      onNodeStyle: () => this.nodeStylePanel?.show(),
      onAction: (action) =>
        this.options.diagnostics.record(
          "context-menu",
          action,
          this.current.id,
        ),
    });
  }

  private openCanvasMenu(event: MouseEvent): void {
    if (!this.commands) return;
    this.options.diagnostics.record(
      "context-menu",
      "canvas-opened",
      this.current.id,
    );
    openCanvasContextMenu(event, this.commands, {
      zen: this.rootEl.dataset.zen === "true",
      readonly: this.rootEl.dataset.readonly === "true",
      onZenChange: (enabled) => this.toggleZen(enabled),
      onReadonlyChange: (enabled) => this.setReadonly(enabled),
      currentLayout: this.current.layout,
      currentTheme: this.current.theme,
      currentLineStyle: this.current.lineStyle,
      onLayoutChange: (layout) => this.setLayout(layout),
      onThemeChange: (theme) => this.setTheme(theme),
      onLineStyleChange: (lineStyle) => this.setLineStyle(lineStyle),
      onProjectStyle: () => this.projectStylePanel?.show(),
      onAction: (action) =>
        this.options.diagnostics.record(
          "context-menu",
          `canvas-${action}`,
          this.current.id,
        ),
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
    this.relationPanelEl
      .querySelectorAll<HTMLElement>("[data-relation-action]")
      .forEach((button) => {
        const action = button.dataset.relationAction;
        button.hidden =
          presentation.mode === "creating"
            ? action !== "cancel"
            : presentation.mode === "active"
              ? action === "cancel"
              : true;
      });
  }

  private updateOuterFramePresentation(): void {
    if (!this.commands || !this.outerFramePanelEl || !this.outerFrameHintEl)
      return;
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
    this.outerFramePanelEl
      .querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "[data-outer-frame-setting]",
      )
      .forEach((control) => {
        const key = control.dataset.outerFrameSetting ?? "";
        if (values[key]) control.value = values[key];
        control.disabled = presentation.readonly;
      });
    this.outerFramePanelEl
      .querySelectorAll<HTMLButtonElement>("[data-outer-frame-action]")
      .forEach((button) => {
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
    this.richTextToolbar?.setEnabled(
      settings.showRichTextToolbar && this.rootEl.dataset.readonly !== "true",
    );
    configureMindMapPlugins(settings);
    configureNodeDecorations({
      showTodoBadge: settings.showTodoBadge,
      showCommentBadge: settings.showCommentBadge,
    });
    this.rootEl.dataset.codeWrap = String(settings.codeBlockWrap);
    this.rootEl.dataset.codeLanguage = String(settings.codeBlockShowLanguage);
    this.rootEl.dataset.clozeMode = settings.clozeMode;
    this.rootEl.dataset.clozeHover = String(settings.clozeRevealOnHover);
    this.rootEl.style.setProperty(
      "--ymz-code-tab-size",
      String(settings.codeBlockTabSize),
    );
    this.rootEl.style.setProperty(
      "--ymz-code-font-size",
      `${settings.codeBlockFontSize}px`,
    );
    this.applySplitOutlineRatio(settings.splitOutlineRatio, false);
    const behavior = buildDragAndLayoutOptions(settings);
    const relationOptions = buildRelationOptions(settings);
    const outerFrameOptions = buildOuterFrameOptions(settings);
    this.map?.updateConfig({
      useLeftKeySelectionRightKeyDrag: settings.canvasMode === "select",
      mousewheelAction: settings.wheelMode === "zoom" ? "zoom" : "move",
      disableMouseWheelZoom: settings.wheelMode === "none",
      isShowCreateChildBtnIcon: false,
      notShowExpandBtn: true,
      autoMoveWhenMouseInEdgeOnDrag: behavior.autoMoveWhenMouseInEdgeOnDrag,
      isLimitMindMapInCanvas: behavior.isLimitMindMapInCanvas,
      minZoomRatio: behavior.minZoomRatio,
      maxZoomRatio: behavior.maxZoomRatio,
      fitPadding: behavior.fitPadding,
      ...relationOptions,
      ...outerFrameOptions,
    });
    this.applyMapAppearance();
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

  private applyMapAppearance(render = true): void {
    if (!this.map) return;
    this.current.theme = normalizeThemePresetId(this.current.theme);
    this.current.lineStyle = normalizeLineStyle(this.current.lineStyle);
    const behavior = buildDragAndLayoutOptions(this.settings);
    const appearanceMode = detectAppearance();
    const appearance = buildThemeConfig({
      presetId: this.current.theme,
      appearance: appearanceMode,
      lineStyle: this.current.lineStyle,
      spacingConfig: behavior.themeConfig,
    });
    this.appearanceMode = appearanceMode;
    this.rootEl.dataset.themePreset = appearance.presetId;
    this.rootEl.dataset.appearance = appearanceMode;
    const projectAppearance = resolveProjectAppearance({
      style: this.current.projectStyle,
      themeConfig: appearance.themeConfig,
      rainbow: appearance.rainbow,
    });
    this.canvasEl.style.backgroundColor = String(
      projectAppearance.themeConfig.backgroundColor ?? "",
    );
    this.map.setThemeConfig(projectAppearance.themeConfig, true);
    this.map.updateConfig({ rainbowLinesConfig: projectAppearance.rainbow });
    if (render) this.map.render();
    (this.map as any)?.associativeLine?.renderAllLines?.();
    (this.map as any)?.outerFrame?.renderOuterFrames?.();
  }

  private bindAppearanceObserver(): void {
    this.appearanceMode = detectAppearance();
    if (typeof MutationObserver !== "undefined") {
      this.appearanceObserver = new MutationObserver(() =>
        this.refreshAppearanceIfNeeded(),
      );
      this.appearanceObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [
          "class",
          "data-theme",
          "data-theme-mode",
          "data-color-mode",
        ],
      });
      if (document.body) {
        this.appearanceObserver.observe(document.body, {
          attributes: true,
          attributeFilter: [
            "class",
            "data-theme",
            "data-theme-mode",
            "data-color-mode",
          ],
        });
      }
    }
    if (typeof matchMedia === "function") {
      this.appearanceMedia = matchMedia("(prefers-color-scheme: dark)");
      this.appearanceMedia.addEventListener?.(
        "change",
        this.onAppearanceMediaChange,
      );
    }
    this.applyMapAppearance(false);
  }

  private refreshAppearanceIfNeeded(): void {
    if (this.destroyed || !this.map) return;
    const next = detectAppearance();
    if (next === this.appearanceMode) return;
    this.applyMapAppearance();
    this.options.diagnostics.record(
      "appearance",
      "host-mode-changed",
      this.current.id,
      { appearance: next },
    );
  }

  private bindSplitDivider(): void {
    const endDrag = (event: PointerEvent): void => {
      if (this.splitDragPointerId !== event.pointerId) return;
      this.flushSplitPointerUpdate();
      this.splitDragPointerId = null;
      this.splitDividerEl.classList.remove("is-dragging");
      try {
        this.splitDividerEl.releasePointerCapture(event.pointerId);
      } catch {}
      void this.persistSplitOutlineRatio();
    };

    this.splitDividerEl.addEventListener("pointerdown", (event) => {
      if (this.viewMode !== "split" || event.button !== 0) return;
      event.preventDefault();
      this.splitDragPointerId = event.pointerId;
      this.splitDividerEl.classList.add("is-dragging");
      this.splitDividerEl.setPointerCapture(event.pointerId);
      this.queueSplitPointerUpdate(event.clientX);
    });
    this.splitDividerEl.addEventListener("pointermove", (event) => {
      if (this.splitDragPointerId !== event.pointerId) return;
      event.preventDefault();
      this.queueSplitPointerUpdate(event.clientX);
    });
    this.splitDividerEl.addEventListener("pointerup", endDrag);
    this.splitDividerEl.addEventListener("pointercancel", endDrag);
    this.splitDividerEl.addEventListener("dblclick", (event) => {
      if (this.viewMode !== "split") return;
      event.preventDefault();
      this.applySplitOutlineRatio(DEFAULT_SPLIT_OUTLINE_RATIO, true);
    });
    this.splitDividerEl.addEventListener("keydown", (event) => {
      if (this.viewMode !== "split") return;
      let next: number | null = null;
      if (event.key === "ArrowLeft") next = this.splitOutlineRatio + 0.02;
      if (event.key === "ArrowRight") next = this.splitOutlineRatio - 0.02;
      if (event.key === "Home") next = DEFAULT_SPLIT_OUTLINE_RATIO;
      if (next === null) return;
      event.preventDefault();
      event.stopPropagation();
      this.applySplitOutlineRatio(next, true);
    });
  }

  private queueSplitPointerUpdate(clientX: number): void {
    this.pendingSplitClientX = clientX;
    if (this.splitResizeFrame !== null) return;
    this.splitResizeFrame = window.requestAnimationFrame(() => {
      this.splitResizeFrame = null;
      this.flushSplitPointerUpdate();
    });
  }

  private flushSplitPointerUpdate(): void {
    if (this.pendingSplitClientX === null) return;
    const clientX = this.pendingSplitClientX;
    this.pendingSplitClientX = null;
    const workspace = this.splitDividerEl.parentElement;
    if (!workspace) return;
    const rect = workspace.getBoundingClientRect();
    this.applySplitOutlineRatio(ratioFromPointer(rect, clientX), false);
  }

  private applySplitOutlineRatio(value: unknown, persist: boolean): void {
    this.splitOutlineRatio = normalizeSplitOutlineRatio(value);
    this.rootEl.style.setProperty(
      "--ymz-outline-ratio",
      `${(this.splitOutlineRatio * 100).toFixed(2)}%`,
    );
    this.splitDividerEl.setAttribute(
      "aria-valuenow",
      String(Math.round(this.splitOutlineRatio * 100)),
    );
    if (this.viewMode === "split") this.scheduleSafeResize();
    if (persist) void this.persistSplitOutlineRatio();
  }

  private async persistSplitOutlineRatio(): Promise<void> {
    try {
      await this.options.settingsStore.update({
        splitOutlineRatio: this.splitOutlineRatio,
      });
    } catch (error) {
      console.error("[YeMind Zen] split ratio save failed", error);
      showMessage("分屏比例保存失败，已保持当前显示", 4000, "error");
    }
  }

  private async toggleSelectionMode(): Promise<void> {
    const nextMode = this.settings.canvasMode === "select" ? "pan" : "select";
    try {
      await this.options.settingsStore.update({ canvasMode: nextMode });
    } catch (error) {
      console.error("[YeMind Zen] canvas mode save failed", error);
      showMessage("画布操作模式保存失败，已保持原设置", 4000, "error");
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
      "add-child": state.addChild,
      "add-sibling": state.addSibling,
      remove: state.remove,
      "reset-layout": state.resetLayout,
      "node-style": !this.commands.isReadonly() && nodes.length > 0,
      "project-style": !this.commands.isReadonly(),
    };
    this.rootEl
      .querySelectorAll<HTMLButtonElement>("button[data-action]")
      .forEach((button) => {
        const action = button.dataset.action ?? "";
        if (Object.prototype.hasOwnProperty.call(actionState, action))
          button.disabled = !actionState[action];
      });
    const layout = this.rootEl.querySelector<HTMLSelectElement>(
      '[data-action="layout"]',
    );
    if (layout) layout.disabled = !state.layout;
    const theme = this.rootEl.querySelector<HTMLSelectElement>(
      '[data-action="theme"]',
    );
    if (theme) theme.disabled = this.commands.isReadonly();
    const lineStyle = this.rootEl.querySelector<HTMLSelectElement>(
      '[data-action="line-style"]',
    );
    if (lineStyle) lineStyle.disabled = this.commands.isReadonly();
  }

  private updateSelectionPresentation(count?: number): void {
    const activeList = Array.isArray(
      (this.map as any)?.renderer?.activeNodeList,
    )
      ? (this.map as any).renderer.activeNodeList
      : [];
    const presentation = createSelectionPresentation(
      count ?? activeList.length,
      this.settings.canvasMode,
    );
    this.rootEl.dataset.selectionMode = this.settings.canvasMode;
    this.rootEl.dataset.multiSelection = String(presentation.isMultiple);
    this.selectionCountEl.textContent = presentation.countText;
    this.selectionCountEl.hidden = !presentation.isMultiple;
    this.rootEl
      .querySelectorAll<HTMLElement>('[data-action="toggle-selection-mode"]')
      .forEach((button) => {
        const isDragMode = this.settings.canvasMode === "pan";
        button.classList.toggle("is-active", isDragMode);
        button.title = presentation.modeTitle;
        button.setAttribute("aria-label", presentation.modeTitle);
        button.setAttribute("aria-pressed", String(isDragMode));
        const icon = button.querySelector<HTMLElement>('[data-role="canvas-mode-icon"]');
        if (icon) icon.innerHTML = canvasModeIcon(this.settings.canvasMode);
      });
  }

  private setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.rootEl.dataset.view = mode;
    this.options.diagnostics.record(
      "editor",
      "view-mode-changed",
      this.current.id,
      { mode },
    );
    this.updateDiagnosticState({ viewMode: mode });
    this.rootEl
      .querySelectorAll<HTMLElement>('[data-action^="view-"]')
      .forEach((button) => {
        button.classList.toggle(
          "is-active",
          button.dataset.action === `view-${mode}`,
        );
      });
    if (mode !== "outline") {
      this.scheduleSafeResize();
    } else if (this.resizeFrame !== null) {
      window.cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = null;
    }
    this.nodeQuickActions?.scheduleRefresh();
  }

  private scheduleSafeResize(attempt = 0): void {
    if (this.destroyed || !this.map || this.viewMode === "outline") return;
    if (this.resizeFrame !== null)
      window.cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = window.requestAnimationFrame(() => {
      this.resizeFrame = null;
      if (this.destroyed || !this.map || this.viewMode === "outline") return;
      if (!hasNonZeroSize(this.canvasEl)) {
        if (attempt < 8) this.scheduleSafeResize(attempt + 1);
        else {
          this.options.diagnostics.record(
            "editor",
            "resize-skipped-zero-size",
            this.current.id,
            {
              mode: this.viewMode,
            },
            "warning",
            true,
          );
          this.updateDiagnosticState({ canvasWidth: 0, canvasHeight: 0 });
        }
        return;
      }
      try {
        this.map.resize();
        this.updateDiagnosticState();
      } catch (error) {
        this.options.diagnostics.recordError(
          "editor",
          "resize-failed",
          error,
          this.current.id,
          true,
        );
        console.error("[YeMind Zen] safe resize failed", error);
      }
    });
  }

  private bindOutlineDrag(): void {
    this.outlineEl.addEventListener("pointerdown", this.onOutlinePointerDown);
    window.addEventListener("pointermove", this.onOutlinePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", this.onOutlinePointerUp, {
      passive: false,
    });
    window.addEventListener("pointercancel", this.onOutlinePointerCancel);
  }

  private createOutlineDragGhost(row: HTMLElement): HTMLElement {
    const ghost = row.cloneNode(true) as HTMLElement;
    ghost.className = "ymz-outline-drag-ghost";
    ghost.removeAttribute("data-outline-uid");
    ghost
      .querySelectorAll("[contenteditable]")
      .forEach((item) => item.removeAttribute("contenteditable"));
    document.body.appendChild(ghost);
    return ghost;
  }

  private cleanupOutlinePointerDrag(): void {
    const session = this.outlinePointerDrag;
    session?.sourceRow.classList.remove("is-dragging");
    session?.ghost?.remove();
    this.outlinePointerDrag = null;
    this.clearOutlineDropState();
  }

  private clearOutlineDropState(): void {
    this.outlineEl
      .querySelectorAll<HTMLElement>("[data-outline-uid]")
      .forEach((row) => {
        row.classList.remove(
          "is-drop-before",
          "is-drop-inside",
          "is-drop-after",
        );
        row.style.removeProperty("--ymz-outline-drop-depth");
      });
  }

  private outlineDepth(row: HTMLElement): number {
    const value = Number(
      row.style.getPropertyValue("--ymz-outline-depth") ||
        row.getAttribute("aria-level") ||
        1,
    );
    return row.style.getPropertyValue("--ymz-outline-depth")
      ? value
      : Math.max(0, value - 1);
  }

  private collectOutlineAncestors(
    target: HTMLElement,
  ): Array<{ uid: string; depth: number }> {
    const rows = Array.from(
      this.outlineEl.querySelectorAll<HTMLElement>(
        ":scope > [data-outline-uid]",
      ),
    );
    const targetIndex = rows.indexOf(target);
    const targetDepth = this.outlineDepth(target);
    const byDepth = new Map<number, { uid: string; depth: number }>();
    for (let index = targetIndex; index >= 0; index -= 1) {
      const row = rows[index];
      const depth = this.outlineDepth(row);
      if (depth > targetDepth || byDepth.has(depth)) continue;
      const uid = row.dataset.outlineUid ?? "";
      if (uid) byDepth.set(depth, { uid, depth });
      if (depth === 0) break;
    }
    return [...byDepth.values()].sort((a, b) => a.depth - b.depth);
  }

  private isOutlineDescendantRow(
    source: HTMLElement,
    target: HTMLElement,
  ): boolean {
    if (source === target) return true;
    const sourceDepth = this.outlineDepth(source);
    let cursor = source.nextElementSibling as HTMLElement | null;
    while (cursor?.hasAttribute("data-outline-uid")) {
      const depth = this.outlineDepth(cursor);
      if (depth <= sourceDepth) break;
      if (cursor === target) return true;
      cursor = cursor.nextElementSibling as HTMLElement | null;
    }
    return false;
  }

  private findOutlineRowAtPoint(
    clientX: number,
    clientY: number,
  ): HTMLElement | null {
    const pointed = document
      .elementFromPoint?.(clientX, clientY)
      ?.closest<HTMLElement>("[data-outline-uid]");
    if (pointed && this.outlineEl.contains(pointed)) return pointed;
    return (
      Array.from(
        this.outlineEl.querySelectorAll<HTMLElement>(
          ":scope > [data-outline-uid]",
        ),
      ).find((row) => {
        const rect = row.getBoundingClientRect();
        return clientY >= rect.top && clientY <= rect.bottom;
      }) ?? null
    );
  }

  private renderOutline(data: MindMapTree): void {
    const activeEditor = this.outlineRichText?.activeHost ?? null;
    const activeUid =
      activeEditor?.closest<HTMLElement>("[data-outline-uid]")?.dataset
        .outlineUid ?? null;
    const readonly = this.rootEl.dataset.readonly === "true";
    const nextStructureKey = outlineStructureSignature(data);
    const structureChanged = Boolean(
      this.outlineStructureKey && this.outlineStructureKey !== nextStructureKey,
    );
    const visibleUids = structureChanged
      ? new Set(flattenOutline(data).map((row) => row.uid))
      : null;
    this.outlineEl.setAttribute("aria-readonly", String(readonly));

    if (
      this.pendingOutlineFocus ||
      (structureChanged && activeEditor && activeUid)
    ) {
      if (
        !this.pendingOutlineFocus &&
        activeEditor &&
        activeUid &&
        visibleUids?.has(activeUid) &&
        this.outlineRichText
      ) {
        const selection = this.outlineRichText.getSelectionState(activeEditor);
        this.pendingOutlineFocus = {
          uid: activeUid,
          placement: "range",
          start: selection.start,
          end: selection.end,
        };
      }
      this.outlineRichText?.commitAndDetach(
        structureChanged ? "structure-change" : "pending-focus",
      );
      patchOutlineTree(
        this.outlineEl,
        data,
        readonly,
        null,
      );
    } else {
      patchOutlineTree(
        this.outlineEl,
        data,
        readonly,
        activeUid,
      );
    }
    this.outlineStructureKey = nextStructureKey;

    const selectedUid = String(
      this.commands?.getPrimaryNode()?.getData?.("uid") ?? "",
    );
    this.activateOutlineUid(selectedUid);
    this.restorePendingOutlineFocus();
  }

  private restorePendingOutlineFocus(): void {
    const pending = this.pendingOutlineFocus;
    if (!pending) return;
    window.requestAnimationFrame(() => {
      if (
        this.destroyed ||
        !this.pendingOutlineFocus ||
        this.pendingOutlineFocus.uid !== pending.uid
      )
        return;
      const editor = this.findOutlineInput(pending.uid);
      if (!editor || !this.outlineRichText) {
        this.pendingOutlineFocus = null;
        return;
      }
      this.pendingOutlineFocus = null;
      this.outlineRichText.activate(editor, pending.uid, pending);
      this.activateOutlineUid(pending.uid);
    });
  }

  private findOutlineInput(uid: string): HTMLElement | null {
    const row = Array.from(
      this.outlineEl.querySelectorAll<HTMLElement>("[data-outline-uid]"),
    ).find((item) => item.dataset.outlineUid === uid);
    return row?.querySelector<HTMLElement>("[data-outline-editor]") ?? null;
  }

  private commitOutlineRichText(uid: string, html: string): boolean {
    if (!this.commands || this.commands.isReadonly() || !uid) return false;
    this.outlineTextCommitUid = uid;
    try {
      return this.commands.setNodeRichTextByUid(uid, html);
    } finally {
      this.outlineTextCommitUid = null;
    }
  }

  private handleOutlineKeydown(event: KeyboardEvent): void {
    const editor = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-outline-editor]",
    );
    const row = editor?.closest<HTMLElement>("[data-outline-uid]");
    if (
      !editor ||
      !row ||
      !this.commands ||
      !this.outlineRichText ||
      this.outlineStructureBusy
    )
      return;
    const uid = row.dataset.outlineUid ?? "";
    if (this.outlineRichText.activeHost !== editor)
      this.outlineRichText.activate(editor, uid);
    const selection = this.outlineRichText.getSelectionState(editor);
    const isRoot = row.dataset.outlineRoot === "true";
    const action = resolveOutlineKeyAction({
      key: event.key,
      empty: selection.text.trim().length === 0,
      isRoot,
      readonly: this.commands.isReadonly(),
      hasChildren: row.dataset.outlineHasChildren === "true",
      expanded: row.dataset.outlineExpanded === "true",
      atStart: selection.start === 0 && selection.end === 0,
      atEnd:
        selection.start === selection.length &&
        selection.end === selection.length,
      composing: event.isComposing || this.outlineRichText.isComposing,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    });
    if (action === "none" || action === "hard-break") return;
    event.preventDefault();
    event.stopPropagation();

    if (action === "cancel") {
      this.outlineRichText.cancel();
      editor.blur();
      return;
    }
    if (action === "previous" || action === "next") {
      this.focusOutlineNeighbor(editor, action === "previous" ? -1 : 1);
      return;
    }
    if (action === "delete-empty") {
      const focusUid = this.outlineDeleteFocusUid(row);
      this.outlineStructureBusy = true;
      try {
        this.pendingOutlineFocus = focusUid
          ? { uid: focusUid, placement: "end" }
          : null;
        this.outlineRichText.discardAndDetach("delete-empty");
        if (!this.commands.removeNodeByUid(uid)) this.pendingOutlineFocus = null;
      } finally {
        this.outlineStructureBusy = false;
      }
      return;
    }

    this.outlineStructureBusy = true;
    try {
      this.outlineRichText.flush(editor);
      if (action === "collapse" || action === "expand") {
        this.pendingOutlineFocus = {
          uid,
          placement: action === "collapse" ? "start" : "end",
        };
        this.setOutlineExpanded(uid, action === "expand");
        return;
      }
      if (action === "indent" || action === "outdent") {
        this.pendingOutlineFocus = { uid, placement: "start" };
        const changed =
          action === "indent"
            ? this.commands.indentNodeByUid(uid)
            : this.commands.outdentNodeByUid(uid);
        if (!changed) this.pendingOutlineFocus = null;
        return;
      }

      const newUid = createOutlineUid();
      this.pendingOutlineFocus = { uid: newUid, placement: "start" };
      const inserted =
        action === "insert-child"
          ? this.commands.insertChildByUid(uid, newUid)
          : this.commands.insertSiblingByUid(uid, newUid);
      if (!inserted) this.pendingOutlineFocus = null;
    } finally {
      this.outlineStructureBusy = false;
    }
  }

  private setOutlineExpanded(uid: string, expanded: boolean): void {
    if (!uid || !this.commands) return;
    if (this.commands.setNodeExpandedByUid(uid, expanded)) {
      this.nodeQuickActions?.scheduleRefresh();
    }
  }

  private outlineDeleteFocusUid(row: HTMLElement): string | null {
    const rows = Array.from(
      this.outlineEl.querySelectorAll<HTMLElement>(":scope > [data-outline-uid]"),
    );
    const index = rows.indexOf(row);
    if (index < 0) return null;
    const candidate = rows[index - 1] ?? rows[index + 1] ?? null;
    return candidate?.dataset.outlineUid || null;
  }

  private focusOutlineNeighbor(editor: HTMLElement, offset: number): void {
    if (!this.outlineRichText) return;
    const editors = Array.from(
      this.outlineEl.querySelectorAll<HTMLElement>("[data-outline-editor]"),
    );
    const current = editors.indexOf(editor);
    const target = editors[current + offset];
    const uid =
      target?.closest<HTMLElement>("[data-outline-uid]")?.dataset.outlineUid ??
      "";
    if (!target || !uid) return;
    this.outlineRichText.flush(editor);
    this.outlineRichText.activate(target, uid, {
      placement: offset < 0 ? "end" : "start",
    });
    this.commands?.goToNode(uid);
    this.activateOutlineUid(uid);
  }

  private activateOutlineUid(uid: string): void {
    this.outlineEl
      .querySelectorAll<HTMLElement>("[data-outline-uid]")
      .forEach((row) => {
        row.classList.toggle(
          "is-active",
          Boolean(uid) && row.dataset.outlineUid === uid,
        );
      });
  }

  private openSearchPanel(): void {
    this.searchPanelEl.hidden = false;
    setSearchReplaceExpanded(this.searchPanelEl, false);
    this.searchInputEl.focus();
    this.searchInputEl.select();
  }

  private closeSearchPanel(): void {
    this.commands?.endSearch();
    this.searchText = "";
    this.searchPanelEl.hidden = true;
    this.updateSearchInfo({ currentIndex: -1, total: 0 });
    this.canvasEl.focus();
  }

  private handleSearchAction(action: string): void {
    if (action === "toggle-replace") {
      const expanded = this.searchPanelEl.dataset.replaceExpanded !== "true";
      setSearchReplaceExpanded(this.searchPanelEl, expanded);
      if (expanded) this.replaceInputEl.focus();
      return;
    }
    if (action === "next") this.performSearch("next");
    else if (action === "previous") this.performSearch("previous");
    else if (action === "replace") this.replaceCurrentSearch();
    else if (action === "replace-all") this.replaceAllSearch();
    else if (action === "close") this.closeSearchPanel();
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

  private performSearch(direction: "next" | "previous"): void {
    if (!this.commands) return;
    const previousText = this.searchText;
    if (!this.ensureSearch()) return;
    if (previousText !== this.searchText) return;
    if (direction === "previous") this.commands.searchPrevious();
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

  private updateSearchInfo(info: {
    currentIndex: number;
    total: number;
  }): void {
    const current =
      info.total > 0 && info.currentIndex >= 0 ? info.currentIndex + 1 : 0;
    this.searchInfoEl.textContent = info.total > 0
      ? `${current} / ${Math.max(0, info.total)}`
      : "无结果";
  }

  private openCheckpointMenu(anchor: HTMLElement): void {
    const menu = new Menu("siyuan-yemind-zen-checkpoint-menu");
    menu.addItem({
      icon: "iconAdd",
      label: "创建检查点",
      click: () => {
        void this.createCheckpoint();
      },
    });
    menu.addItem({
      icon: "iconHistory",
      label: "管理检查点",
      click: () => this.openCheckpointManager(),
    });
    const rect = anchor.getBoundingClientRect();
    menu.open({ x: rect.left, y: rect.bottom + 4 });
  }

  private async createCheckpoint(): Promise<void> {
    try {
      await this.saveNow();
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      const defaultName = `检查点 ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const name = await promptText("创建检查点", defaultName, "检查点名称");
      if (!name) return;
      await this.options.checkpointService.createManual(this.current.id, name);
      showMessage("检查点已创建");
    } catch (error) {
      console.error("[YeMind Zen] create checkpoint failed", error);
      showMessage("检查点创建失败，请先确认导图已成功保存", 5000, "error");
    }
  }

  private openCheckpointManager(): void {
    openCheckpointManager({
      mapId: this.current.id,
      mapTitle: this.current.title,
      readonly: this.rootEl.dataset.readonly === "true",
      repository: this.options.checkpointRepository,
      service: this.options.checkpointService,
      onBeforeRestore: async () => {
        await this.saveNow();
      },
      onRestored: async (restored) => {
        await this.applyRestoredMap(restored);
      },
    });
  }

  private async applyRestoredMap(restored: YeMindMapDocument): Promise<void> {
    if (!this.map || this.destroyed) return;
    this.applyingCheckpoint = true;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    try {
      this.current = restored;
      this.current.theme = normalizeThemePresetId(restored.theme);
      this.current.lineStyle = normalizeLineStyle(restored.lineStyle);
      this.current.projectStyle = normalizeProjectStyle(restored.projectStyle);
      const viewData = normalizePersistedViewData(restored.viewData);
      if (this.viewMode !== "outline" && hasNonZeroSize(this.canvasEl))
        this.map.resize();
      this.map.setFullData({
        root: restored.data,
        layout: restored.layout,
        theme: { template: "default" },
        view: viewData,
      });
      const layoutSelect = this.rootEl.querySelector<HTMLSelectElement>(
        '[data-action="layout"]',
      );
      if (layoutSelect) layoutSelect.value = restored.layout;
      const themeSelect = this.rootEl.querySelector<HTMLSelectElement>(
        '[data-action="theme"]',
      );
      if (themeSelect) themeSelect.value = this.current.theme;
      const lineStyleSelect = this.rootEl.querySelector<HTMLSelectElement>(
        '[data-action="line-style"]',
      );
      if (lineStyleSelect) lineStyleSelect.value = this.current.lineStyle;
      this.projectStylePanel?.setStyle(this.current.projectStyle);
      this.applyMapAppearance();
      if (!viewData) {
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => {
            if (this.viewMode !== "outline" && hasNonZeroSize(this.canvasEl)) {
              this.map?.resize();
              this.map?.view.fit();
            }
            resolve();
          });
        });
      }
      this.updateStats(restored.data);
      this.renderOutline(restored.data);
      this.updateZoom();
      const revision = this.saveRevisions.markChanged();
      this.saveRevisions.markSaved(revision);
      this.saveStateEl.textContent = "已恢复";
    } finally {
      this.applyingCheckpoint = false;
    }
  }

  private openLink(href: string): void {
    if (!href || href === "about:blank") return;
    const navigation = resolveLinkNavigation(
      href,
      this.settings.externalLinkMode,
    );
    if (!navigation) {
      showMessage("链接地址无效或协议不受支持", 3000, "error");
      return;
    }
    if (
      navigation.target === "siyuan" ||
      navigation.target === "current-window"
    ) {
      window.location.href = navigation.href;
      return;
    }
    window.open(navigation.href, "_blank", "noopener,noreferrer");
  }

  private activateNode(node: any): void {
    if (!this.map || !node) return;
    const renderer = (this.map as any).renderer;
    const activeList = Array.isArray(renderer?.activeNodeList)
      ? renderer.activeNodeList
      : [];
    if (activeList.includes(node)) {
      promoteNodeToPrimary(renderer, node);
      return;
    }
    renderer?.clearActiveNodeList?.();
    if (typeof node.active === "function") node.active();
    else renderer?.addNodeToActiveList?.(node);
  }

  private activateOnlyNode(node: any): void {
    if (!this.map || !node) return;
    const renderer = (this.map as any).renderer;
    renderer?.clearActiveNodeList?.();
    if (typeof node.active === "function") node.active();
    else renderer?.addNodeToActiveList?.(node);
  }

  private async applyNodeImageFile(
    file: File,
    node: any,
    source: "paste" | "drop",
  ): Promise<void> {
    if (!this.commands || this.commands.isReadonly()) return;
    const loaded = await loadImageFileSelection(file, {
      read: (selected) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.onerror = () =>
            reject(reader.error ?? new Error("Image file read failed"));
          reader.readAsDataURL(selected);
        }),
      measure: (dataUrl) =>
        new Promise<{ width: number; height: number }>((resolve, reject) => {
          const image = new Image();
          image.onload = () =>
            resolve({
              width: image.naturalWidth || 240,
              height: image.naturalHeight || 160,
            });
          image.onerror = () =>
            reject(new Error("Image dimensions could not be measured"));
          image.src = dataUrl;
        }),
      onError: (error) => {
        console.error("[YeMind Zen] node image input failed", error);
        showMessage("图片读取失败，请重试", 4000, "error");
      },
    });
    if (!loaded || this.destroyed || !this.map || !this.commands) return;
    this.activateOnlyNode(node);
    this.commands.setImage({
      url: loaded.dataUrl,
      title: file.name,
      width: loaded.size.width,
      height: loaded.size.height,
      custom: false,
    });
    this.options.diagnostics.record("node-image", source, this.current.id, {
      name: file.name,
      width: loaded.size.width,
      height: loaded.size.height,
    });
  }

  private scheduleSave(): void {
    if (this.destroyed) return;
    const revision = this.saveRevisions.markChanged();
    this.saveStateEl.textContent = "保存中…";
    this.updateDiagnosticState({ saveState: "saving" });
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.persist(revision);
    }, this.settings.autosaveDelayMs);
  }

  private flushPendingSave(): void {
    void this.saveNow().catch((error) => {
      console.error("[YeMind Zen] close-time save failed", error);
    });
  }

  private async saveNow(): Promise<void> {
    if (!this.map || this.destroyed || !this.saveRevisions.isDirty()) return;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    await this.persist(this.saveRevisions.current(), true);
  }

  private async persist(revision: number, throwOnError = false): Promise<void> {
    if (!this.map || this.destroyed) return;
    this.options.diagnostics.record("save", "started", this.current.id, {
      revision,
    });
    try {
      const sanitized = sanitizeAssociativeLines(
        this.map.getData(false) as MindMapTree,
      );
      const patch = {
        data: sanitized.tree,
        layout: this.map.getLayout(),
        theme: normalizeThemePresetId(this.current.theme),
        lineStyle: normalizeLineStyle(this.current.lineStyle),
        projectStyle: normalizeProjectStyle(this.current.projectStyle),
        viewData: normalizePersistedViewData(this.map.view.getTransformData()),
      };
      this.current.data = sanitized.tree;
      this.current.layout = patch.layout;
      this.current.theme = patch.theme;
      this.current.lineStyle = patch.lineStyle;
      this.current.projectStyle = patch.projectStyle;
      await this.options.repository.update(this.current.id, patch);
      if (!this.destroyed && this.saveRevisions.markSaved(revision)) {
        this.saveStateEl.textContent = "已保存";
        this.options.diagnostics.record("save", "completed", this.current.id, {
          revision,
        });
        this.updateDiagnosticState({ saveState: "saved" });
      }
    } catch (error) {
      this.options.diagnostics.recordError(
        "save",
        "failed",
        error,
        this.current.id,
        true,
      );
      console.error("[YeMind Zen] save failed", error);
      if (!this.destroyed && revision === this.saveRevisions.current()) {
        this.saveStateEl.textContent = "保存失败";
        this.updateDiagnosticState({ saveState: "failed" });
        showMessage("YeMind Zen 保存失败", 5000, "error");
      }
      if (throwOnError) throw error;
    }
  }

  private updateStats(data: MindMapTree): void {
    const stats = calculateEditorStats(data);
    this.statsEl.textContent = `roots ${stats.roots} · nodes ${stats.nodes} · words ${stats.words}`;
  }

  private updateZoom(): void {
    const scale = Number((this.map?.view as any)?.scale ?? 1);
    this.zoomEl.textContent = `${Math.round(scale * 100)}%`;
    this.updateDiagnosticState({ zoom: scale });
  }

  private updateDiagnosticState(
    patch: Partial<{
      mounted: boolean;
      readonly: boolean;
      viewMode: string;
      selectedNodeCount: number;
      nodeCount: number;
      canvasWidth: number;
      canvasHeight: number;
      zoom: number;
      saveState: string;
    }> = {},
  ): void {
    const stats = calculateEditorStats(this.current.data);
    const rect = this.canvasEl?.getBoundingClientRect?.();
    this.options.diagnostics.setEditorState(this.current.id, {
      mounted: !this.destroyed,
      readonly: this.rootEl?.dataset.readonly === "true",
      viewMode: this.viewMode,
      selectedNodeCount: Number(
        this.selectionCountEl?.textContent?.replace(/\D/g, "") || 0,
      ),
      nodeCount: stats.nodes,
      canvasWidth: Math.round(rect?.width ?? this.canvasEl?.clientWidth ?? 0),
      canvasHeight: Math.round(
        rect?.height ?? this.canvasEl?.clientHeight ?? 0,
      ),
      zoom: Number((this.map?.view as any)?.scale ?? 1),
      saveState: this.saveStateEl?.textContent ?? "unknown",
      ...patch,
    });
  }

  private setReadonly(enabled: boolean): void {
    if (!this.map) return;
    this.rootEl.dataset.readonly = String(enabled);
    this.rootEl
      .querySelectorAll<HTMLElement>('[data-action="readonly"]')
      .forEach((button) => {
        button.classList.toggle("is-active", enabled);
        button.setAttribute("aria-pressed", String(enabled));
      });
    this.replaceInputEl.disabled = enabled;
    this.rootEl
      .querySelectorAll<HTMLButtonElement>(
        '[data-search-action="replace"], [data-search-action="replace-all"]',
      )
      .forEach((button) => {
        button.disabled = enabled;
      });
    this.relationPanelEl
      .querySelectorAll<HTMLButtonElement>(
        '[data-relation-action="edit"], [data-relation-action="delete"]',
      )
      .forEach((button) => {
        button.disabled = enabled;
      });
    if (enabled && this.commands?.isRelationCreating())
      this.commands.cancelRelation();
    this.richTextToolbar?.setEnabled(
      this.settings.showRichTextToolbar && !enabled,
    );
    this.outlineRichText?.setReadonly(enabled);
    this.map.setMode(enabled ? "readonly" : "edit");
    this.renderOutline(this.current.data);
    this.options.diagnostics.record(
      "editor",
      "readonly-changed",
      this.current.id,
      { enabled },
    );
    this.updateDiagnosticState({ readonly: enabled });
    this.updateToolbarAvailability();
    this.updateRelationPresentation();
    this.updateOuterFramePresentation();
    this.nodeStylePanel?.refresh();
    this.nodeQuickActions?.scheduleRefresh();
  }

  private toggleZen(enabled: boolean): void {
    this.rootEl.dataset.zen = String(enabled);
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.rootEl.requestFullscreen();
    } catch (error) {
      console.error("[YeMind Zen] fullscreen failed", error);
      showMessage("当前环境无法切换全屏", 3000, "error");
    }
  }

  private openHelp(): void {
    const dialog = new Dialog({
      title: "YeMind Zen 快速操作",
      content: `<div class="b3-dialog__content ymz-help">
        <p><b>双击</b> 编辑节点</p>
        <p><b>Tab</b> 添加子节点，<b>Enter</b> 添加同级节点</p>
        <p><b>选中文字</b> 使用格式、行内链接、模糊、公式与代码工具</p>
        <p><b>右键节点</b> 直接切换待办，打开批注、概要、外框与关联线</p>
        <p><b>选（选择优先）</b>：左键框选，右键拖动画布</p>
        <p><b>拖（拖动优先）</b>：左键拖动画布，Ctrl/Cmd + 左键框选</p>
        <p><b>Ctrl/Cmd + 单击</b>：Ctrl/Cmd + 单击：增减节点选择</p>
        <p><b>批量移动</b>：拖动任一已选节点：批量移动最上层所选子树</p>
        <p><b>检查点</b> 创建命名快照；恢复前会自动保存当前状态为保护检查点</p>
        <p><b>Ctrl/Cmd + F</b> 搜索节点，顶部可切换导图、分屏和大纲</p>
      </div>`,
      width: "460px",
    });
    void dialog;
  }
}

function createOutlineUid(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `outline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
}
