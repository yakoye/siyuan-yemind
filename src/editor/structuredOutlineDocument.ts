import type { MindMapNodeData, MindMapTree } from '../model/types';
import { sanitizeRichHtml } from '../content/sanitizeRichHtml';
import { OUTLINE_TEXT_INDENT, parseOutlineText, outlineNodePlainText } from './outlineTextDocument';
import { outlineAccessoriesFromData, type OutlineAccessories } from './outlineAccessories';

export type StructuredOutlineBlockKind = 'node' | 'summary';

export interface StructuredOutlineBlock {
  uid: string;
  depth: number;
  html: string;
  text: string;
  kind: StructuredOutlineBlockKind;
  parentUid: string | null;
  hidden: boolean;
  expanded: boolean;
  hasChildren: boolean;
  isRoot: boolean;
  pristine: boolean;
  accessories: OutlineAccessories;
}

export interface StructuredOutlineBuildResult {
  tree: MindMapTree;
  nodeCount: number;
  reusedNodeCount: number;
  createdNodeCount: number;
}

export interface StructuredOutlinePasteBlock {
  text: string;
  depth: number;
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Map data is JSON-compatible; fall through to the deterministic clone.
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('\n', '<br>');
}

export function normalizeStructuredOutlineBoundaryText(value: unknown): string {
  const normalized = String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200b\ufeff]/g, '');
  const withoutBoundaryLines = normalized
    .replace(/^(?:[ \t\u00a0\u3000]*\n)+/, '')
    .replace(/(?:\n[ \t\u00a0\u3000]*)+$/, '');
  return withoutBoundaryLines.trim().length > 0 ? withoutBoundaryLines : '';
}

function trimRichHtmlBoundaryLines(value: string): string {
  if (typeof document === 'undefined') {
    return value
      .replace(/^((?:<(?:p|div|span|strong|b|em|i|u|s|strike|code|mark|sub|sup)\b[^>]*>)*)[\r\n]+/i, '$1')
      .replace(/[\r\n]+((?:<\/(?:p|div|span|strong|b|em|i|u|s|strike|code|mark|sub|sup)>)*)$/i, '$1');
  }
  const template = document.createElement('template');
  template.innerHTML = value;
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }
  const first = textNodes[0];
  const last = textNodes[textNodes.length - 1];
  if (first) first.nodeValue = (first.nodeValue ?? '').replace(/^(?:[ \t\u00a0\u3000]*\n)+/, '');
  if (last) last.nodeValue = (last.nodeValue ?? '').replace(/(?:\n[ \t\u00a0\u3000]*)+$/, '');
  return template.innerHTML;
}

export interface NormalizedStructuredOutlineContent {
  html: string;
  text: string;
  richText: boolean;
}

/**
 * Normalize live contenteditable HTML. Unlike model text, this input always
 * uses DOM markup for line breaks and browser wrappers, even when the result
 * is stored as a plain-text node.
 */
export function normalizeStructuredOutlineEditorHtml(
  value: unknown,
): NormalizedStructuredOutlineContent {
  const sanitized = trimRichHtmlBoundaryLines(sanitizeRichHtml(String(value ?? '')));
  const text = normalizeStructuredOutlineBoundaryText(structuredOutlineHtmlToText(sanitized));
  const hasEmbeddedContent = typeof document !== 'undefined'
    && (() => {
      const template = document.createElement('template');
      template.innerHTML = sanitized;
      return Boolean(template.content.querySelector('img,svg,mjx-container,.ql-formula,[data-formula],iframe,video,audio'));
    })();
  if (!text && !hasEmbeddedContent) return { html: '', text: '', richText: false };
  if (!structuredOutlineIsRichHtml(sanitized)) {
    return { html: escapeHtml(text), text, richText: false };
  }
  return { html: sanitized, text, richText: true };
}

export function normalizeStructuredOutlineContent(
  value: unknown,
  richText: boolean,
): NormalizedStructuredOutlineContent {
  if (!richText) {
    const text = normalizeStructuredOutlineBoundaryText(value);
    return { html: escapeHtml(text), text, richText: false };
  }
  return normalizeStructuredOutlineEditorHtml(value);
}

