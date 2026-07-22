import type { MindMapNodeData, MindMapTree } from '../model/types';

export const OUTLINE_TEXT_INDENT = '    ';
const TAB_WIDTH = 4;

export interface OutlineTextLine {
  text: string;
  depth: number;
  rawIndent: string;
  sourceLine: number;
}

export interface ParsedOutlineText {
  lines: OutlineTextLine[];
  indentWidth: number;
  topLevelCount: number;
  implicitRoot: boolean;
}

interface ExistingOutlineLine {
  uid: string;
  depth: number;
  path: string;
  text: string;
  data: MindMapNodeData;
}

export interface ReconciledOutlineText {
  tree: MindMapTree;
  nodeCount: number;
  reusedNodeCount: number;
  createdNodeCount: number;
  topLevelCount: number;
  implicitRoot: boolean;
  indentWidth: number;
}

export interface OutlineTextSelectionEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

function cloneData<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to the JSON-compatible map-data clone below.
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function htmlToPlainText(value: string): string {
  if (typeof document !== 'undefined') {
    const element = document.createElement('div');
    element.innerHTML = value;
    return element.textContent ?? '';
  }
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '');
}

export function outlineNodePlainText(data: MindMapNodeData): string {
  const source = String(data.text ?? '');
  const value = data.richText ? htmlToPlainText(source) : source;
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]*\n[\t ]*/g, ' ')
    .trim();
}

function flattenTree(tree: MindMapTree): ExistingOutlineLine[] {
  const lines: ExistingOutlineLine[] = [];
  const visit = (node: MindMapTree, depth: number, path: string): void => {
    const uid = String(node.data.uid ?? path);
    lines.push({
      uid,
      depth,
      path,
      text: outlineNodePlainText(node.data),
      data: cloneData({ ...node.data, uid }),
    });
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach((child, index) => visit(child, depth + 1, `${path}.${index}`));
  };
  visit(tree, 0, 'root');
  return lines;
}

export function serializeOutlineText(tree: MindMapTree, indent = OUTLINE_TEXT_INDENT): string {
  return flattenTree(tree)
    .map((line) => `${indent.repeat(line.depth)}${line.text}`)
    .join('\n');
}

function indentColumns(value: string): number {
  let columns = 0;
  for (const char of value) {
    if (char === '\t') columns += TAB_WIDTH;
    else if (char === ' ' || char === '\u00a0') columns += 1;
    else break;
  }
  return columns;
}

function greatestCommonDivisor(a: number, b: number): number {
  let left = Math.abs(Math.trunc(a));
  let right = Math.abs(Math.trunc(b));
  while (right) [left, right] = [right, left % right];
  return left;
}

function inferIndentWidth(values: number[]): number {
  const positive = [...new Set(values.filter((value) => value > 0))].sort((a, b) => a - b);
  if (positive.length === 0) return OUTLINE_TEXT_INDENT.length;
  const exactCandidate = [4, 2, 3, 8].find((candidate) => positive.every((value) => value % candidate === 0));
  if (exactCandidate) return exactCandidate;
  const gcd = positive.reduce((result, value) => greatestCommonDivisor(result, value));
  if (gcd > 1) return gcd;
  return Math.max(1, positive[0]);
}

export function unescapeImportedOutlineText(value: string): string {
  return value.replace(/\\([:;])/g, '$1');
}

export function parseOutlineText(value: string): ParsedOutlineText {
  const source = String(value ?? '').replace(/\r\n?/g, '\n');
  const rawLines = source.split('\n');
  while (rawLines.length > 0 && rawLines[0].trim() === '') rawLines.shift();
  while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') rawLines.pop();
  if (rawLines.length === 0) {
    return { lines: [], indentWidth: OUTLINE_TEXT_INDENT.length, topLevelCount: 0, implicitRoot: false };
  }

  const measured = rawLines.map((raw, index) => {
    const match = raw.match(/^[\t \u00a0]*/)?.[0] ?? '';
    return {
      raw,
      sourceLine: index + 1,
      rawIndent: match,
      columns: indentColumns(match),
      text: unescapeImportedOutlineText(raw.slice(match.length)),
    };
  });
  const nonBlank = measured.filter((line) => line.text.trim().length > 0);
  const baseIndent = nonBlank.length > 0 ? Math.min(...nonBlank.map((line) => line.columns)) : 0;
  const normalizedIndents = nonBlank.map((line) => Math.max(0, line.columns - baseIndent));
  const indentWidth = inferIndentWidth(normalizedIndents);

  const lines: OutlineTextLine[] = [];
  let previousDepth = 0;
  measured.forEach((line) => {
    const relative = Math.max(0, line.columns - baseIndent);
    let depth = line.text.trim().length === 0 && line.rawIndent.length === 0
      ? previousDepth
      : Math.max(0, Math.round(relative / indentWidth));
    depth = Math.min(depth, previousDepth + 1);
    lines.push({
      text: line.text,
      depth,
      rawIndent: line.rawIndent,
      sourceLine: line.sourceLine,
    });
    previousDepth = depth;
  });

  const topLevelCount = lines.filter((line) => line.depth === 0).length;
  return {
    lines,
    indentWidth,
    topLevelCount,
    implicitRoot: topLevelCount > 1,
  };
}

