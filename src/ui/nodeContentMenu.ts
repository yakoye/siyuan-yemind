import { getTodoMenuState, type NodeTodo, type TodoMenuState } from '../content/nodeContentState';

export const NODE_CONTENT_MENU_LABELS = [
  '添加待办',
  '删除待办',
  '备注',
  '批注',
  '标签',
  '图标',
  '链接',
  '图片',
  '公式',
  '行内链接',
  '代码块',
  '概要',
  '添加外框',
  '关联线',
] as const;

export function createTodoMenuDescriptor(todo: NodeTodo | null | undefined): TodoMenuState {
  return getTodoMenuState(todo);
}


export type SummaryMenuAction = 'add' | 'remove-current' | 'remove-all';

export interface SummaryMenuDescriptor {
  action: SummaryMenuAction;
  label: string;
  warning: boolean;
}

export function createSummaryMenuDescriptor(nodes: any[]): SummaryMenuDescriptor {
  const primary = nodes[0];
  if (primary?.isGeneralization) {
    return { action: 'remove-current', label: '删除当前概要', warning: true };
  }
  if (nodes.length === 1 && primary?.checkHasGeneralization?.()) {
    return { action: 'remove-all', label: '删除该节点全部概要', warning: true };
  }
  return {
    action: 'add',
    label: nodes.length > 1 ? '为所选节点添加概要' : '添加概要',
    warning: false,
  };
}

export interface NodeMenuAvailabilityInput {
  readonly: boolean;
  primaryIsRoot: boolean;
  primaryIsGeneralization: boolean;
  hasRichTextSelection: boolean;
  hasCodeBlock: boolean;
  canAddOuterFrame: boolean;
}

export interface NodeMenuAvailability {
  edit: boolean;
  addChild: boolean;
  addSibling: boolean;
  addParent: boolean;
  copy: boolean;
  cut: boolean;
  paste: boolean;
  nodeContent: boolean;
  inlineLink: boolean;
  codeBlock: boolean;
  summary: boolean;
  relation: boolean;
  outerFrame: boolean;
  move: boolean;
  resetLayout: boolean;
  remove: boolean;
  removeOnlyCurrent: boolean;
  toggleExpand: boolean;
}

export function createNodeMenuAvailability(input: NodeMenuAvailabilityInput): NodeMenuAvailability {
  const editable = !input.readonly;
  const regularNode = !input.primaryIsGeneralization;
  const nonRoot = !input.primaryIsRoot;
  return {
    edit: editable,
    addChild: editable && regularNode,
    addSibling: editable && nonRoot && regularNode,
    addParent: editable && nonRoot && regularNode,
    copy: true,
    cut: editable && nonRoot,
    paste: editable && regularNode,
    nodeContent: editable && regularNode,
    inlineLink: editable && input.hasRichTextSelection,
    codeBlock: editable && (input.hasRichTextSelection || input.hasCodeBlock),
    summary: editable,
    relation: editable && regularNode,
    outerFrame: editable && input.canAddOuterFrame,
    move: editable && nonRoot && regularNode,
    resetLayout: editable,
    remove: editable && nonRoot,
    removeOnlyCurrent: editable && nonRoot,
    toggleExpand: true,
  };
}