export function structuredOutlineHtmlToText(value: string): string {
  const source = String(value ?? '');
  if (typeof document === 'undefined') {
    return source
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n')
      .replace(/<\/div\s*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trimEnd();
  }
  const element = document.createElement('div');
  element.innerHTML = sanitizeRichHtml(source);
  const blocks = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'FIELDSET',
    'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5',
    'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION',
    'TABLE', 'UL',
  ]);
  const read = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? '';
    if (!(node instanceof Element)) return '';
    if (node.tagName === 'BR') return '\n';
    let result = Array.from(node.childNodes).map(read).join('');
    if (node !== element && blocks.has(node.tagName) && result && !result.endsWith('\n')) {
      result += '\n';
    }
    return result;
  };
  return read(element)
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .trimEnd();
}

export function structuredOutlineIsRichHtml(value: string): boolean {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  // Only the wrapper elements generated by a plain contenteditable session
  // may be flattened. Any attribute or any other element can carry semantic
  // content supplied by Quill, an import format, or a future renderer and must
  // therefore survive repository migration unchanged.
  if (/<[a-z][^>]*\s(?:class|style|data-[\w-]+|dir|align|href|src)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i.test(normalized)) {
    return true;
  }
  const withoutPlainEditorWrappers = normalized
    .replace(/<\/?(?:p|div)\b[^>]*>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '');
  return /<\/?[a-z][^>]*>/i.test(withoutPlainEditorWrappers);
}

function displayHtml(data: MindMapNodeData): string {
  return normalizeStructuredOutlineContent(data.text, Boolean(data.richText)).html;
}

function summaries(data: MindMapNodeData): MindMapNodeData[] {
  const value = data.generalization;
  if (Array.isArray(value)) {
    return value.filter((item): item is MindMapNodeData => Boolean(item && typeof item === 'object'));
  }
  return value && typeof value === 'object' ? [value as MindMapNodeData] : [];
}

export function flattenStructuredOutline(tree: MindMapTree): StructuredOutlineBlock[] {
  const blocks: StructuredOutlineBlock[] = [];
  const visit = (
    node: MindMapTree,
    depth: number,
    parentUid: string | null,
    hiddenByAncestor: boolean,
    path: string,
  ): void => {
    const uid = String(node.data.uid ?? path);
    const children = Array.isArray(node.children) ? node.children : [];
    const expanded = node.data.expand !== false;
    const html = displayHtml(node.data);
    blocks.push({
      uid,
      depth,
      html,
      text: outlineNodePlainText(node.data),
      kind: 'node',
      parentUid,
      hidden: hiddenByAncestor,
      expanded,
      hasChildren: children.length > 0,
      isRoot: depth === 0,
      pristine: node.data.yemindTextPristine === true && node.data.yemindTextEdited !== true,
      accessories: outlineAccessoriesFromData(node.data),
    });
    const descendantsHidden = hiddenByAncestor || !expanded;
    children.forEach((child, index) =>
      visit(child, depth + 1, uid, descendantsHidden, `${path}.${index}`),
    );
    summaries(node.data).forEach((summary, index) => {
      const summaryUid = String(summary.uid ?? `${uid}.summary.${index}`);
      blocks.push({
        uid: summaryUid,
        depth: depth + 1,
        html: displayHtml(summary),
        text: outlineNodePlainText(summary),
        kind: 'summary',
        parentUid: uid,
        hidden: descendantsHidden,
        expanded: true,
        hasChildren: false,
        isRoot: false,
        pristine: summary.yemindTextPristine === true && summary.yemindTextEdited !== true,
        accessories: outlineAccessoriesFromData(summary),
      });
    });
  };
  visit(tree, 0, null, false, 'root');
  return blocks;
}

function indexExistingData(tree: MindMapTree): {
  nodes: Map<string, MindMapNodeData>;
  summaries: Map<string, MindMapNodeData>;
} {
  const nodes = new Map<string, MindMapNodeData>();
  const summaryData = new Map<string, MindMapNodeData>();
  const visit = (node: MindMapTree, path: string): void => {
    const uid = String(node.data.uid ?? path);
    nodes.set(uid, cloneValue({ ...node.data, uid }));
    summaries(node.data).forEach((summary, index) => {
      const summaryUid = String(summary.uid ?? `${uid}.summary.${index}`);
      summaryData.set(summaryUid, cloneValue({ ...summary, uid: summaryUid }));
    });
    (node.children ?? []).forEach((child, index) => visit(child, `${path}.${index}`));
  };
  visit(tree, 'root');
  return { nodes, summaries: summaryData };
}

function normalizedBlockHtml(block: Pick<StructuredOutlineBlock, 'html' | 'text'>): {
  html: string;
  text: string;
  richText: boolean;
} {
  const sanitized = sanitizeRichHtml(String(block.html ?? ''));
  return normalizeStructuredOutlineEditorHtml(
    sanitized || escapeHtml(String(block.text ?? '')),
  );
}

