import type { MindMapTree } from '../model/types';

export interface OutlineRow {
  uid: string;
  text: string;
  depth: number;
  hasChildren: boolean;
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
    });
    node.children.forEach((child, index) => visit(child, depth + 1, `${path}.${index}`));
  };
  visit(tree, 0, 'root');
  return rows;
}

export function renderOutlineHtml(tree: MindMapTree): string {
  return flattenOutline(tree).map((row) => `<button class="ymz-outline-row" data-outline-uid="${escapeHtml(row.uid)}" style="--ymz-outline-depth:${row.depth}" title="${escapeHtml(row.text)}"><span class="ymz-outline-row__branch">${row.hasChildren ? '▾' : '·'}</span><span>${escapeHtml(row.text)}</span></button>`).join('');
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
