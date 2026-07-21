import type { NodeComment, NodeTodo } from '../content/nodeContentState';

export interface NodeDecorationSettings {
  showTodoBadge: boolean;
  showCommentBadge: boolean;
}

let decorationSettings: NodeDecorationSettings = {
  showTodoBadge: true,
  showCommentBadge: true,
};

export function configureNodeDecorations(patch: Partial<NodeDecorationSettings>): void {
  decorationSettings = { ...decorationSettings, ...patch };
}

export const YEMIND_ICON_LIST = [{
  name: 'YeMind Zen',
  type: 'yemind',
  list: [
    { name: 'star', icon: svg('★') },
    { name: 'flag', icon: svg('⚑') },
    { name: 'question', icon: svg('?') },
    { name: 'idea', icon: svg('✦') },
    { name: 'check', icon: svg('✓') },
    { name: 'warning', icon: svg('!') },
  ],
}];

function svg(text: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#176b50"/><text x="16" y="21" text-anchor="middle" font-size="17" font-family="Arial,sans-serif" font-weight="700" fill="#fff">${text}</text></svg>`;
}

export function createNodePrefixContent(node: any): { el: HTMLElement; width: number; height: number } | null {
  const todo = node.getData?.('yemindTodo') as NodeTodo | null | undefined;
  if (!todo || !decorationSettings.showTodoBadge) return null;

  const el = document.createElement('span');
  el.className = 'ymz-node-prefix';
  const checkbox = document.createElement('button');
  checkbox.type = 'button';
  checkbox.className = `ymz-node-todo-checkbox${todo.checked ? ' is-checked' : ''}`;
  checkbox.setAttribute('aria-label', todo.checked ? '待办已完成' : '待办未完成');
  checkbox.title = todo.text
    ? `${todo.checked ? '待办已完成' : '待办未完成'}：${todo.text}`
    : (todo.checked ? '待办已完成' : '待办未完成');
  checkbox.textContent = todo.checked ? '✓' : '';
  checkbox.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    node.mindMap?.emit?.('yemind_todo_toggle', node);
  });
  el.appendChild(checkbox);
  return { el, width: 20, height: 20 };
}

export function createNodePostfixContent(node: any): { el: HTMLElement; width: number; height: number } | null {
  const comments = (node.getData?.('yemindComments') ?? []) as NodeComment[];
  if (comments.length === 0 || !decorationSettings.showCommentBadge) return null;

  const el = document.createElement('span');
  el.className = 'ymz-node-postfix';
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'ymz-node-comment-badge';
  badge.title = `${comments.length} 条批注`;
  badge.setAttribute('aria-label', `${comments.length} 条批注`);
  badge.innerHTML = '<svg aria-hidden="true"><use xlink:href="#iconMessage"></use></svg>'
    + (comments.length > 1 ? `<span class="ymz-node-comment-count">${comments.length}</span>` : '');
  badge.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    node.mindMap?.emit?.('yemind_badge_click', 'comments', node);
  });
  el.appendChild(badge);
  return { el, width: comments.length > 1 ? 30 : 22, height: 20 };
}