function updatedData(
  base: MindMapNodeData | undefined,
  block: StructuredOutlineBlock,
): MindMapNodeData {
  const value = normalizedBlockHtml(block);
  const data: MindMapNodeData = cloneValue(base ?? ({ text: '' } as MindMapNodeData));
  data.uid = block.uid;
  data.text = value.richText ? value.html : value.text;
  data.richText = value.richText;
  data.yemindTextPristine = false;
  data.yemindTextEdited = true;
  if (block.kind === 'node') data.expand = block.expanded;
  return data;
}

export function normalizeStructuredOutlineDepths(
  blocks: readonly StructuredOutlineBlock[],
): StructuredOutlineBlock[] {
  let previousDepth = 0;
  return blocks.map((block, index) => {
    let depth = Math.max(0, Math.trunc(block.depth));
    if (index === 0) depth = 0;
    else depth = Math.max(1, Math.min(depth, previousDepth + 1));
    previousDepth = depth;
    return { ...block, depth, isRoot: index === 0, parentUid: index === 0 ? null : block.parentUid };
  });
}

export function buildTreeFromStructuredOutline(
  baseTree: MindMapTree,
  inputBlocks: readonly StructuredOutlineBlock[],
): StructuredOutlineBuildResult {
  const normalBlocks = normalizeStructuredOutlineDepths(
    inputBlocks.filter((block) => block.kind === 'node'),
  );
  if (normalBlocks.length === 0) {
    normalBlocks.push({
      uid: String(baseTree.data.uid ?? 'root'),
      depth: 0,
      html: '',
      text: '',
      kind: 'node',
      parentUid: null,
      hidden: false,
      expanded: true,
      hasChildren: false,
      isRoot: true,
      pristine: false,
      accessories: { icons: [], image: null, todo: null, tags: [], link: '', hasNote: false, commentCount: 0, hasOuterFrame: false },
    });
  }
  const existing = indexExistingData(baseTree);
  let reusedNodeCount = 0;
  let createdNodeCount = 0;
  const treeByUid = new Map<string, MindMapTree>();
  const stack: MindMapTree[] = [];
  let root: MindMapTree | null = null;

  normalBlocks.forEach((block, index) => {
    const normalizedDepth = index === 0 ? 0 : Math.max(1, Math.min(block.depth, stack.length));
    const base = existing.nodes.get(block.uid);
    if (base) reusedNodeCount += 1;
    else createdNodeCount += 1;
    const node: MindMapTree = {
      data: updatedData(base, { ...block, depth: normalizedDepth }),
      children: [],
    };
    treeByUid.set(block.uid, node);
    if (index === 0) {
      root = node;
      stack.length = 0;
      stack.push(node);
      return;
    }
    const parentDepth = Math.max(0, normalizedDepth - 1);
    const parent = stack[parentDepth] ?? root!;
    parent.children.push(node);
    stack[normalizedDepth] = node;
    stack.length = normalizedDepth + 1;
  });

  const groupedSummaries = new Map<string, MindMapNodeData[]>();
  inputBlocks
    .filter((block) => block.kind === 'summary' && block.parentUid)
    .forEach((block) => {
      const base = existing.summaries.get(block.uid);
      const data = updatedData(base, block);
      const list = groupedSummaries.get(block.parentUid!) ?? [];
      list.push(data);
      groupedSummaries.set(block.parentUid!, list);
    });
  groupedSummaries.forEach((value, parentUid) => {
    const parent = treeByUid.get(parentUid);
    if (parent) parent.data.generalization = value.length === 1 ? value[0] : value;
  });

  return {
    tree: root!,
    nodeCount: normalBlocks.length,
    reusedNodeCount,
    createdNodeCount,
  };
}

export function parseStructuredOutlinePaste(value: string): StructuredOutlinePasteBlock[] {
  const parsed = parseOutlineText(value);
  return parsed.lines.map((line) => ({ text: line.text, depth: line.depth }));
}

export function serializeStructuredOutlineBlocks(
  blocks: readonly StructuredOutlineBlock[],
  includeHidden = true,
): string {
  return blocks
    .filter((block) => block.kind === 'node' && (includeHidden || !block.hidden))
    .map((block) => `${OUTLINE_TEXT_INDENT.repeat(block.depth)}${block.text}`)
    .join('\n');
}

export function createStructuredOutlineUid(): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return `ym-${random}`;
  return `ym-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