function lineKey(line: { text: string; depth: number }): string {
  return `${line.depth}\u0000${line.text}`;
}

function outlinePaths(lines: readonly { depth: number }[]): string[] {
  if (lines.length === 0) return [];
  const paths = ['root'];
  const pathAtDepth = ['root'];
  const nextChildIndex = [0];
  lines.slice(1).forEach((line) => {
    const depth = Math.max(1, Math.min(Math.trunc(line.depth), pathAtDepth.length));
    const parentPath = pathAtDepth[depth - 1] ?? 'root';
    const childIndex = nextChildIndex[depth - 1] ?? 0;
    nextChildIndex[depth - 1] = childIndex + 1;
    const path = `${parentPath}.${childIndex}`;
    paths.push(path);
    pathAtDepth[depth] = path;
    pathAtDepth.length = depth + 1;
    nextChildIndex[depth] = 0;
    nextChildIndex.length = depth + 1;
  });
  return paths;
}

function bigrams(value: string): string[] {
  const normalized = value.trim().toLocaleLowerCase();
  if (normalized.length < 2) return normalized ? [normalized] : [];
  const result: string[] = [];
  for (let index = 0; index < normalized.length - 1; index += 1) {
    result.push(normalized.slice(index, index + 2));
  }
  return result;
}

export function outlineTextSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;
  const leftParts = bigrams(left);
  const rightParts = bigrams(right);
  if (leftParts.length === 0 || rightParts.length === 0) return 0;
  const rightCounts = new Map<string, number>();
  rightParts.forEach((part) => rightCounts.set(part, (rightCounts.get(part) ?? 0) + 1));
  let overlap = 0;
  leftParts.forEach((part) => {
    const count = rightCounts.get(part) ?? 0;
    if (count <= 0) return;
    overlap += 1;
    rightCounts.set(part, count - 1);
  });
  return (2 * overlap) / (leftParts.length + rightParts.length);
}

function updateMatchedData(existing: ExistingOutlineLine, text: string): MindMapNodeData {
  const data = cloneData(existing.data);
  data.uid = existing.uid;
  if (existing.text !== text) {
    data.text = text;
    data.richText = false;
    data.yemindTextPristine = false;
    data.yemindTextEdited = true;
  }
  if (data.expand === undefined) data.expand = true;
  return data;
}

function newNodeData(text: string, uid: string): MindMapNodeData {
  return {
    uid,
    text,
    richText: false,
    expand: true,
    yemindTextPristine: false,
    yemindTextEdited: true,
  };
}

