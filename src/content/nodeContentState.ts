export interface NodeTodo {
  checked: boolean;
  text?: string;
}

export interface NodeComment {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export function toggleTodo(todo: NodeTodo | null | undefined): NodeTodo {
  if (!todo) return { checked: false };
  return { ...todo, checked: !todo.checked };
}

export interface TodoMenuState {
  label: '添加待办' | '删除待办';
  next: NodeTodo | null;
  warning: boolean;
}

export function getTodoMenuState(todo: NodeTodo | null | undefined): TodoMenuState {
  if (!todo) return { label: '添加待办', next: { checked: false }, warning: false };
  return { label: '删除待办', next: null, warning: true };
}

export function addComment(
  comments: NodeComment[] | null | undefined,
  text: string,
  now = Date.now(),
  id = `comment_${now}_${Math.random().toString(36).slice(2, 8)}`,
): NodeComment[] {
  const value = text.trim();
  if (!value) return [...(comments ?? [])];
  return [...(comments ?? []), { id, text: value, createdAt: now, updatedAt: now }];
}

export function editComment(
  comments: NodeComment[] | null | undefined,
  id: string,
  text: string,
  now = Date.now(),
): NodeComment[] {
  const value = text.trim();
  return (comments ?? []).map((comment) => comment.id === id
    ? { ...comment, text: value, updatedAt: now }
    : comment);
}

export function removeComment(comments: NodeComment[] | null | undefined, id: string): NodeComment[] {
  return (comments ?? []).filter((comment) => comment.id !== id);
}

export function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((item) => {
    const value = String(item ?? '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    result.push(value);
  });
  return result;
}
