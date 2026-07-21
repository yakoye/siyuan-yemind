import type { MindMapTree } from '../model/types';

export interface OutlineRow {
  uid: string;
  text: string;
  depth: number;
  hasChildren: boolean;
  isRoot: boolean;
}

export type OutlineKeyAction = 'none' | 'insert-sibling' | 'insert-child' | 'remove' | 'previous' | 'next' | 'cancel';

export interface OutlineKeyContext {
  key: string;
  empty: boolean;
  isRoot: boolean;
  readonly: boolean;
  shiftKey?: boolean;
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
    rows.push({
      uid: String(node.data.uid ?? path),
      text: plainText(node) || '未命名节点',
      depth,
      hasChildren: node.children.length > 0,
      isRoot: depth === 0,
    });
    node.children.forEach((child, index) => visit(child, depth + 1, `${path}.${index}`));
  };
  visit(tree, 0, 'root');
  return rows;
}

export function resolveOutlineKeyAction(context: OutlineKeyContext): OutlineKeyAction {
  if (context.key === 'ArrowUp') return 'previous';
  if (context.key === 'ArrowDown') return 'next';
  if (context.key === 'Escape') return 'cancel';
  if (context.readonly) return 'none';
  if (context.key === 'Enter') return context.isRoot ? 'insert-child' : 'insert-sibling';
  if (context.key === 'Tab') return context.shiftKey ? 'none' : 'insert-child';
  if ((context.key === 'Backspace' || context.key === 'Delete') && context.empty && !context.isRoot) return 'remove';
  return 'none';
}

export function renderOutlineHtml(tree: MindMapTree, readonly = false): string {
  return flattenOutline(tree).map((row) => {
    const readonlyAttribute = readonly ? ' readonly' : '';
    return `<div class="ymz-outline-row" role="treeitem" aria-level="${row.depth + 1}" data-outline-uid="${escapeHtml(row.uid)}" data-outline-root="${row.isRoot}" style="--ymz-outline-depth:${row.depth}"><span class="ymz-outline-row__branch" aria-hidden="true">${row.hasChildren ? '▾' : '•'}</span><textarea class="ymz-outline-row__editor" data-outline-editor rows="1" data-outline-original="${escapeHtml(row.text)}" aria-label="编辑节点：${escapeHtml(row.text)}"${readonlyAttribute}>${escapeHtml(row.text)}</textarea></div>`;
  }).join('');
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
