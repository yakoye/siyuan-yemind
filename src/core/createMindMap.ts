import MindMap from 'simple-mind-map';
import type { MindMapTree } from '../model/types';
import { registerMindMapPlugins } from './registerPlugins';
import type { YeMindSettings } from '../settings/SettingsStore';
import { createNodePostfixContent, YEMIND_ICON_LIST } from './nodeDecorations';

export interface CreateMindMapOptions {
  el: HTMLElement;
  data: MindMapTree;
  viewData?: Record<string, unknown>;
  theme?: string;
  layout?: string;
  readonly?: boolean;
  settings?: YeMindSettings;
}

export function createMindMap(options: CreateMindMapOptions): MindMap {
  registerMindMapPlugins(options.settings);
  const settings = options.settings;
  return new MindMap({
    el: options.el,
    data: options.data,
    viewData: options.viewData,
    theme: options.theme ?? 'default',
    layout: options.layout ?? 'logicalStructure',
    readonly: Boolean(options.readonly),
    enableFreeDrag: true,
    enableCtrlKeyNodeSelection: true,
    useLeftKeySelectionRightKeyDrag: settings?.canvasMode === 'select',
    mousewheelAction: settings?.wheelMode === 'zoom' ? 'zoom' : 'move',
    disableMouseWheelZoom: settings?.wheelMode === 'none',
    mousewheelMoveStep: 60,
    selectTextOnEnterEditText: true,
    isEndNodeTextEditOnClickOuter: true,
    enableDragModifyNodeWidth: true,
    isShowCreateChildBtnIcon: settings?.showQuickCreate ?? true,
    fit: settings?.autoFitOnOpen ?? true,
    addHistoryOnInit: true,
    defaultInsertSecondLevelNodeText: '新节点',
    defaultInsertBelowSecondLevelNodeText: '新节点',
    iconList: YEMIND_ICON_LIST,
    createNodePostfixContent,
    openRealtimeRenderOnNodeTextEdit: true,
    enableEditFormulaInRichTextEdit: true,
    errorHandler: (_code: unknown, error: unknown) => console.error('[YeMind Zen]', error),
  } as any);
}
