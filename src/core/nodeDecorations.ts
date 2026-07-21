import type { NodeComment, NodeTodo } from '../content/nodeContentState';

export interface NodeDecorationSettings {
  showTodoBadge: boolean;
  showCommentBadge: boolean;
  showNodeMenuButton: boolean;
}

let decorationSettings: NodeDecorationSettings = {
  showTodoBadge: true,
  showCommentBadge: true,
  showNodeMenuButton: true,
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

function createCommentButton(node: any, comments: NodeComment[]): HTMLButtonElement {
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'ymz-node-comment-badge';
  badge.title = `${comments.length} 条批注`;
  badge.setAttribute('aria-label', `${comments.length} 条批注`);
  // 使用原备注入口的清晰线框图标，不依赖思源全局 symbol，导出和深色模式下也能显示。
  badge.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M6.25 4.75h11.5A2.5 2.5 0 0 1 20.25 7.25v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.25 2.9v-2.9A2.5 2.5 0 0 1 3.75 15.25v-8a2.5 2.5 0 0 1 2.5-2.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>` + (comments.length > 1 ? `<span class="ymz-node-comment-count">${comments.length}</span>` : '');
  badge.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    node.mindMap?.emit?.('yemind_badge_click', 'comments', node);
  });
  return badge;
}

function createNodeMenuButton(node: any): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ymz-node-menu-button';
  button.title = '节点菜单';
  button.setAttribute('aria-label', '节点菜单');
  button.innerHTML = '<span aria-hidden="true">•••</span>';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = button.getBoundingClientRect();
    const menuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left,
      clientY: rect.bottom + 2,
    });
    node.mindMap?.emit?.('yemind_node_menu', menuEvent, node);
  });
  return button;
}

export function createNodePostfixContent(node: any): { el: HTMLElement; width: number; height: number } | null {
  const comments = (node.getData?.('yemindComments') ?? []) as NodeComment[];
  const showComments = comments.length > 0 && decorationSettings.showCommentBadge;
  const showMenu = Boolean(node.getData?.('isActive')) && decorationSettings.showNodeMenuButton;
  if (!showComments && !showMenu) return null;

  const el = document.createElement('span');
  el.className = 'ymz-node-postfix';
  let width = 0;
  if (showComments) {
    el.appendChild(createCommentButton(node, comments));
    width += comments.length > 1 ? 30 : 24;
  }
  if (showMenu) {
    if (width > 0) width += 3;
    el.appendChild(createNodeMenuButton(node));
    width += 24;
  }
  return { el, width, height: 24 };
}