function defaultUidFactory(): string {
  return globalThis.crypto?.randomUUID?.() ?? `outline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function reconcileOutlineText(
  currentTree: MindMapTree,
  parsed: ParsedOutlineText,
  uidFactory: () => string = defaultUidFactory,
): ReconciledOutlineText {
  const existing = flattenTree(currentTree);
  const existingRoot = existing[0];
  const incoming = parsed.lines;

  if (incoming.length === 0) {
    const rootData = updateMatchedData(existingRoot, '');
    return {
      tree: { data: rootData, children: [] },
      nodeCount: 1,
      reusedNodeCount: 1,
      createdNodeCount: 0,
      topLevelCount: 0,
      implicitRoot: false,
      indentWidth: parsed.indentWidth,
    };
  }

  const desired = parsed.implicitRoot
    ? [
        { text: existingRoot.text, depth: 0, sourceLine: 0, rawIndent: '' },
        ...incoming.map((line) => ({ ...line, depth: line.depth + 1 })),
      ]
    : incoming.map((line, index) => ({ ...line, depth: index === 0 ? 0 : Math.max(1, line.depth) }));

  const matched = new Map<number, ExistingOutlineLine>();
  const used = new Set<string>();
  matched.set(0, existingRoot);
  used.add(existingRoot.uid);

  const byExact = new Map<string, ExistingOutlineLine[]>();
  const byText = new Map<string, ExistingOutlineLine[]>();
  const byPath = new Map<string, ExistingOutlineLine>();
  existing.slice(1).forEach((line) => {
    const exact = lineKey(line);
    byExact.set(exact, [...(byExact.get(exact) ?? []), line]);
    byText.set(line.text, [...(byText.get(line.text) ?? []), line]);
    byPath.set(line.path, line);
  });

  const take = (list: ExistingOutlineLine[] | undefined): ExistingOutlineLine | null => {
    const value = list?.find((candidate) => !used.has(candidate.uid)) ?? null;
    if (value) used.add(value.uid);
    return value;
  };

  desired.slice(1).forEach((line, offset) => {
    const index = offset + 1;
    const exact = take(byExact.get(lineKey(line)));
    if (exact) matched.set(index, exact);
  });
  desired.slice(1).forEach((line, offset) => {
    const index = offset + 1;
    if (matched.has(index)) return;
    const sameText = take(byText.get(line.text));
    if (sameText) matched.set(index, sameText);
  });
  const desiredPaths = outlinePaths(desired);
  desired.slice(1).forEach((_line, offset) => {
    const index = offset + 1;
    if (matched.has(index)) return;
    const samePath = byPath.get(desiredPaths[index]);
    if (!samePath || used.has(samePath.uid)) return;
    used.add(samePath.uid);
    matched.set(index, samePath);
  });
  desired.slice(1).forEach((line, offset) => {
    const index = offset + 1;
    if (matched.has(index)) return;
    const positional = existing[index];
    if (!positional || used.has(positional.uid)) return;
    if (outlineTextSimilarity(positional.text, line.text) < 0.45) return;
    used.add(positional.uid);
    matched.set(index, positional);
  });

  const rootMatch = matched.get(0) ?? existingRoot;
  const rootText = parsed.implicitRoot ? existingRoot.text : desired[0].text;
  const root: MindMapTree = {
    data: updateMatchedData(rootMatch, rootText),
    children: [],
  };
  const stack: MindMapTree[] = [root];
  let reusedNodeCount = 1;
  let createdNodeCount = 0;

  desired.slice(1).forEach((line, offset) => {
    const index = offset + 1;
    const depth = Math.max(1, Math.min(line.depth, stack.length));
    const existingLine = matched.get(index);
    const data = existingLine
      ? updateMatchedData(existingLine, line.text)
      : newNodeData(line.text, uidFactory());
    if (existingLine) reusedNodeCount += 1;
    else createdNodeCount += 1;
    const node: MindMapTree = { data, children: [] };
    const parent = stack[depth - 1] ?? root;
    parent.children.push(node);
    stack[depth] = node;
    stack.length = depth + 1;
  });

  return {
    tree: root,
    nodeCount: desired.length,
    reusedNodeCount,
    createdNodeCount,
    topLevelCount: parsed.topLevelCount,
    implicitRoot: parsed.implicitRoot,
    indentWidth: parsed.indentWidth,
  };
}

function selectedLineRange(value: string, selectionStart: number, selectionEnd: number): {
  start: number;
  end: number;
} {
  const start = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
  let end = value.indexOf('\n', selectionEnd);
  if (end < 0) end = value.length;
  return { start, end };
}

export function editOutlineSelectionIndent(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  outdent: boolean,
  indent = OUTLINE_TEXT_INDENT,
): OutlineTextSelectionEdit {
  const range = selectedLineRange(value, selectionStart, selectionEnd);
  const selected = value.slice(range.start, range.end);
  const lines = selected.split('\n');
  let startAdjustment = 0;
  let endAdjustment = 0;
  const nextLines = lines.map((line, index) => {
    if (!outdent) {
      if (index === 0) startAdjustment = indent.length;
      endAdjustment += indent.length;
      return indent + line;
    }
    const removable = line.startsWith('\t') ? 1 : Math.min(indent.length, line.match(/^ */)?.[0].length ?? 0);
    if (index === 0) startAdjustment = -Math.min(removable, Math.max(0, selectionStart - range.start));
    endAdjustment -= removable;
    return line.slice(removable);
  });
  const replacement = nextLines.join('\n');
  return {
    value: value.slice(0, range.start) + replacement + value.slice(range.end),
    selectionStart: Math.max(range.start, selectionStart + startAdjustment),
    selectionEnd: Math.max(range.start, selectionEnd + endAdjustment),
  };
}

export function insertOutlineNewline(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): OutlineTextSelectionEdit {
  const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
  const indent = value.slice(lineStart, selectionStart).match(/^[\t ]*/)?.[0] ?? '';
  const insertion = `\n${indent}`;
  return {
    value: value.slice(0, selectionStart) + insertion + value.slice(selectionEnd),
    selectionStart: selectionStart + insertion.length,
    selectionEnd: selectionStart + insertion.length,
  };
}
