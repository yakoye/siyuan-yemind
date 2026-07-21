import type { MindMapTree } from '../model/types';

export interface OutlineRow {
  uid: string;
  text: string;
  html: string;
  richText: boolean;
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

function plainTextFromHtml(value: string): string {
  const element = document.createElement('div');
  element.innerHTML = value;
  return (element.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

function nodeText(tree: MindMapTree): { text: string; html: string; richText: boolean } {
  const value = String(tree.data.text ?? '');
  if (tree.data.richText) {
    return { text: plainTextFromHtml(value), html: sanitizeOutlineHtml(value), richText: true };
  }
  return {
    text: value,
    html: escapeHtml(value).replaceAll('\n', '<br>'),
    richText: false,
  };
}

export function flattenOutline(tree: MindMapTree): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const visit = (node: MindMapTree, depth: number, path: string): void => {
    const hasChildren = node.children.length > 0;
    const expanded = node.data.expand !== false;
    const content = nodeText(node);
    rows.push({
      uid: String(node.data.uid ?? path),
      ...content,
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
    const tabindex = readonly ? '-1' : '0';
    const branch = row.hasChildren ? (row.expanded ? '▾' : '▸') : '•';
    const label = row.text || '空节点';
    const encodedOriginal = encodeURIComponent(row.html);
    return `<div class="ymz-outline-row" role="treeitem" aria-level="${row.depth + 1}" aria-expanded="${row.hasChildren ? row.expanded : 'false'}" data-outline-uid="${escapeHtml(row.uid)}" data-outline-root="${row.isRoot}" data-outline-has-children="${row.hasChildren}" data-outline-expanded="${row.expanded}" style="--ymz-outline-depth:${row.depth}"><button type="button" class="ymz-outline-row__branch" data-outline-toggle aria-label="${row.expanded ? '折叠' : '展开'}"${row.hasChildren ? '' : ' disabled'}>${branch}</button><div class="ymz-outline-row__editor" data-outline-editor data-outline-original="${escapeHtml(encodedOriginal)}" data-outline-rich-text="${row.richText}" data-placeholder="空节点" aria-label="编辑节点：${escapeHtml(label)}" tabindex="${tabindex}"${readonly ? ' aria-readonly="true"' : ''}>${row.html}</div></div>`;
  }).join('');
}

/** Allow the Quill subset emitted by YeMind while removing executable markup. */
export function sanitizeOutlineHtml(value: string): string {
  const template = document.createElement('template');
  template.innerHTML = value;
  template.content.querySelectorAll('script,style,iframe,object,embed,meta,link').forEach((node) => node.remove());
  template.content.querySelectorAll<HTMLElement>('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const raw = attribute.value;
      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(raw)) node.removeAttribute(attribute.name);
      if (name === 'style' && /(url\s*\(|expression\s*\(|javascript:)/i.test(raw)) node.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
