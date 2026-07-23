import type { NodeComment, NodeTodo } from '../content/nodeContentState';
import { normalizeNodeNote } from '../content/nodeNoteState';
import { createMarkerIconList } from './localAssetCatalogs';

export interface NodeDecorationSettings {
  showTodoBadge: boolean;
  showCommentBadge: boolean;
}

let decorationSettings: NodeDecorationSettings = { showTodoBadge: true, showCommentBadge: true };

export function configureNodeDecorations(patch: Partial<NodeDecorationSettings>): void {
  decorationSettings = { ...decorationSettings, ...patch };
}

export const YEMIND_LEGACY_ICON_LIST = [{
  name: 'YeMind', type: 'yemind', list: [
    { name: 'star', icon: svg('★') }, { name: 'flag', icon: svg('⚑') },
    { name: 'question', icon: svg('?') }, { name: 'idea', icon: svg('✦') },
    { name: 'check', icon: svg('✓') }, { name: 'warning', icon: svg('!') },
  ],
}];

export function createYemindIconList(pluginBaseUrl?: string): Array<Record<string, unknown>> {
  return [...YEMIND_LEGACY_ICON_LIST, ...createMarkerIconList(pluginBaseUrl)];
}

/** Backward-compatible default used by tests and non-SiYuan previews. */
export const YEMIND_ICON_LIST = createYemindIconList();

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
  checkbox.title = todo.text ? `${todo.checked ? '待办已完成' : '待办未完成'}：${todo.text}` : (todo.checked ? '待办已完成' : '待办未完成');
  checkbox.textContent = todo.checked ? '✓' : '';
  checkbox.addEventListener('click', (event) => {
    event.preventDefault(); event.stopPropagation();
    node.mindMap?.emit?.('yemind_todo_toggle', node);
  });
  el.appendChild(checkbox);
  return { el, width: 20, height: 20 };
}

function noteSvg(): string {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M6.5 3.75h8.8l3.2 3.2v13.3H6.5a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.7"/><path d="M15.2 3.9v3.4h3.2M8 11h7.5M8 14.5h7.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
}

function commentSvg(): string {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M6.25 4.75h11.5A2.5 2.5 0 0 1 20.25 7.25v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.25 2.9v-2.9A2.5 2.5 0 0 1 3.75 15.25v-8a2.5 2.5 0 0 1 2.5-2.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function createBadge(node: any, type: 'note' | 'comments'): HTMLButtonElement {
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = `ymz-node-content-badge ymz-node-content-badge--${type}${type === 'comments' ? ' ymz-node-comment-badge' : ' ymz-node-note-badge'}`;
  badge.dataset.yemindBadge = type;
  const accessibleLabel = type === 'note' ? '备注' : '批注';
  badge.setAttribute('aria-label', accessibleLabel);
  badge.innerHTML = type === 'note' ? noteSvg() : commentSvg();
  badge.addEventListener('click', (event) => {
    event.preventDefault(); event.stopPropagation();
    node.mindMap?.emit?.('yemind_badge_click', type, node);
  });
  badge.addEventListener('pointerenter', () => node.mindMap?.emit?.('yemind_badge_hover', type, node, badge, true));
  badge.addEventListener('pointerleave', () => node.mindMap?.emit?.('yemind_badge_hover', type, node, badge, false));
  return badge;
}

export function createNodePostfixContent(node: any): { el: HTMLElement; width: number; height: number } | null {
  const note = normalizeNodeNote(node.getData?.('yemindNote') ?? node.getData?.('note'));
  const comments = (node.getData?.('yemindComments') ?? []) as NodeComment[];
  const hasComments = decorationSettings.showCommentBadge && comments.length > 0;
  if (!note && !hasComments) return null;
  const el = document.createElement('span');
  el.className = 'ymz-node-postfix';
  let count = 0;
  if (note) { el.appendChild(createBadge(node, 'note')); count += 1; }
  if (hasComments) { el.appendChild(createBadge(node, 'comments')); count += 1; }
  return { el, width: count * 24 + Math.max(0, count - 1) * 3, height: 24 };
}
