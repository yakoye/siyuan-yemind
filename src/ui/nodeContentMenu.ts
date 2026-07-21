import { getTodoMenuState, type NodeTodo, type TodoMenuState } from '../content/nodeContentState';

export const NODE_CONTENT_MENU_LABELS = [
  '添加待办',
  '待办完成',
  '删除待办',
  '批注',
  '标签',
  '图标',
  '链接',
  '图片',
  '公式',
  '行内链接',
  '代码块',
  '概要',
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
