import MindMap from 'simple-mind-map';
import type { MindMapTree } from '../model/types';
import { registerMindMapPlugins } from './registerPlugins';
import { registerMindMapLayouts } from './registerLayouts';
import type { YeMindSettings } from '../settings/SettingsStore';
import { createNodePrefixContent, createNodePostfixContent, createYemindIconList } from './nodeDecorations';
import { buildDragAndLayoutOptions, normalizePersistedViewData } from './dragBehavior';
import { buildRelationOptions } from './relationConfig';
import { buildOuterFrameOptions } from './outerFrameConfig';
import {
  disableUpstreamStructuralInsertShortcuts,
  resolveUpstreamShortcutAction,
} from '../editor/shortcutSafety';
import { buildThemeConfig, detectAppearance, type YeMindLineStyle } from './themePresets';
import { configureThemeColorRuntime, installThemeColorRuntime } from './themeColorRuntime';
import { stabilizeMindMapMeasurementHost } from './measurementHost';
import { installHistoryTransactionCoordinator } from './historyTransactionCoordinator';

export interface CreateMindMapOptions {
  el: HTMLElement;
  data: MindMapTree;
  viewData?: Record<string, unknown>;
  theme?: string;
  lineStyle?: YeMindLineStyle;
  layout?: string;
  readonly?: boolean;
  settings?: YeMindSettings;
  onHyperlink?: (href: string) => void;
  onDeleteShortcut?: () => void;
  onConfirmDeleteImage?: (node: any) => Promise<boolean>;
  pluginBaseUrl?: string;
}


export function createImageDeleteGuard(
  confirmDelete?: (node: any) => Promise<boolean>,
): (node: any) => Promise<boolean> {
  return async (node: any): Promise<boolean> => {
    if (!confirmDelete) return false;
    const confirmed = await confirmDelete(node);
    return !confirmed;
  };
}

export function createMindMap(options: CreateMindMapOptions): MindMap {
  registerMindMapLayouts();
  registerMindMapPlugins(options.settings);
  const settings = options.settings;
  const behavior = settings ? buildDragAndLayoutOptions(settings) : null;
  const relationOptions = settings ? buildRelationOptions(settings) : null;
  const outerFrameOptions = settings ? buildOuterFrameOptions(settings) : null;
  const appearance = buildThemeConfig({
    presetId: options.theme,
    appearance: detectAppearance(),
    lineStyle: options.lineStyle,
    spacingConfig: behavior?.themeConfig,
  });
  const viewData = settings?.restoreSavedView === false
    ? undefined
    : normalizePersistedViewData(options.viewData);

  const editorRoot = options.el.closest<HTMLElement>('.ymz-editor') ?? options.el;

  const mindMap = new MindMap({
    el: options.el,
    customInnerElsAppendTo: editorRoot,
    data: options.data,
    viewData,
    theme: 'default',
    themeConfig: appearance.themeConfig,
    rainbowLinesConfig: appearance.rainbow,
    layout: options.layout ?? 'logicalStructure',
    readonly: Boolean(options.readonly),
    disabledClipboard: true,
    enableFreeDrag: false,
    autoMoveWhenMouseInEdgeOnDrag: behavior?.autoMoveWhenMouseInEdgeOnDrag ?? false,
    dragPlaceholderLineConfig: { color: '#27896b', width: 2, dasharray: '7,5' },
    isLimitMindMapInCanvas: behavior?.isLimitMindMapInCanvas ?? false,
    minZoomRatio: behavior?.minZoomRatio ?? 20,
    maxZoomRatio: behavior?.maxZoomRatio ?? 400,
    fitPadding: behavior?.fitPadding ?? 50,
    defaultGeneralizationText: relationOptions?.defaultGeneralizationText ?? '概要',
    defaultAssociativeLineText: relationOptions?.defaultAssociativeLineText ?? '关联',
    associativeLineIsAlwaysAboveNode: relationOptions?.associativeLineIsAlwaysAboveNode ?? true,
    enableAdjustAssociativeLinePoints: relationOptions?.enableAdjustAssociativeLinePoints ?? true,
    defaultOuterFrameText: outerFrameOptions?.defaultOuterFrameText ?? '外框',
    outerFramePaddingX: outerFrameOptions?.outerFramePaddingX ?? 10,
    outerFramePaddingY: outerFrameOptions?.outerFramePaddingY ?? 10,
    enableCtrlKeyNodeSelection: true,
    useLeftKeySelectionRightKeyDrag: settings?.canvasMode === 'select',
    mousewheelAction: settings?.wheelMode === 'zoom' ? 'zoom' : 'move',
    disableMouseWheelZoom: settings?.wheelMode === 'none',
    mousewheelMoveStep: 60,
    selectTextOnEnterEditText: true,
    isEndNodeTextEditOnClickOuter: true,
    enableDragModifyNodeWidth: true,
    isShowCreateChildBtnIcon: false,
    notShowExpandBtn: true,
    fit: Boolean(settings?.autoFitOnOpen ?? true) && !viewData,
    // Install YeMind's flushable history transaction after construction.
    // The upstream opaque timer cannot be committed atomically before undo.
    addHistoryOnInit: false,
    defaultInsertSecondLevelNodeText: '新节点',
    defaultInsertBelowSecondLevelNodeText: '新节点',
    iconList: createYemindIconList(options.pluginBaseUrl),
    createNodePrefixContent,
    createNodePostfixContent,
    // YeMind owns the revisioned live-edit render transaction so a trailing
    // upstream debounce cannot repaint a node after it was moved or deleted.
    openRealtimeRenderOnNodeTextEdit: false,
    enableEditFormulaInRichTextEdit: true,
    customHyperlinkJump: (href: string) => options.onHyperlink?.(href),
    beforeDeleteNodeImg: createImageDeleteGuard(options.onConfirmDeleteImage),
    beforeShortcutRun: (shortcut: string, nodes: any[]) => {
      const action = resolveUpstreamShortcutAction(
        shortcut,
        nodes,
        options.el.closest<HTMLElement>('.ymz-editor')?.dataset.readonly === 'true',
      );
      if (action === 'safe-delete') options.onDeleteShortcut?.();
      return action !== 'allow';
    },
    errorHandler: (_code: unknown, error: unknown) => console.error('[YeMind]', error),
  } as any);
  disableUpstreamStructuralInsertShortcuts((mindMap as any).keyCommand);
  installHistoryTransactionCoordinator(mindMap as any, { seed: true });
  stabilizeMindMapMeasurementHost(mindMap as any, editorRoot);
  installThemeColorRuntime(mindMap);
  configureThemeColorRuntime(mindMap, {
    appearance: appearance.colorAppearance,
    useThemeLineColors: true,
    rootBackground: String(appearance.themeConfig.backgroundColor ?? appearance.colorAppearance.background),
  });
  return mindMap;
}
