import type { MindMapTree } from '../model/types';
import { sanitizeRichHtml } from '../content/sanitizeRichHtml';

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
  return { text: value, html: escapeHtml(value).replaceAll('\n', '<br>'), richText: false };
}

export function flattenOutline(tree: MindMapTree): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const visit = (node: MindMapTree, depth: number, path: string): void => {
    const children = Array.isArray(node.children) ? node.children : [];
    const hasChildren = children.length > 0;
    const expanded = node.data.expand !== false;
    rows.push({
      uid: String(node.data.uid ?? path),
      ...nodeText(node),
      depth,
      hasChildren,
      expanded,
      isRoot: depth === 0,
    });
    if (hasChildren && expanded) children.forEach((child, index) => visit(child, depth + 1, `${path}.${index}`));
  };
  visit(tree, 0, 'root');
  return rows;
}

export function resolveOutlineKeyAction(context: OutlineKeyContext): OutlineKeyAction {
  if (context.composing) return 'none';
  if (context.key === 'ArrowUp') return context.atStart ? 'previous' : 'none';
  if (context.key === 'ArrowDown') return context.atEnd ? 'next' : 'none';
  if (context.key === 'Escape') return 'cancel';
  if (context.readonly) return 'none';
  const hasCommandModifier = Boolean(context.altKey || context.ctrlKey || context.metaKey);
  if (context.key === 'Enter') {
    if (context.shiftKey && !hasCommandModifier) return 'hard-break';
    if (context.shiftKey || hasCommandModifier) return 'none';
    return context.isRoot ? 'insert-child' : 'insert-sibling';
  }
  if (context.key === 'Tab' && !hasCommandModifier) return context.shiftKey ? 'outdent' : 'indent';
  if (context.key === 'ArrowLeft' && context.atStart && context.hasChildren && context.expanded) return 'collapse';
  if (context.key === 'ArrowRight' && context.atEnd && context.hasChildren && context.expanded === false) return 'expand';
  return 'none';
}

function rowHtml(row: OutlineRow, readonly: boolean): string {
  const tabindex = readonly ? '-1' : '0';
  const branch = row.hasChildren ? (row.expanded ? '▾' : '▸') : '•';
  const label = row.text || '空节点';
  const encodedOriginal = encodeURIComponent(row.html);
  return `<div class="ymz-outline-row" role="treeitem" aria-level="${row.depth + 1}" aria-expanded="${row.hasChildren ? row.expanded : 'false'}" data-outline-uid="${escapeHtml(row.uid)}" data-outline-root="${row.isRoot}" data-outline-has-children="${row.hasChildren}" data-outline-expanded="${row.expanded}" style="--ymz-outline-depth:${row.depth}"><button type="button" class="ymz-outline-row__drag" data-outline-drag-handle draggable="${readonly ? 'false' : 'true'}" aria-label="拖动节点" title="拖动调整层级和顺序"${readonly ? ' disabled' : ''}>⋮⋮</button><button type="button" class="ymz-outline-row__branch" data-outline-toggle aria-label="${row.expanded ? '折叠' : '展开'}"${row.hasChildren ? '' : ' disabled'}>${branch}</button><div class="ymz-outline-row__editor" data-outline-editor data-outline-original="${escapeHtml(encodedOriginal)}" data-outline-rich-text="${row.richText}" data-placeholder="空节点" aria-label="编辑节点：${escapeHtml(label)}" tabindex="${tabindex}"${readonly ? ' aria-readonly="true"' : ''}>${row.html}</div></div>`;
}

export function renderOutlineHtml(tree: MindMapTree, readonly = false): string {
  return flattenOutline(tree).map((row) => rowHtml(row, readonly)).join('');
}

/**
 * Patch outline rows by stable UID. The active row/editor is never replaced or
 * rewritten, so a Quill session and its IME/selection state survive map saves.
 */
export function patchOutlineTree(
  container: HTMLElement,
  tree: MindMapTree,
  readonly = false,
  activeUid: string | null = null,
): void {
  const rows = flattenOutline(tree);
  const existing = new Map<string, HTMLElement>();
  container.querySelectorAll<HTMLElement>(':scope > [data-outline-uid]').forEach((row) => {
    existing.set(row.dataset.outlineUid ?? '', row);
  });
  const fragment = document.createDocumentFragment();
  const keep = new Set<string>();
  rows.forEach((data) => {
    keep.add(data.uid);
    let row = existing.get(data.uid);
    if (!row) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = rowHtml(data, readonly);
      row = wrapper.firstElementChild as HTMLElement;
    } else {
      row.setAttribute('aria-level', String(data.depth + 1));
      row.setAttribute('aria-expanded', data.hasChildren ? String(data.expanded) : 'false');
      row.dataset.outlineRoot = String(data.isRoot);
      row.dataset.outlineHasChildren = String(data.hasChildren);
      row.dataset.outlineExpanded = String(data.expanded);
      row.style.setProperty('--ymz-outline-depth', String(data.depth));
      const branch = row.querySelector<HTMLButtonElement>('[data-outline-toggle]');
      if (branch) {
        branch.textContent = data.hasChildren ? (data.expanded ? '▾' : '▸') : '•';
        branch.disabled = !data.hasChildren;
        branch.setAttribute('aria-label', data.expanded ? '折叠' : '展开');
      }
      const handle = row.querySelector<HTMLButtonElement>('[data-outline-drag-handle]');
      if (handle) {
        handle.draggable = !readonly;
        handle.disabled = readonly;
      }
      const editor = row.querySelector<HTMLElement>('[data-outline-editor]');
      if (editor) {
        editor.tabIndex = readonly ? -1 : 0;
        if (readonly) editor.setAttribute('aria-readonly', 'true'); else editor.removeAttribute('aria-readonly');
        if (data.uid !== activeUid) {
          editor.innerHTML = data.html;
          editor.dataset.outlineOriginal = encodeURIComponent(data.html);
          editor.dataset.outlineRichText = String(data.richText);
          editor.setAttribute('aria-label', `编辑节点：${data.text || '空节点'}`);
        }
      }
    }
    fragment.appendChild(row);
  });
  existing.forEach((row, uid) => { if (!keep.has(uid)) row.remove(); });
  container.appendChild(fragment);
}

/** Allow the Quill subset emitted by YeMind while removing executable markup. */
export function sanitizeOutlineHtml(value: string): string {
  return sanitizeRichHtml(value);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
