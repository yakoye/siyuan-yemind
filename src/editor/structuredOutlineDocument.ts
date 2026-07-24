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
  return (element.innerText || element.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .trimEnd();
}

export function structuredOutlineIsRichHtml(value: string): boolean {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  return /<(?:strong|b|em|i|u|s|strike|code|pre|a|span|mark|sub|sup|img|svg|mjx-container|ql-formula)\b/i.test(normalized);
}

function displayHtml(data: MindMapNodeData): string {
  const value = String(data.text ?? '');
  return data.richText ? sanitizeRichHtml(value) : escapeHtml(value);
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
  const text = structuredOutlineHtmlToText(sanitized || escapeHtml(String(block.text ?? '')));
  const richText = structuredOutlineIsRichHtml(sanitized);
  return {
    html: richText ? sanitized : escapeHtml(text),
    text,
    richText,
  };
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
      accessories: { icons: [], image: null },
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
