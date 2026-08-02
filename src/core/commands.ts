import type MindMap from 'simple-mind-map';
import type { MindMapTree } from '../model/types';
import { toggleTodo as nextTodo, type NodeComment, type NodeTodo } from '../content/nodeContentState';
import type { NodeNote } from '../content/nodeNoteState';
import { deleteCodeBlock, findCurrentCodeBlock, removeCodeBlockFormat, replaceCodeBlock, type CodeBlockSnapshot } from '../editor/codeBlock';
import type { RichTextFormattingTarget } from '../editor/richTextTarget';
import { normalizeNodeStylePatch, nodeStyleSnapshot, type NodeStylePatch } from '../editor/nodeStyle';
import { addCombinedSummary } from './combinedSummary';
import { CLIPART_GEOMETRY_VERSION } from './clipartGeometry';
import { collapseAllBranches, collapseBranchDeep, expandAllBranches, expandBranchDeep, expandBranchOneLevel, toggleAllExpansion, toggleBranchDeep, toggleBranchExpansion } from './expandState';
import {
  findSearchMatches,
  plainTextFromSearchValue,
  replaceSearchMatches,
  replaceSearchMatchesInHtml,
  type SearchOptions,
} from '../editor/searchEngine';
import { steppedZoomPercent } from '../editor/zoomPercent';

export interface NodeImageInput {
  url: string | null;
  title?: string;
  width?: number;
  height?: number;
  custom?: boolean;
}

export interface YeMindCommands extends RichTextFormattingTarget {
  isReadonly(): boolean;
  hasRichTextSelection(): boolean;
  addChild(): void;
  addSibling(): void;
  addParent(): void;
  moveUp(): void;
  moveDown(): void;
  toggleExpand(): void;
  toggleBranchExpandByUid(uid: string): boolean;
  expandBranchDeepByUid(uid: string): boolean;
  collapseBranchDeepByUid(uid: string): boolean;
  remove(): void;
  removeOnlyCurrent(): void;
  undo(): void;
  redo(): void;
  fit(): void;
  centerRoot(): void;
  expandAll(): void;
  collapseAll(): void;
  toggleAllExpand(): void;
  resetZoom(): void;
  resetLayout(): void;
  zoomIn(): void;
  zoomOut(): void;
  edit(): void;
  copy(): void;
  cut(): void;
  paste(): Promise<void>;
  pastePlainText(): Promise<void>;
  getActiveNodes(): any[];
  getPrimaryNode(): any | null;
  getPrimaryNodeData(): Record<string, any> | null;
  getActiveNodeStyle(): NodeStylePatch | null;
  setActiveNodeStyle(patch: Record<string, unknown>): void;
  resetActiveNodeStyle(): void;
  getSelectedText(): string;
  getSelectedInlineLink(): string;
  setInlineLink(link: string | null): void;
  toggleInlineCode(): void;
  getCodeBlock(): CodeBlockSnapshot | null;
  saveCodeBlock(code: string, language?: string): void;
  removeCodeBlockFormat(): void;
  deleteCodeBlock(): void;
  setTags(tags: string[]): void;
  setIcons(icons: string[]): void;
  setIconsByUid(uid: string, icons: string[]): void;
  setLink(link: string, title?: string): void;
  setImage(image: NodeImageInput): void;
  clearImageByUid(uid: string): void;
  setClipart(image: NodeImageInput & { id: string }): void;
  clearClipart(): void;
  clearClipartByUid(uid: string): void;
  insertFormula(formula: string, mode?: 'inline' | 'block'): void;
  insertSymbol(symbol: string, targetUid?: string): boolean;
  addSummary(): void;
  removeSummary(): void;
  startRelation(): boolean;
  isRelationCreating(): boolean;
  hasActiveRelation(): boolean;
  cancelRelation(): void;
  editActiveRelationText(): void;
  removeActiveRelation(): void;
  canAddOuterFrame(): boolean;
  hasOuterFrameForSelection(): boolean;
  addOuterFrame(): void;
  removeOuterFrameForSelection(): void;
  hasActiveOuterFrame(): boolean;
  editActiveOuterFrameText(): void;
  updateActiveOuterFrame(config: Record<string, unknown>): void;
  removeActiveOuterFrame(): void;
  getActiveOuterFrameStyle(): Record<string, unknown> | null;
  toggleTodo(): void;
  getTodo(): NodeTodo | null;
  setTodo(todo: NodeTodo | null): void;
  setComments(comments: NodeComment[]): void;
  setNote(note: NodeNote | null): void;
  formatText(config: Record<string, unknown>): void;
  clearTextFormat(): void;
  setCloze(enabled: boolean): void;
  search(text: string, options?: SearchOptions): void;
  searchNext(): void;
  searchPrevious(): void;
  replaceSearch(text: string, options?: SearchOptions): void;
  replaceSearchAll(text: string, options?: SearchOptions): void;
  endSearch(): void;
  goToNode(uid: string): void;
  setNodeTextByUid(uid: string, text: string): boolean;
  setNodeRichTextByUid(uid: string, html: string): boolean;
  insertSiblingByUid(uid: string, newUid: string): boolean;
  insertChildByUid(uid: string, newUid: string): boolean;
  addChildByUid(uid: string): boolean;
  pasteNodeTreesByUid(uid: string, nodes: readonly MindMapTree[]): boolean;
  removeNodeByUid(uid: string): boolean;
  indentNodeByUid(uid: string): boolean;
  outdentNodeByUid(uid: string): boolean;
  setNodeExpandedByUid(uid: string, expanded: boolean): boolean;
  moveNodeByUid(uid: string, targetUid: string, position: 'before' | 'inside' | 'after'): boolean;
  replaceTree(data: MindMapTree): boolean;
}

