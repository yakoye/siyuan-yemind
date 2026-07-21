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

export function createNodePostfixContent(node: any): { el: HTMLElement; width: number; height: number } | null {
  const todo = node.getData?.('yemindTodo') as NodeTodo | null | undefined;
  const comments = (node.getData?.('yemindComments') ?? []) as NodeComment[];
  const showTodo = Boolean(todo && decorationSettings.showTodoBadge);
  const showComments = comments.length > 0 && decorationSettings.showCommentBadge;
  if (!showTodo && !showComments) return null;

  const el = document.createElement('span');
  el.className = 'ymz-node-badges';
  if (showTodo && todo) {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = `ymz-node-badge ymz-node-badge--todo${todo.checked ? ' is-checked' : ''}`;
    badge.textContent = todo.checked ? '✓' : '○';
    const state = todo.checked ? '待办已完成' : '待办未完成';
    badge.title = todo.text ? `${state}：${todo.text}` : state;
    badge.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      node.mindMap?.emit?.('yemind_badge_click', 'todo', node);
    });
    el.appendChild(badge);
  }
  if (showComments) {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'ymz-node-badge ymz-node-badge--comments';
    badge.textContent = `批${comments.length}`;
    badge.title = `${comments.length} 条批注`;
    badge.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      node.mindMap?.emit?.('yemind_badge_click', 'comments', node);
    });
    el.appendChild(badge);
  }
  return { el, width: (showTodo ? 24 : 0) + (showComments ? 34 : 0), height: 20 };
}
