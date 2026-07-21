import MindMap from 'simple-mind-map';
import type { MindMapTree } from '../model/types';
import { registerMindMapPlugins } from './registerPlugins';
import type { YeMindSettings } from '../settings/SettingsStore';
import { createNodePrefixContent, createNodePostfixContent, YEMIND_ICON_LIST } from './nodeDecorations';
import { buildDragAndLayoutOptions, normalizePersistedViewData } from './dragBehavior';
import { buildRelationOptions } from './relationConfig';
import { buildOuterFrameOptions } from './outerFrameConfig';
import { shouldBlockUpstreamShortcut } from '../editor/shortcutSafety';

export interface CreateMindMapOptions {
  el: HTMLElement;
  data: MindMapTree;
  viewData?: Record<string, unknown>;
  theme?: string;
  layout?: string;
  readonly?: boolean;
  settings?: YeMindSettings;
  onHyperlink?: (href: string) => void;
}

export function createMindMap(options: CreateMindMapOptions): MindMap {
  registerMindMapPlugins(options.settings);
  const settings = options.settings;
  const behavior = settings ? buildDragAndLayoutOptions(settings) : null;
  const relationOptions = settings ? buildRelationOptions(settings) : null;
  const outerFrameOptions = settings ? buildOuterFrameOptions(settings) : null;
  const viewData = settings?.restoreSavedView === false
    ? undefined
    : normalizePersistedViewData(options.viewData);

  return new MindMap({
    el: options.el,
    data: options.data,
    viewData,
    theme: options.theme ?? 'default',
    themeConfig: behavior?.themeConfig,
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
    isShowCreateChildBtnIcon: settings?.showQuickCreate ?? true,
    fit: Boolean(settings?.autoFitOnOpen ?? true) && !viewData,
    addHistoryOnInit: true,
    defaultInsertSecondLevelNodeText: '新节点',
    defaultInsertBelowSecondLevelNodeText: '新节点',
    iconList: YEMIND_ICON_LIST,
    createNodePrefixContent,
    createNodePostfixContent,
    openRealtimeRenderOnNodeTextEdit: true,
    enableEditFormulaInRichTextEdit: true,
    customHyperlinkJump: (href: string) => options.onHyperlink?.(href),
    beforeShortcutRun: (shortcut: string, nodes: any[]) => shouldBlockUpstreamShortcut(
      shortcut,
      nodes,
      options.el.closest<HTMLElement>('.ymz-editor')?.dataset.readonly === 'true',
    ),
    errorHandler: (_code: unknown, error: unknown) => console.error('[YeMind Zen]', error),
  } as any);
}
