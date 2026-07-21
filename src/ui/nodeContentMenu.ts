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
