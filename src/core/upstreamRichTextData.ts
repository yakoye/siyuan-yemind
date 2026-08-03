import type { MindMapNodeData, MindMapTree } from '../model/types';

function cloneTree<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function plainTextToRichHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => `<p>${line ? escapeHtml(line) : '<br>'}</p>`)
    .join('');
}

function normalizeNodeData(data: MindMapNodeData): boolean {
  let changed = false;
  if (data.richText !== true) {
    data.text = plainTextToRichHtml(data.text);
    changed = true;
  }
  data.richText = true;

  const generalization = data.generalization;
  if (Array.isArray(generalization)) {
    generalization.forEach((item) => {
      if (item && typeof item === 'object') {
        changed = normalizeNodeData(item as MindMapNodeData) || changed;
      }
    });
  } else if (generalization && typeof generalization === 'object') {
    changed = normalizeNodeData(generalization as MindMapNodeData) || changed;
  }
  return changed;
}

export interface UpstreamRichTextNormalizationResult {
  tree: MindMapTree;
  changed: boolean;
}

export function normalizeTreeForUpstreamRichTextInPlaceWithResult(
  tree: MindMapTree,
): UpstreamRichTextNormalizationResult {
  let changed = false;
  const visit = (node: MindMapTree): void => {
    changed = normalizeNodeData(node.data) || changed;
    (node.children ?? []).forEach(visit);
  };
  visit(tree);
  return { tree, changed };
}

export function normalizeTreeForUpstreamRichTextInPlace(tree: MindMapTree): MindMapTree {
  return normalizeTreeForUpstreamRichTextInPlaceWithResult(tree).tree;
}

/**
 * Build the disposable runtime tree expected by the official RichText plugin.
 * Stored/imported data is cloned so compatibility migrations never mutate the
 * caller's snapshot before the editor commits a real transaction.
 */
export function normalizeTreeForUpstreamRichText(tree: MindMapTree): MindMapTree {
  const runtime = cloneTree(tree);
  return normalizeTreeForUpstreamRichTextInPlace(runtime);
}
