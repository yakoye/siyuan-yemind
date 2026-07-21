import type MindMap from 'simple-mind-map';
import { toggleTodo as nextTodo, type NodeComment, type NodeTodo } from '../content/nodeContentState';

export interface NodeImageInput {
  url: string | null;
  title?: string;
  width?: number;
  height?: number;
  custom?: boolean;
}

export interface YeMindCommands {
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
  resetZoom(): void;
  zoomIn(): void;
  zoomOut(): void;
  edit(): void;
  getActiveNodes(): any[];
  getPrimaryNode(): any | null;
  getPrimaryNodeData(): Record<string, any> | null;
  getSelectedText(): string;
  setNote(note: string): void;
  setTags(tags: string[]): void;
  setIcons(icons: string[]): void;
  setLink(link: string, title?: string): void;
  setImage(image: NodeImageInput): void;
  insertFormula(formula: string, mode?: 'inline' | 'block'): void;
  addSummary(): void;
  startRelation(): void;
  toggleTodo(): void;
  setTodo(todo: NodeTodo | null): void;
  setComments(comments: NodeComment[]): void;
  formatText(config: Record<string, unknown>): void;
  clearTextFormat(): void;
  setCloze(enabled: boolean): void;
}

export function createCommandAdapter(mindMap: MindMap): YeMindCommands {
  const activeNodes = (): any[] => Array.isArray((mindMap.renderer as any)?.activeNodeList)
    ? (mindMap.renderer as any).activeNodeList
    : [];
  const primaryNode = (): any | null => activeNodes()[0] ?? null;
  const forEachActive = (callback: (node: any) => void): void => activeNodes().forEach(callback);

  return {
    addChild: () => mindMap.execCommand('INSERT_CHILD_NODE'),
    addSibling: () => mindMap.execCommand('INSERT_NODE'),
    addParent: () => mindMap.execCommand('INSERT_PARENT_NODE'),
    moveUp: () => mindMap.execCommand('UP_NODE'),
    moveDown: () => mindMap.execCommand('DOWN_NODE'),
    toggleExpand: () => mindMap.renderer.toggleActiveExpand(),
    remove: () => mindMap.execCommand('REMOVE_NODE'),
    removeOnlyCurrent: () => mindMap.execCommand('REMOVE_CURRENT_NODE'),
    undo: () => mindMap.execCommand('BACK'),
    redo: () => mindMap.execCommand('FORWARD'),
    fit: () => (mindMap.view as any).fit(),
    resetZoom: () => mindMap.view.reset(),
    zoomIn: () => mindMap.view.enlarge(undefined, undefined, false),
    zoomOut: () => mindMap.view.narrow(undefined, undefined, false),
    edit: () => mindMap.renderer.startTextEdit(),
    getActiveNodes: activeNodes,
    getPrimaryNode: primaryNode,
    getPrimaryNodeData: () => primaryNode()?.getData?.() ?? null,
    getSelectedText: () => {
      const richText = (mindMap as any).richText;
      const range = richText?.range ?? richText?.lastRange;
      if (!range || !richText?.quill?.getText) return '';
      return String(richText.quill.getText(range.index, range.length) ?? '').trim();
    },
    setNote: (note) => forEachActive((node) => mindMap.execCommand('SET_NODE_NOTE', node, note)),
    setTags: (tags) => forEachActive((node) => mindMap.execCommand('SET_NODE_TAG', node, tags)),
    setIcons: (icons) => forEachActive((node) => mindMap.execCommand('SET_NODE_ICON', node, icons)),
    setLink: (link, title = '') => forEachActive((node) => mindMap.execCommand('SET_NODE_HYPERLINK', node, link, title)),
    setImage: (image) => forEachActive((node) => mindMap.execCommand('SET_NODE_IMAGE', node, image)),
    insertFormula: (formula, mode = 'inline') => {
      const richText = (mindMap as any).richText;
      const quill = richText?.quill;
      const range = richText?.range ?? richText?.lastRange;
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
    addSummary: () => mindMap.execCommand('ADD_GENERALIZATION'),
    startRelation: () => (mindMap as any).associativeLine?.createLineFromActiveNode?.(),
    toggleTodo: () => {
      const node = primaryNode();
      if (!node) return;
      const todo = nextTodo(node.getData?.('yemindTodo'));
      mindMap.execCommand('SET_NODE_DATA', node, { yemindTodo: todo });
      (mindMap as any).render?.();
    },
    setTodo: (todo) => {
      forEachActive((node) => mindMap.execCommand('SET_NODE_DATA', node, { yemindTodo: todo }));
      (mindMap as any).render?.();
    },
    setComments: (comments) => {
      const node = primaryNode();
      if (!node) return;
      mindMap.execCommand('SET_NODE_DATA', node, { yemindComments: comments });
      (mindMap as any).render?.();
    },
    formatText: (config) => (mindMap as any).richText?.formatText?.(config),
    clearTextFormat: () => (mindMap as any).richText?.removeFormat?.(),
    setCloze: (enabled) => (mindMap as any).richText?.formatText?.(enabled
      ? { background: '#f5dfa0', color: 'transparent' }
      : { background: false, color: false }),
  };
}