export function createCommandAdapter(mindMap: MindMap): YeMindCommands {
  const activeNodes = (): any[] => Array.isArray((mindMap.renderer as any)?.activeNodeList)
    ? (mindMap.renderer as any).activeNodeList
    : [];
  const primaryNode = (): any | null => activeNodes()[0] ?? null;
  const isReadonly = (): boolean => Boolean(
    (mindMap as any).getConfig?.('readonly') ?? (mindMap as any).opt?.readonly,
  );
  const canMutate = (): boolean => !isReadonly();
  const replayHistory = (name: 'BACK' | 'FORWARD'): void => {
    const map = mindMap as any;
    const command = map.command;
    command?.yemindFlushHistory?.();
    command?.yemindBeginHistoryReplay?.();

    let completed = false;
    let fallback: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (completed) return;
      completed = true;
      if (fallback !== null) clearTimeout(fallback);
      map.off?.('node_tree_render_end', onRenderEnd);
      command?.yemindCancelHistory?.();
      command?.yemindEndHistoryReplay?.();
    };
    const onRenderEnd = () => {
      map.off?.('node_tree_render_end', onRenderEnd);
      setTimeout(finish, 0);
    };

    if (typeof map.on === 'function' && typeof map.off === 'function') {
      map.on('node_tree_render_end', onRenderEnd);
      fallback = setTimeout(finish, 1000);
    }
    try {
      mindMap.execCommand(name);
    } finally {
      if (typeof map.on !== 'function' || typeof map.off !== 'function') finish();
    }
  };
  const stepZoom = (direction: 'in' | 'out'): void => {
    const view = (mindMap as any).view;
    const current = Number(view?.scale) * 100;
    const min = Number((mindMap as any).opt?.minZoomRatio ?? 20);
    const max = Number((mindMap as any).opt?.maxZoomRatio ?? 400);
    const target = steppedZoomPercent(current, direction, min, max);
    if (typeof view?.setScale === 'function') {
      const width = Number((mindMap as any).width);
      const height = Number((mindMap as any).height);
      if (Number.isFinite(width) && Number.isFinite(height)) {
        view.setScale(target / 100, width / 2, height / 2);
      } else {
        view.setScale(target / 100);
      }
      return;
    }
    view?.[direction === 'in' ? 'enlarge' : 'narrow']?.(undefined, undefined, false);
  };
  const forEachActive = (callback: (node: any) => void): void => activeNodes().forEach(callback);
  const richText = (): any => (mindMap as any).richText;
  const richRange = (): any => {
    const editor = richText();
    return editor?.range ?? editor?.lastRange ?? null;
  };
  const hasRichTextSelection = (): boolean => Number(richRange()?.length ?? 0) > 0;
  const removableNodes = (): any[] => activeNodes().filter((node) => !node?.isRoot);
  const primaryIsRegular = (): boolean => Boolean(primaryNode() && !primaryNode()?.isGeneralization);
  const primaryIsMovable = (): boolean => Boolean(primaryIsRegular() && !primaryNode()?.isRoot);
  const findNodeByUid = (uid: string): any | null => (mindMap.renderer as any)?.findNodeByUid?.(uid) ?? null;
  const outerFramePlugin = (): any => (mindMap as any).outerFrame;
  const activeOuterFrame = (): any | null => outerFramePlugin()?.getActiveOuterFrame?.() ?? outerFramePlugin()?.activeOuterFrame ?? null;
  const canAddOuterFrame = (): boolean => Boolean(outerFramePlugin()) && canMutate() && activeNodes().some((node) => !node?.isRoot && !node?.isGeneralization);
  const rendererRoot = (): any | null => (mindMap.renderer as any)?.root ?? null;
  const walkRenderedTree = (callback: (node: any) => void): void => {
    const visit = (node: any): void => {
      if (!node) return;
      callback(node);
      const children = Array.isArray(node.children) ? node.children : [];
      children.forEach(visit);
    };
    visit(rendererRoot());
  };
  const searchNodeData = (node: any): Record<string, any> => {
    const value = typeof node?.getData === 'function' ? node.getData() : node?.data;
    return value && typeof value === 'object' ? value : {};
  };
  const walkSearchTree = (callback: (node: any) => void): void => {
    const onlyRendered = Boolean((mindMap as any).opt?.isOnlySearchCurrentRenderNodes);
    const root = onlyRendered
      ? (mindMap.renderer as any)?.root
      : (mindMap.renderer as any)?.renderTree ?? (mindMap.renderer as any)?.root;
    const visit = (node: any): void => {
      if (!node) return;
      callback(node);
      const children = Array.isArray(node.children) ? node.children : [];
      children.forEach(visit);
    };
    visit(root);
  };
  const runAdvancedSearch = (text: string, options: SearchOptions): void => {
    const plugin = (mindMap as any).search;
    if (!plugin) return;
    plugin.clearHighlightOnReadonly?.();
    const matches: any[] = [];
    const selectedUids = new Set(
      options.scope === 'selection'
        ? activeNodes().map((node) => String(searchNodeData(node).uid ?? '')).filter(Boolean)
        : [],
    );
    walkSearchTree((node) => {
      const data = searchNodeData(node);
      if (options.scope === 'selection' && !selectedUids.has(String(data.uid ?? ''))) return;
      const value = plainTextFromSearchValue(data.text, Boolean(data.richText));
      const count = findSearchMatches(value, text, options).length;
      for (let index = 0; index < count; index += 1) matches.push(node);
    });
    plugin.yemindAdvancedOptions = { ...options };
    plugin.isSearching = true;
    plugin.searchText = text;
    plugin.currentIndex = -1;
    plugin.updateMatchNodeList?.(matches);
    plugin.searchNext?.(() => {});
    plugin.emitEvent?.();
  };
  const replaceNodeSearchText = (
    node: any,
    query: string,
    replacement: string,
    options: SearchOptions,
    limit: number,
    skip = 0,
  ): { text: string; count: number } => {
    const data = searchNodeData(node);
    const source = String(data.text ?? '');
    const result = data.richText
      ? replaceSearchMatchesInHtml(source, query, replacement, options, limit, skip)
      : replaceSearchMatches(source, query, replacement, options, limit, skip);
    return { text: result.value, count: result.count };
  };
  const applyAdvancedReplacement = (
    replacement: string,
    options: SearchOptions,
    replaceAll: boolean,
  ): void => {
    if (!canMutate()) return;
    const plugin = (mindMap as any).search;
    const query = String(plugin?.searchText ?? '');
    const matches = Array.isArray(plugin?.matchNodeList) ? [...plugin.matchNodeList] : [];
    if (!query || matches.length === 0) return;
    const currentIndex = Math.max(0, Number(plugin.currentIndex ?? 0));
    const latestNode = (node: any): any => {
      const uid = String(searchNodeData(node).uid ?? '');
      return (uid ? findNodeByUid(uid) : null) ?? node;
    };
    const sameSearchNode = (left: any, right: any): boolean => {
      if (left === right) return true;
      const leftUid = String(searchNodeData(left).uid ?? '');
      const rightUid = String(searchNodeData(right).uid ?? '');
      return Boolean(leftUid && rightUid && leftUid === rightUid);
    };
    const currentMatch = matches[currentIndex] ?? matches[0];
    const currentNode = latestNode(currentMatch);
    const targets: Array<{ node: any; skip: number }> = replaceAll
      ? [...new Set(matches.map(latestNode))].map((node) => ({ node, skip: 0 }))
      : [{
        node: currentNode,
        skip: matches
          .slice(0, currentIndex)
          .filter((node) => sameSearchNode(node, currentMatch))
          .length,
      }];
    let changed = false;
    targets.forEach(({ node, skip }) => {
      const result = replaceNodeSearchText(
        node,
        query,
        replacement,
        options,
        replaceAll ? Number.POSITIVE_INFINITY : 1,
        skip,
      );
      if (result.count === 0) return;
      changed = true;
      const data = searchNodeData(node);
      if (typeof node?.setText === 'function') {
        node.setText(result.text, Boolean(data.richText));
      } else if (node?.data) {
        node.data.text = result.text;
      }
    });
    if (!changed) return;
    if (replaceAll) {
      (mindMap as any).render?.();
      (mindMap as any).command?.addHistory?.();
    }
    runAdvancedSearch(query, options);
  };
  const selectedOuterFrameGroupIds = (): Set<string> => {
    const ids = new Set<string>();
    activeNodes().forEach((node) => {
      const value = node?.getData?.('outerFrame');
      const id = value && typeof value === 'object' ? String(value.groupId ?? '') : '';
      if (id) ids.add(id);
    });
    return ids;
  };
  const markNodeTextEdited = (node: any): void => {
    const data = node?.nodeData?.data ?? node?.getData?.();
    if (!data || typeof data !== 'object') return;
    data.yemindTextPristine = false;
    data.yemindTextEdited = true;
  };
  const currentTree = (): MindMapTree | null => {
    const value = (mindMap as any).getData?.(false);
    return value && typeof value === 'object' ? value as MindMapTree : null;
  };
  const applyExpansionTransform = (transform: (tree: MindMapTree) => { tree: MindMapTree; changed: boolean }): boolean => {
    if (!canMutate()) return false;
    const tree = currentTree();
    if (!tree) return false;
    const result = transform(tree);
    if (!result.changed) return false;
    const updateData = (mindMap as any).updateData;
    if (typeof updateData !== 'function') return false;
    updateData.call(mindMap, result.tree);
    return true;
  };
  const insertAndEdit = (
    command: 'INSERT_CHILD_NODE' | 'INSERT_NODE' | 'INSERT_PARENT_NODE',
    appointNodes: any[] = [],
  ): void => {
    mindMap.execCommand(command, true, appointNodes, {
      // Keep the pristine default label on the immediately paintable SVG
      // text path. The upstream editor can still promote it to rich text as
      // soon as the user commits an actual edit.
      richText: false,
      yemindTextPristine: true,
      yemindTextEdited: false,
    });
  };

  return {
    isReadonly,
    hasRichTextSelection,
    restoreSelection: () => {
      const editor = richText();
      const range = richRange();
      if (!range || !editor?.quill?.setSelection) return;
      editor.range = { index: range.index, length: range.length };
      editor.pasteUseRange = editor.range;
      editor.quill.setSelection(range.index, range.length, 'silent');
    },
    addChild: () => { if (canMutate() && primaryIsRegular()) insertAndEdit('INSERT_CHILD_NODE'); },
    addSibling: () => { if (canMutate() && primaryIsMovable()) insertAndEdit('INSERT_NODE'); },
    addParent: () => { if (canMutate() && primaryIsMovable()) insertAndEdit('INSERT_PARENT_NODE'); },
    moveUp: () => { if (canMutate() && primaryIsMovable()) mindMap.execCommand('UP_NODE'); },
    moveDown: () => { if (canMutate() && primaryIsMovable()) mindMap.execCommand('DOWN_NODE'); },
    toggleExpand: () => {
      const uid = String(primaryNode()?.getData?.('uid') ?? '');
      if (!uid || !applyExpansionTransform((tree) => toggleBranchDeep(tree, uid))) {
        mindMap.renderer.toggleActiveExpand?.();
      }
    },
    toggleBranchExpandByUid: (uid) => applyExpansionTransform((tree) => toggleBranchDeep(tree, uid)),
    expandBranchDeepByUid: (uid) => applyExpansionTransform((tree) => expandBranchDeep(tree, uid)),
    collapseBranchDeepByUid: (uid) => applyExpansionTransform((tree) => collapseBranchDeep(tree, uid)),
    remove: () => {
      if (!canMutate()) return;
      const nodes = removableNodes();
      if (nodes.length) mindMap.execCommand('REMOVE_NODE', nodes);
    },
    removeOnlyCurrent: () => {
      if (!canMutate()) return;
      const nodes = removableNodes();
      if (nodes.length) mindMap.execCommand('REMOVE_CURRENT_NODE', nodes);
    },
    undo: () => {
      if (!canMutate()) return;
      replayHistory('BACK');
    },
    redo: () => {
      if (!canMutate()) return;
      replayHistory('FORWARD');
    },
    fit: () => (mindMap.view as any).fit(),
    centerRoot: () => (mindMap.renderer as any).setRootNodeCenter?.(),
    expandAll: () => { if (!applyExpansionTransform(expandAllBranches)) mindMap.execCommand('EXPAND_ALL'); },
    collapseAll: () => { if (!applyExpansionTransform(collapseAllBranches)) mindMap.execCommand('UNEXPAND_ALL'); },
    toggleAllExpand: () => {
      if (applyExpansionTransform(toggleAllExpansion)) return;
      let hasCollapsed = false;
      walkRenderedTree((node) => {
        if (!node?.isRoot && Array.isArray(node.children) && node.children.length > 0 && node.getData?.('expand') === false) hasCollapsed = true;
      });
      mindMap.execCommand(hasCollapsed ? 'EXPAND_ALL' : 'UNEXPAND_ALL');
    },
    resetZoom: () => mindMap.view.reset(),
    resetLayout: () => { if (canMutate()) mindMap.execCommand('RESET_LAYOUT'); },
    zoomIn: () => stepZoom('in'),
    zoomOut: () => stepZoom('out'),
    edit: () => {
      if (!canMutate()) return;
      const node = primaryNode();
      if (!node) return;
      const renderer = mindMap.renderer as any;
      if (typeof renderer?.textEdit?.show === 'function') {
        void renderer.textEdit.show({ node, isInserting: false, isFromKeyDown: false });
        return;
      }
      if (typeof renderer?.startTextEdit === 'function') {
        renderer.startTextEdit(node);
        return;
      }
      (mindMap as any).emit?.('node_dblclick', node, null, false);
    },
    copy: () => (mindMap.renderer as any).copy?.(),
    cut: () => { if (canMutate()) (mindMap.renderer as any).cut?.(); },
    paste: async () => { if (canMutate()) await (mindMap.renderer as any).paste?.(); },
    pastePlainText: async () => {
      if (!canMutate()) return;
      const text = String(await navigator.clipboard?.readText?.() ?? '').replace(/\r\n?/g, '\n');
      if (!text.trim()) return;
      const lines = text.split('\n').map((line) => line.trimEnd()).filter((line) => line.trim().length > 0);
      if (lines.length > 1) {
        mindMap.execCommand('INSERT_MULTI_CHILD_NODE', [], lines.map((line) => ({ data: { text: line, richText: false }, children: [] })));
      } else {
        mindMap.execCommand('INSERT_CHILD_NODE', false, [], { text: lines[0] ?? text, richText: false });
      }
    },
    getActiveNodes: activeNodes,
    getPrimaryNode: primaryNode,
    getPrimaryNodeData: () => primaryNode()?.getData?.() ?? null,
    getActiveNodeStyle: () => {
      const node = primaryNode();
      if (!node) return null;
      const data = { ...(node.getData?.() ?? {}) } as Record<string, unknown>;
      const effectiveKeys = ['shape', 'fillColor', 'borderColor', 'borderWidth', 'borderDasharray', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 'textAlign', 'color'];
      effectiveKeys.forEach((key) => {
        if (!(key in data) && node.style?.merge) data[key] = node.style.merge(key);
      });
      if ('customTextWidth' in data && !('width' in data)) data.width = data.customTextWidth;
      return nodeStyleSnapshot(data);
    },
    setActiveNodeStyle: (input) => {
      if (!canMutate()) return;
      const patch = normalizeNodeStylePatch(input);
      if (!Object.keys(patch).length) return;
      const nativePatch: Record<string, unknown> = {};
      Object.entries(patch).forEach(([key, value]) => {
        const nativeValue = value === null ? undefined : value;
        if (key === 'width') nativePatch.customTextWidth = nativeValue;
        else if (key === 'shape' && value === 'pill') {
          nativePatch.shape = 'roundedRectangle';
          nativePatch.borderRadius = 999;
        } else if (key === 'shape') {
          nativePatch.shape = value === 'rounded' ? 'roundedRectangle' : value === 'rect' ? 'rectangle' : nativeValue;
          nativePatch.borderRadius = undefined;
        } else nativePatch[key] = nativeValue;
      });
      forEachActive((node) => {
        mindMap.execCommand('SET_NODE_STYLES', node, nativePatch);
        if (Object.prototype.hasOwnProperty.call(patch, 'width')) {
          mindMap.execCommand('SET_NODE_DATA', node, {
            width: patch.width === null ? undefined : patch.width,
            yemindImportedAutoWidth: false,
          });
        }
      });
    },
    resetActiveNodeStyle: () => {
      if (!canMutate()) return;
      forEachActive((node) => mindMap.execCommand('REMOVE_CUSTOM_STYLES', node));
    },
    getSelectedText: () => {
      const editor = richText();
      const range = richRange();
      if (!range || !editor?.quill?.getText) return '';
      return String(editor.quill.getText(range.index, range.length) ?? '').trim();
    },
    getSelectedInlineLink: () => {
      const editor = richText();
      const range = richRange();
      if (!range || !editor?.quill?.getFormat) return '';
      const link = editor.quill.getFormat(range.index, range.length)?.link;
      return typeof link === 'string' ? link : '';
    },
    setInlineLink: (link) => {
      if (canMutate() && hasRichTextSelection()) richText()?.formatText?.({ link: link || false });
    },
    toggleInlineCode: () => {
      if (!canMutate() || !hasRichTextSelection()) return;
      const editor = richText();
      const range = richRange();
      if (!range || !editor?.quill?.getFormat) return;
      const current = Boolean(editor.quill.getFormat(range.index, range.length)?.code);
      editor.formatText?.({ code: !current });
    },
    getCodeBlock: () => {
      const editor = richText();
      const range = richRange();
      return editor?.quill ? findCurrentCodeBlock(editor.quill, range) : null;
    },
    saveCodeBlock: (code, language = 'plain') => {
      if (!canMutate()) return;
      const editor = richText();
      const quill = editor?.quill;
      const range = richRange();
      if (!quill || !range) return;
      const existing = findCurrentCodeBlock(quill, range);
      replaceCodeBlock(quill, existing ?? range, code, language);
    },
    removeCodeBlockFormat: () => {
      if (!canMutate()) return;
      const editor = richText();
      const range = richRange();
      const block = editor?.quill ? findCurrentCodeBlock(editor.quill, range) : null;
      if (block) removeCodeBlockFormat(editor.quill, block);
    },
    deleteCodeBlock: () => {
      if (!canMutate()) return;
      const editor = richText();
      const range = richRange();
      const block = editor?.quill ? findCurrentCodeBlock(editor.quill, range) : null;
      if (block) deleteCodeBlock(editor.quill, block);
    },
    setTags: (tags) => { if (canMutate()) forEachActive((node) => mindMap.execCommand('SET_NODE_TAG', node, tags)); },
    setIcons: (icons) => { if (canMutate()) forEachActive((node) => mindMap.execCommand('SET_NODE_ICON', node, icons)); },
    setIconsByUid: (uid, icons) => {
      if (!canMutate()) return;
      const node = findNodeByUid(uid);
      if (node) mindMap.execCommand('SET_NODE_ICON', node, icons);
    },
    setLink: (link, title = '') => { if (canMutate()) forEachActive((node) => mindMap.execCommand('SET_NODE_HYPERLINK', node, link, title)); },
    setImage: (image) => { if (canMutate()) forEachActive((node) => mindMap.execCommand('SET_NODE_IMAGE', node, image)); },
    clearImageByUid: (uid) => {
      if (!canMutate()) return;
      const node = findNodeByUid(uid);
      if (node) mindMap.execCommand('SET_NODE_IMAGE', node, { url: null });
    },
    setClipart: (image) => {
      if (!canMutate()) return;
      forEachActive((node) => {
        mindMap.execCommand('SET_NODE_IMAGE', node, image);
        mindMap.execCommand('SET_NODE_DATA', node, {
          yemindClipartId: image.id,
          yemindClipartGeometryVersion: CLIPART_GEOMETRY_VERSION,
          imgPlacement: 'top',
        });
      });
    },
    clearClipart: () => {
      if (!canMutate()) return;
      forEachActive((node) => {
        mindMap.execCommand('SET_NODE_IMAGE', node, { url: null });
        mindMap.execCommand('SET_NODE_DATA', node, {
          yemindClipartId: null,
          yemindClipartGeometryVersion: null,
        });
      });
    },
    clearClipartByUid: (uid) => {
      if (!canMutate()) return;
      const node = findNodeByUid(uid);
      if (!node) return;
      mindMap.execCommand('SET_NODE_IMAGE', node, { url: null });
      mindMap.execCommand('SET_NODE_DATA', node, {
        yemindClipartId: null,
        yemindClipartGeometryVersion: null,
      });
    },
    insertFormula: (formula, mode = 'inline') => {
      if (!canMutate()) return;
      const editor = richText();
      const quill = editor?.quill;
      const range = richRange();
      const value = mode === 'block' ? `\\displaystyle{${formula}}` : formula;
      if (quill && range) {
        const codeBlock = typeof quill.getLines === 'function'
          ? findCurrentCodeBlock(quill, range)
          : null;
        if (codeBlock) removeCodeBlockFormat(quill, codeBlock);
        if (range.length > 0) quill.deleteText(range.index, range.length);
        if (mode === 'block') {
          quill.insertText(range.index, '\n', 'user');
          quill.insertEmbed(range.index + 1, 'formula', value, 'user');
          quill.insertText(range.index + 2, '\n', 'user');
          quill.setSelection(range.index + 3, 0, 'silent');
        } else {
          quill.insertEmbed(range.index, 'formula', value, 'user');
          quill.setSelection(range.index + 1, 0, 'silent');
        }
        return;
      }
      mindMap.execCommand('INSERT_FORMULA', value);
    },
    insertSymbol: (symbol, targetUid) => {
      if (!canMutate() || !symbol) return false;
      const node = targetUid ? findNodeByUid(targetUid) : primaryNode();
      if (!node) return false;
      const editor = richText();
      const quill = editor?.quill;
      const range = richRange();
      if (!targetUid && quill && range) {
        if (range.length > 0) quill.deleteText(range.index, range.length, 'user');
        quill.insertText(range.index, symbol, 'user');
        quill.setSelection(range.index + symbol.length, 0, 'silent');
        return true;
      }
      const data = searchNodeData(node);
      const current = String(data.text ?? '');
      markNodeTextEdited(node);
      if (data.richText) {
        const next = /<\/p>\s*$/i.test(current)
          ? current.replace(/<\/p>\s*$/i, `${symbol}</p>`)
          : `${current}${symbol}`;
        mindMap.execCommand('SET_NODE_TEXT', node, next, true, false);
      } else {
        mindMap.execCommand('SET_NODE_TEXT', node, `${current}${symbol}`, false, true);
      }
      return true;
    },
    addSummary: () => { if (canMutate()) addCombinedSummary(mindMap as any, activeNodes()); },
    removeSummary: () => {
      if (!canMutate()) return;
      const node = primaryNode();
      if (!node) return;
      if (node.isGeneralization) mindMap.execCommand('REMOVE_NODE', [node]);
      else mindMap.execCommand('REMOVE_GENERALIZATION');
    },
    startRelation: () => {
      if (!canMutate()) return false;
      const relation = (mindMap as any).associativeLine;
      const nodes = activeNodes().filter((node) => node && !node.isGeneralization);
      if (nodes.length > 1 && relation?.addLine) {
        const [source, ...targets] = nodes;
        targets.forEach((target) => {
          if (target !== source) relation.addLine(source, target);
        });
        relation.renderAllLines?.();
        return false;
      }
      relation?.createLineFromActiveNode?.();
      return Boolean(relation?.isCreatingLine);
    },
    isRelationCreating: () => Boolean((mindMap as any).associativeLine?.isCreatingLine),
    hasActiveRelation: () => Boolean((mindMap as any).associativeLine?.activeLine),
    cancelRelation: () => {
      const relation = (mindMap as any).associativeLine;
      if (relation?.isCreatingLine) relation.cancelCreateLine?.();
    },
    editActiveRelationText: () => {
      if (!canMutate()) return;
      const relation = (mindMap as any).associativeLine;
      const textGroup = relation?.activeLine?.[2];
      if (textGroup) relation.showEditTextBox?.(textGroup);
    },
    removeActiveRelation: () => { if (canMutate()) (mindMap as any).associativeLine?.removeLine?.(); },
    canAddOuterFrame,
    hasOuterFrameForSelection: () => selectedOuterFrameGroupIds().size > 0,
    addOuterFrame: () => {
      if (!canAddOuterFrame()) return;
      mindMap.execCommand('ADD_OUTER_FRAME');
    },
    removeOuterFrameForSelection: () => {
      if (!canMutate()) return;
      const groupIds = selectedOuterFrameGroupIds();
      if (groupIds.size === 0) return;
      walkRenderedTree((node) => {
        const value = node?.getData?.('outerFrame');
        const id = value && typeof value === 'object' ? String(value.groupId ?? '') : '';
        if (id && groupIds.has(id)) mindMap.execCommand('SET_NODE_DATA', node, { outerFrame: null });
      });
      (mindMap as any).outerFrame?.renderOuterFrames?.();
    },
    hasActiveOuterFrame: () => Boolean(activeOuterFrame()),
    editActiveOuterFrameText: () => {
      if (!canMutate()) return;
      const plugin = outerFramePlugin();
      const active = activeOuterFrame();
      if (active?.textNode) plugin?.showEditTextBox?.(active.textNode);
    },
    updateActiveOuterFrame: (config) => {
      if (!canMutate() || !activeOuterFrame()) return;
      outerFramePlugin()?.updateActiveOuterFrame?.(config);
    },
    removeActiveOuterFrame: () => {
      if (!canMutate() || !activeOuterFrame()) return;
      outerFramePlugin()?.removeActiveOuterFrame?.();
    },
    getActiveOuterFrameStyle: () => {
      const plugin = outerFramePlugin();
      const active = activeOuterFrame();
      if (!plugin || !active) return null;
      const firstNode = plugin.getNodeRangeFirstNode?.(active.node, active.range);
      const style = firstNode ? plugin.getStyle?.(firstNode) : null;
      return style && typeof style === 'object' ? { ...style } : null;
    },
    getTodo: () => (primaryNode()?.getData?.('yemindTodo') ?? null) as NodeTodo | null,
    toggleTodo: () => {
      if (!canMutate()) return;
      const node = primaryNode();
      if (!node) return;
      const todo = nextTodo(node.getData?.('yemindTodo'));
      mindMap.execCommand('SET_NODE_DATA', node, { yemindTodo: todo });
      (mindMap as any).render?.();
    },
    setTodo: (todo) => {
      if (!canMutate()) return;
      forEachActive((node) => mindMap.execCommand('SET_NODE_DATA', node, { yemindTodo: todo }));
      (mindMap as any).render?.();
    },
    setComments: (comments) => {
      if (!canMutate()) return;
      const node = primaryNode();
      if (!node) return;
      mindMap.execCommand('SET_NODE_DATA', node, { yemindComments: comments });
      (mindMap as any).render?.();
    },
    setNote: (note) => {
      if (!canMutate()) return;
      const node = primaryNode();
      if (!node) return;
      mindMap.execCommand('SET_NODE_DATA', node, { yemindNote: note });
      (mindMap as any).render?.();
    },
    formatText: (config) => { if (canMutate() && hasRichTextSelection()) richText()?.formatText?.(config); },
    clearTextFormat: () => { if (canMutate() && hasRichTextSelection()) richText()?.removeFormat?.(); },
    setCloze: (enabled) => {
      if (!canMutate() || !hasRichTextSelection()) return;
      richText()?.formatText?.(enabled
        ? { background: '#f5dfa0', color: 'transparent' }
        : { background: false, color: false });
    },
    search: (text, options) => {
      if (options) runAdvancedSearch(text, options);
      else (mindMap as any).search?.search?.(text);
    },
    searchNext: () => {
      const search = (mindMap as any).search;
      if (!search?.searchText) return;
      if (search.yemindAdvancedOptions) {
        search.searchNext?.(() => {});
        search.emitEvent?.();
      } else {
        search.search(search.searchText);
      }
    },
    searchPrevious: () => {
      const search = (mindMap as any).search;
      const total = Array.isArray(search?.matchNodeList) ? search.matchNodeList.length : 0;
      if (!total) return;
      const current = Number(search.currentIndex ?? 0);
      search.jump((current - 1 + total) % total);
      search.emitEvent?.();
    },
    replaceSearch: (text, options) => {
      if (options) applyAdvancedReplacement(text, options, false);
      else if (canMutate()) (mindMap as any).search?.replace?.(text, true);
    },
    replaceSearchAll: (text, options) => {
      if (options) applyAdvancedReplacement(text, options, true);
      else if (canMutate()) (mindMap as any).search?.replaceAll?.(text);
    },
    endSearch: () => {
      const search = (mindMap as any).search;
      if (search) delete search.yemindAdvancedOptions;
      search?.endSearch?.();
    },
    goToNode: (uid) => mindMap.execCommand('GO_TARGET_NODE', uid),
    setNodeTextByUid: (uid, text) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node) return false;
      markNodeTextEdited(node);
      mindMap.execCommand('SET_NODE_TEXT', node, text, false, true);
      return true;
    },
    setNodeRichTextByUid: (uid, html) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node) return false;
      markNodeTextEdited(node);
      mindMap.execCommand('SET_NODE_TEXT', node, html, true, false);
      return true;
    },
    insertSiblingByUid: (uid, newUid) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node || node.isRoot || node.isGeneralization) return false;
      mindMap.execCommand('INSERT_NODE', false, [node], { uid: newUid, text: '', richText: false, yemindTextPristine: true, yemindTextEdited: false });
      return true;
    },
    insertChildByUid: (uid, newUid) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node || node.isGeneralization) return false;
      mindMap.execCommand('INSERT_CHILD_NODE', false, [node], { uid: newUid, text: '', richText: false, yemindTextPristine: true, yemindTextEdited: false });
      return true;
    },
    addChildByUid: (uid) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node || node.isGeneralization) return false;
      insertAndEdit('INSERT_CHILD_NODE', [node]);
      return true;
    },
    pasteNodeTreesByUid: (uid, nodes) => {
      if (!canMutate() || nodes.length === 0) return false;
      const node = findNodeByUid(uid);
      if (!node || node.isGeneralization) return false;
      mindMap.execCommand('INSERT_MULTI_CHILD_NODE', [node], structuredClone(nodes));
      return true;
    },
    removeNodeByUid: (uid) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node || node.isRoot) return false;
      mindMap.execCommand('REMOVE_NODE', [node]);
      return true;
    },
    indentNodeByUid: (uid) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node || node.isRoot || node.isGeneralization || !node.parent) return false;
      const siblings = Array.isArray(node.parent.children) ? node.parent.children : [];
      const index = siblings.indexOf(node);
      const previous = index > 0 ? siblings[index - 1] : null;
      if (!previous || previous.isGeneralization) return false;
      mindMap.execCommand('MOVE_NODE_TO', [node], previous);
      return true;
    },
    outdentNodeByUid: (uid) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node || node.isRoot || node.isGeneralization || Number(node.layerIndex) <= 1) return false;
      mindMap.execCommand('MOVE_UP_ONE_LEVEL', node);
      return true;
    },
    setNodeExpandedByUid: (uid, expanded) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      const persistedChildren = Array.isArray(node?.nodeData?.children)
        ? node.nodeData.children
        : Array.isArray(node?.getData?.('children'))
          ? node.getData('children')
          : Array.isArray(node?.children)
            ? node.children
          : [];
      if (!node || node.isGeneralization || persistedChildren.length === 0) return false;
      // A quick action targets the live rendered node. Whole-tree updateData()
      // can replace that instance before the click finishes, which left Root
      // and some imported branches visually unchanged in the web runtime.
      mindMap.execCommand('SET_NODE_EXPAND', node, expanded);
      return true;
    },
    replaceTree: (data) => {
      if (!canMutate()) return false;
      const updateData = (mindMap as any).updateData;
      if (typeof updateData !== 'function') return false;
      // updateData is the upstream undoable whole-tree transaction. setData()
      // would clear history and is therefore intentionally not used here.
      updateData.call(mindMap, data);
      return true;
    },
    moveNodeByUid: (uid, targetUid, position) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      const target = findNodeByUid(targetUid);
      if (!node || !target || node === target || node.isRoot || node.isGeneralization || target.isGeneralization) return false;
      let ancestor = target.parent;
      while (ancestor) {
        if (ancestor === node) return false;
        ancestor = ancestor.parent;
      }
      if (position === 'before') {
        if (target.isRoot) return false;
        const siblings = Array.isArray(target.parent?.children) ? target.parent.children : [];
        if (node.parent === target.parent && siblings.indexOf(node) === siblings.indexOf(target) - 1) return false;
        mindMap.execCommand('INSERT_BEFORE', [node], target);
      } else if (position === 'after') {
        if (target.isRoot) return false;
        const siblings = Array.isArray(target.parent?.children) ? target.parent.children : [];
        if (node.parent === target.parent && siblings.indexOf(node) === siblings.indexOf(target) + 1) return false;
        mindMap.execCommand('INSERT_AFTER', [node], target);
      } else {
        const children = Array.isArray(target.children) ? target.children : [];
        if (node.parent === target && children.at(-1) === node) return false;
        mindMap.execCommand('MOVE_NODE_TO', [node], target);
      }
      return true;
    },
  };
}
