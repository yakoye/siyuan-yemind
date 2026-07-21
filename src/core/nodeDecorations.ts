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

function createCommentButton(node: any): HTMLButtonElement {
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'ymz-node-comment-badge';
  badge.title = '批注';
  badge.setAttribute('aria-label', '批注');
  // One stable glyph is easier to scan than a changing count and matches the official node chrome.
  badge.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M6.25 4.75h11.5A2.5 2.5 0 0 1 20.25 7.25v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.25 2.9v-2.9A2.5 2.5 0 0 1 3.75 15.25v-8a2.5 2.5 0 0 1 2.5-2.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  badge.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    node.mindMap?.emit?.('yemind_badge_click', 'comments', node);
  });
  return badge;
}

export function createNodePostfixContent(node: any): { el: HTMLElement; width: number; height: number } | null {
  const comments = (node.getData?.('yemindComments') ?? []) as NodeComment[];
  if (comments.length === 0 || !decorationSettings.showCommentBadge) return null;

  const el = document.createElement('span');
  el.className = 'ymz-node-postfix';
  el.appendChild(createCommentButton(node));
  return { el, width: 24, height: 24 };
}
