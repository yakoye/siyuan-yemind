import type { MindMapTree } from '../model/types';

export interface OutlineRow {
  uid: string;
  text: string;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  isRoot: boolean;
}

export type OutlineKeyAction =
  | 'none'
  | 'hard-break'
  | 'insert-sibling'
  | 'insert-child'
  | 'indent'
  | 'outdent'
  | 'remove'
  | 'previous'
  | 'next'
  | 'collapse'
  | 'expand'
  | 'cancel';

export interface OutlineKeyContext {
  key: string;
  empty: boolean;
  isRoot: boolean;
  readonly: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  atStart?: boolean;
  atEnd?: boolean;
  composing?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

function plainText(tree: MindMapTree): string {
  const value = String(tree.data.text ?? '');
  if (!tree.data.richText) return value;
  const element = document.createElement('div');
  element.innerHTML = value;
  return (element.textContent ?? '').trim();
}

export function flattenOutline(tree: MindMapTree): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const visit = (node: MindMapTree, depth: number, path: string): void => {
    const hasChildren = node.children.length > 0;
    const expanded = node.data.expand !== false;
    rows.push({
      uid: String(node.data.uid ?? path),
      text: plainText(node),
      depth,
      hasChildren,
      expanded,
      isRoot: depth === 0,
    });
    if (hasChildren && expanded) {
      node.children.forEach((child, index) => visit(child, depth + 1, `${path}.${index}`));
    }
  };
  visit(tree, 0, 'root');
  return rows;
}

export function resolveOutlineKeyAction(context: OutlineKeyContext): OutlineKeyAction {
  if (context.composing) return 'none';
  if (context.key === 'ArrowUp') return 'previous';
  if (context.key === 'ArrowDown') return 'next';
  if (context.key === 'Escape') return 'cancel';
  if (context.readonly) return 'none';

  const hasCommandModifier = Boolean(context.altKey || context.ctrlKey || context.metaKey);
  if (context.key === 'Enter') {
    if (context.shiftKey && !hasCommandModifier) return 'hard-break';
    if (context.shiftKey || hasCommandModifier) return 'none';
    return context.isRoot ? 'insert-child' : 'insert-sibling';
  }
  if (context.key === 'Tab' && !hasCommandModifier) return context.shiftKey ? 'outdent' : 'indent';
  if ((context.key === 'Backspace' || context.key === 'Delete') && context.empty && !context.isRoot) return 'remove';
  if (context.key === 'ArrowLeft' && context.atStart && context.hasChildren && context.expanded) return 'collapse';
  if (context.key === 'ArrowRight' && context.atEnd && context.hasChildren && context.expanded === false) return 'expand';
  return 'none';
}

export function renderOutlineHtml(tree: MindMapTree, readonly = false): string {
  return flattenOutline(tree).map((row) => {
    const readonlyAttribute = readonly ? ' readonly' : '';
    const branch = row.hasChildren ? (row.expanded ? '▾' : '▸') : '•';
    const label = row.text || '空节点';
    return `<div class="ymz-outline-row" role="treeitem" aria-level="${row.depth + 1}" aria-expanded="${row.hasChildren ? row.expanded : 'false'}" data-outline-uid="${escapeHtml(row.uid)}" data-outline-root="${row.isRoot}" data-outline-has-children="${row.hasChildren}" data-outline-expanded="${row.expanded}" style="--ymz-outline-depth:${row.depth}"><button type="button" class="ymz-outline-row__branch" data-outline-toggle aria-label="${row.expanded ? '折叠' : '展开'}"${row.hasChildren ? '' : ' disabled'}>${branch}</button><textarea class="ymz-outline-row__editor" data-outline-editor rows="1" data-outline-original="${escapeHtml(row.text)}" placeholder="空节点" aria-label="编辑节点：${escapeHtml(label)}"${readonlyAttribute}>${escapeHtml(row.text)}</textarea></div>`;
  }).join('');
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
