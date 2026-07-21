import type MindMap from 'simple-mind-map';
import { toggleTodo as nextTodo, type NodeComment, type NodeTodo } from '../content/nodeContentState';
import type { NodeNote } from '../content/nodeNoteState';
import { deleteCodeBlock, findCurrentCodeBlock, removeCodeBlockFormat, replaceCodeBlock, type CodeBlockSnapshot } from '../editor/codeBlock';
import type { RichTextFormattingTarget } from '../editor/richTextTarget';

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
  remove(): void;
  removeOnlyCurrent(): void;
  undo(): void;
  redo(): void;
  fit(): void;
  centerRoot(): void;
  expandAll(): void;
  collapseAll(): void;
  resetZoom(): void;
  resetLayout(): void;
  zoomIn(): void;
  zoomOut(): void;
  edit(): void;
  copy(): void;
  cut(): void;
  paste(): Promise<void>;
  getActiveNodes(): any[];
  getPrimaryNode(): any | null;
  getPrimaryNodeData(): Record<string, any> | null;
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
  setLink(link: string, title?: string): void;
  setImage(image: NodeImageInput): void;
  insertFormula(formula: string, mode?: 'inline' | 'block'): void;
  addSummary(): void;
  removeSummary(): void;
  startRelation(): boolean;
  isRelationCreating(): boolean;
  hasActiveRelation(): boolean;
  cancelRelation(): void;
  editActiveRelationText(): void;
  removeActiveRelation(): void;
  canAddOuterFrame(): boolean;
  addOuterFrame(): void;
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
  search(text: string): void;
  searchNext(): void;
  searchPrevious(): void;
  replaceSearch(text: string): void;
  replaceSearchAll(text: string): void;
  endSearch(): void;
  goToNode(uid: string): void;
  setNodeTextByUid(uid: string, text: string): boolean;
  setNodeRichTextByUid(uid: string, html: string): boolean;
  insertSiblingByUid(uid: string, newUid: string): boolean;
  insertChildByUid(uid: string, newUid: string): boolean;
  removeNodeByUid(uid: string): boolean;
  indentNodeByUid(uid: string): boolean;
  outdentNodeByUid(uid: string): boolean;
  setNodeExpandedByUid(uid: string, expanded: boolean): boolean;
  moveNodeByUid(uid: string, targetUid: string, position: 'before' | 'inside' | 'after'): boolean;
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

  return {
    isReadonly,
    hasRichTextSelection,
    addChild: () => { if (canMutate() && primaryIsRegular()) mindMap.execCommand('INSERT_CHILD_NODE'); },
    addSibling: () => { if (canMutate() && primaryIsMovable()) mindMap.execCommand('INSERT_NODE'); },
    addParent: () => { if (canMutate() && primaryIsMovable()) mindMap.execCommand('INSERT_PARENT_NODE'); },
    moveUp: () => { if (canMutate() && primaryIsMovable()) mindMap.execCommand('UP_NODE'); },
    moveDown: () => { if (canMutate() && primaryIsMovable()) mindMap.execCommand('DOWN_NODE'); },
    toggleExpand: () => mindMap.renderer.toggleActiveExpand(),
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
    undo: () => { if (canMutate()) mindMap.execCommand('BACK'); },
    redo: () => { if (canMutate()) mindMap.execCommand('FORWARD'); },
    fit: () => (mindMap.view as any).fit(),
    centerRoot: () => (mindMap.renderer as any).setRootNodeCenter?.(),
    expandAll: () => mindMap.execCommand('EXPAND_ALL'),
    collapseAll: () => mindMap.execCommand('UNEXPAND_ALL'),
    resetZoom: () => mindMap.view.reset(),
    resetLayout: () => { if (canMutate()) mindMap.execCommand('RESET_LAYOUT'); },
    zoomIn: () => mindMap.view.enlarge(undefined, undefined, false),
    zoomOut: () => mindMap.view.narrow(undefined, undefined, false),
    edit: () => { if (canMutate()) mindMap.renderer.startTextEdit(); },
    copy: () => (mindMap.renderer as any).copy?.(),
    cut: () => { if (canMutate()) (mindMap.renderer as any).cut?.(); },
    paste: async () => { if (canMutate()) await (mindMap.renderer as any).paste?.(); },
    getActiveNodes: activeNodes,
    getPrimaryNode: primaryNode,
    getPrimaryNodeData: () => primaryNode()?.getData?.() ?? null,
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
    setLink: (link, title = '') => { if (canMutate()) forEachActive((node) => mindMap.execCommand('SET_NODE_HYPERLINK', node, link, title)); },
    setImage: (image) => { if (canMutate()) forEachActive((node) => mindMap.execCommand('SET_NODE_IMAGE', node, image)); },
    insertFormula: (formula, mode = 'inline') => {
      if (!canMutate()) return;
      const editor = richText();
      const quill = editor?.quill;
      const range = richRange();
      const value = mode === 'block' ? `\\displaystyle{${formula}}` : formula;
      if (quill && range) {
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
    addSummary: () => { if (canMutate()) mindMap.execCommand('ADD_GENERALIZATION'); },
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
    addOuterFrame: () => {
      if (!canAddOuterFrame()) return;
      mindMap.execCommand('ADD_OUTER_FRAME');
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
    search: (text) => (mindMap as any).search?.search?.(text),
    searchNext: () => {
      const search = (mindMap as any).search;
      if (!search?.searchText) return;
      search.search(search.searchText);
    },
    searchPrevious: () => {
      const search = (mindMap as any).search;
      const total = Array.isArray(search?.matchNodeList) ? search.matchNodeList.length : 0;
      if (!total) return;
      const current = Number(search.currentIndex ?? 0);
      search.jump((current - 1 + total) % total);
    },
    replaceSearch: (text) => { if (canMutate()) (mindMap as any).search?.replace?.(text, true); },
    replaceSearchAll: (text) => { if (canMutate()) (mindMap as any).search?.replaceAll?.(text); },
    endSearch: () => (mindMap as any).search?.endSearch?.(),
    goToNode: (uid) => mindMap.execCommand('GO_TARGET_NODE', uid),
    setNodeTextByUid: (uid, text) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node) return false;
      mindMap.execCommand('SET_NODE_TEXT', node, text, false, true);
      return true;
    },
    setNodeRichTextByUid: (uid, html) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node) return false;
      mindMap.execCommand('SET_NODE_TEXT', node, html, true, false);
      return true;
    },
    insertSiblingByUid: (uid, newUid) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node || node.isRoot || node.isGeneralization) return false;
      mindMap.execCommand('INSERT_NODE', false, [node], { uid: newUid, text: '', richText: false });
      return true;
    },
    insertChildByUid: (uid, newUid) => {
      if (!canMutate()) return false;
      const node = findNodeByUid(uid);
      if (!node || node.isGeneralization) return false;
      mindMap.execCommand('INSERT_CHILD_NODE', false, [node], { uid: newUid, text: '', richText: false });
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
      if (!node || node.isGeneralization || !Array.isArray(node.children) || node.children.length === 0) return false;
      mindMap.execCommand('SET_NODE_EXPAND', node, expanded);
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
        mindMap.execCommand('INSERT_BEFORE', [node], target);
      } else if (position === 'after') {
        if (target.isRoot) return false;
        mindMap.execCommand('INSERT_AFTER', [node], target);
      } else {
        mindMap.execCommand('MOVE_NODE_TO', [node], target);
      }
      return true;
    },
  };
}
