import type { MindMapTree } from '../model/types';
import { pristineNodeData } from './textEditingPolicy';
import { createStructuredOutlineUid } from './structuredOutlineDocument';

export type OutlineTreeImportMode =
  | 'auto'
  | 'unicode-tree'
  | 'windows-tree'
  | 'indent'
  | 'markdown'
  | 'numbered'
  | 'plain';

export type OutlineTreeImportInsertMode = 'append-under-current' | 'replace-current';

export interface OutlineTreeImportLine {
  depth: number;
  text: string;
  sourceLine: number;
}

export interface OutlineTreeImportResult {
  requestedMode: OutlineTreeImportMode;
  detectedMode: Exclude<OutlineTreeImportMode, 'auto'>;
  lines: OutlineTreeImportLine[];
  warnings: string[];
  errors: string[];
  nodeCount: number;
  maxDepth: number;
  ignoredBlankLines: number;
  continuationLines: number;
}

export const OUTLINE_TREE_IMPORT_PLACEHOLDERS: Record<OutlineTreeImportMode, string> = {
  auto: '粘贴树形文本、Windows Tree、空格/Tab 缩进、Markdown 列表或编号大纲，系统将自动识别。',
  'unicode-tree': '根节点\n├─ 节点A\n│  └─ 节点A1\n└─ 节点B',
  'windows-tree': '\\---root\n    +---src\n    |   \\---core\n    \\---tests',
  indent: '根节点\n    节点A\n        节点A1\n    节点B',
  markdown: '- 根节点\n  - 节点A\n    - 节点A1\n  - 节点B',
  numbered: '1. 根节点\n1.1 节点A\n1.1.1 节点A1\n2. 节点B',
  plain: '节点A\n节点B\n节点C',
};

function cloneTree<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(value); } catch { /* JSON fallback */ }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function stripCodeFence(value: string): string {
  const normalized = String(value ?? '').replace(/\r\n?/g, '\n');
  const match = normalized.match(/^\s*```[^\n]*\n([\s\S]*?)\n```\s*$/);
  return (match?.[1] ?? normalized).replace(/^\n+|\n+$/g, '');
}

function lineIndentWidth(prefix: string): number {
  let width = 0;
  for (const char of prefix) width += char === '\t' ? 4 : char === '\u3000' ? 2 : 1;
  return width;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

function normalizeDepths(lines: OutlineTreeImportLine[], warnings: string[]): OutlineTreeImportLine[] {
  if (!lines.length) return lines;
  const minimum = Math.min(...lines.map((line) => line.depth));
  let previous = 0;
  return lines.map((line, index) => {
    let depth = Math.max(0, line.depth - minimum);
    if (index === 0) depth = 0;
    if (depth > previous + 1) {
      warnings.push(`第 ${line.sourceLine} 行层级跳跃，已从 ${depth} 调整为 ${previous + 1}。`);
      depth = previous + 1;
    }
    previous = depth;
    return { ...line, depth };
  });
}

function detectMode(lines: string[]): Exclude<OutlineTreeImportMode, 'auto'> {
  const nonBlank = lines.filter((line) => line.trim());
  if (nonBlank.some((line) => /^[\s│┃]*[├└┝┗][─━-]+\s*/u.test(line))) return 'unicode-tree';
  if (nonBlank.some((line) => /^(?:(?:\|\s{0,3}|\s{4}))*[+\\]---\s*/.test(line))) return 'windows-tree';
  const hierarchicalNumbers = nonBlank.filter((line) => /^\s*\d+(?:\.\d+)+[.)]?\s+/.test(line)).length;
  if (hierarchicalNumbers > 0) return 'numbered';
  const markdownLines = nonBlank.filter((line) => /^\s*(?:[-+*]|\[[ xX]\]|\d+[.)])\s+/.test(line)).length;
  if (markdownLines >= Math.max(1, Math.ceil(nonBlank.length * 0.6))) return 'markdown';
  const indents = nonBlank.map((line) => line.match(/^[\t \u3000]*/)?.[0] ?? '').map(lineIndentWidth);
  if (indents.some((indent) => indent > 0)) return 'indent';
  return 'plain';
}

function parseUnicode(rawLines: string[], warnings: string[]): { lines: OutlineTreeImportLine[]; ignored: number; continuations: number } {
  const result: OutlineTreeImportLine[] = [];
  let ignored = 0;
  let continuations = 0;
  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index];
    if (!raw.trim()) { ignored += 1; continue; }
    if (/^[\s│┃┆┊]+$/u.test(raw)) { ignored += 1; continue; }
    const branch = raw.match(/^((?:(?:│|┃|┆|┊)[ \t]{0,4}|[ \t]{2,4})*)(?:├|└|┝|┗)[─━-]+[ \t]*(.*)$/u);
    if (branch) {
      const prefix = branch[1] ?? '';
      const segments = prefix.match(/(?:│|┃|┆|┊)[ \t]{0,4}|[ \t]{2,4}/gu) ?? [];
      result.push({ depth: segments.length + 1, text: (branch[2] ?? '').trimEnd(), sourceLine: index + 1 });
      continue;
    }
    const continuation = raw.match(/^((?:(?:│|┃|┆|┊)[ \t]{0,4}|[ \t]{2,4})+)(\S.*)$/u);
    if (continuation && result.length) {
      result[result.length - 1].text += `\n${continuation[2].trimEnd()}`;
      continuations += 1;
      continue;
    }
    const text = raw.trimEnd().replace(/^\s+/, '');
    if (!result.length) result.push({ depth: 0, text, sourceLine: index + 1 });
    else if (!raw.match(/^[ \t]/) && !result.some((line) => line.depth > 0)) {
      result[0].text += `\n${text}`;
      continuations += 1;
    } else if (!result.some((line) => line.depth > 0)) {
      result[0].text += `\n${text}`;
      continuations += 1;
    } else {
      result[result.length - 1].text += `\n${text}`;
      continuations += 1;
    }
  }
  if (!result.length) warnings.push('未识别到 Unicode 树形节点。');
  return { lines: result, ignored, continuations };
}

function parseWindows(rawLines: string[], warnings: string[]): { lines: OutlineTreeImportLine[]; ignored: number; continuations: number } {
  const result: OutlineTreeImportLine[] = [];
  let ignored = 0;
  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index];
    if (!raw.trim()) { ignored += 1; continue; }
    const match = raw.match(/^((?:(?:\|\s{0,3})|(?:\s{4}))*)([+\\]---)\s*(.*)$/);
    if (!match) {
      if (result.length && raw.trim()) result[result.length - 1].text += `\n${raw.trim()}`;
      else ignored += 1;
      continue;
    }
    const prefix = match[1] ?? '';
    const segments = prefix.match(/\|\s{0,3}|\s{4}/g) ?? [];
    result.push({ depth: segments.length, text: (match[3] ?? '').trimEnd(), sourceLine: index + 1 });
  }
  if (!result.length) warnings.push('未识别到 Windows Tree 节点。');
  return { lines: result, ignored, continuations: 0 };
}

function inferIndentUnit(widths: number[]): number {
  const positive = [...new Set(widths.filter((width) => width > 0))].sort((a, b) => a - b);
  if (!positive.length) return 4;
  return positive.reduce((value, width) => gcd(value, width), positive[0]) || positive[0] || 4;
}

function parseIndent(rawLines: string[]): { lines: OutlineTreeImportLine[]; ignored: number; continuations: number } {
  const entries = rawLines.map((raw, index) => ({ raw, index, prefix: raw.match(/^[\t \u3000]*/)?.[0] ?? '' }))
    .filter((entry) => entry.raw.trim());
  const unit = inferIndentUnit(entries.map((entry) => lineIndentWidth(entry.prefix)));
  return {
    lines: entries.map((entry) => ({
      depth: Math.round(lineIndentWidth(entry.prefix) / unit),
      text: entry.raw.slice(entry.prefix.length).trimEnd(),
      sourceLine: entry.index + 1,
    })),
    ignored: rawLines.length - entries.length,
    continuations: 0,
  };
}

function parseMarkdown(rawLines: string[], warnings: string[]): { lines: OutlineTreeImportLine[]; ignored: number; continuations: number } {
  const entries: Array<{ indent: number; text: string; sourceLine: number }> = [];
  let ignored = 0;
  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index];
    if (!raw.trim()) { ignored += 1; continue; }
    const match = raw.match(/^([\t \u3000]*)(?:[-+*]|\[[ xX]\]|\d+[.)])\s+(.*)$/);
    if (!match) {
      if (entries.length) entries[entries.length - 1].text += `\n${raw.trim()}`;
      else warnings.push(`第 ${index + 1} 行不是 Markdown 列表项，已忽略。`);
      continue;
    }
    entries.push({ indent: lineIndentWidth(match[1] ?? ''), text: (match[2] ?? '').trimEnd(), sourceLine: index + 1 });
  }
  const unit = inferIndentUnit(entries.map((entry) => entry.indent));
  return { lines: entries.map((entry) => ({ depth: Math.round(entry.indent / unit), text: entry.text, sourceLine: entry.sourceLine })), ignored, continuations: 0 };
}

function parseNumbered(rawLines: string[], warnings: string[]): { lines: OutlineTreeImportLine[]; ignored: number; continuations: number } {
  const result: OutlineTreeImportLine[] = [];
  let ignored = 0;
  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index];
    if (!raw.trim()) { ignored += 1; continue; }
    const match = raw.match(/^\s*(\d+(?:\.\d+)*)(?:[.)、])?\s+(.*)$/);
    if (!match) {
      if (result.length) result[result.length - 1].text += `\n${raw.trim()}`;
      else warnings.push(`第 ${index + 1} 行不是编号大纲，已忽略。`);
      continue;
    }
    const sequence = match[1];
    result.push({ depth: sequence.split('.').length - 1, text: (match[2] ?? '').trimEnd(), sourceLine: index + 1 });
  }
  return { lines: result, ignored, continuations: 0 };
}

function parsePlain(rawLines: string[]): { lines: OutlineTreeImportLine[]; ignored: number; continuations: number } {
  const lines = rawLines
    .map((raw, index) => ({ raw, index }))
    .filter(({ raw }) => raw.trim())
    .map(({ raw, index }) => ({ depth: 0, text: raw.trim(), sourceLine: index + 1 }));
  return { lines, ignored: rawLines.length - lines.length, continuations: 0 };
}

export function parseOutlineTreeText(value: string, mode: OutlineTreeImportMode = 'auto'): OutlineTreeImportResult {
  const source = stripCodeFence(value);
  const rawLines = source.split('\n');
  const detectedMode = mode === 'auto' ? detectMode(rawLines) : mode;
  const warnings: string[] = [];
  const errors: string[] = [];
  const parsed = detectedMode === 'unicode-tree' ? parseUnicode(rawLines, warnings)
    : detectedMode === 'windows-tree' ? parseWindows(rawLines, warnings)
      : detectedMode === 'indent' ? parseIndent(rawLines)
        : detectedMode === 'markdown' ? parseMarkdown(rawLines, warnings)
          : detectedMode === 'numbered' ? parseNumbered(rawLines, warnings)
            : parsePlain(rawLines);
  const lines = normalizeDepths(parsed.lines.filter((line) => line.text.trim()), warnings);
  if (lines.length > 5000) errors.push('一次最多转换 5000 个节点。');
  else if (lines.length > 1000) warnings.push(`将导入 ${lines.length} 个节点，可能需要较长时间。`);
  if (!lines.length && source.trim()) errors.push('没有识别到可转换的节点。');
  return {
    requestedMode: mode,
    detectedMode,
    lines: lines.slice(0, 5000),
    warnings,
    errors,
    nodeCount: Math.min(lines.length, 5000),
    maxDepth: lines.reduce((maximum, line) => Math.max(maximum, line.depth), 0),
    ignoredBlankLines: parsed.ignored,
    continuationLines: parsed.continuations,
  };
}

function forestFromLines(lines: readonly OutlineTreeImportLine[]): MindMapTree[] {
  const roots: MindMapTree[] = [];
  const stack: MindMapTree[] = [];
  lines.forEach((line, index) => {
    const node: MindMapTree = {
      data: pristineNodeData({ uid: createStructuredOutlineUid(), text: line.text, expand: true, yemindTextPristine: false, yemindTextEdited: true }),
      children: [],
    };
    const depth = index === 0 ? 0 : Math.max(0, Math.min(line.depth, stack.length));
    if (depth === 0) roots.push(node);
    else (stack[depth - 1] ?? roots[roots.length - 1]).children.push(node);
    stack[depth] = node;
    stack.length = depth + 1;
  });
  return roots;
}

function findNode(tree: MindMapTree, uid: string): MindMapTree | null {
  if (String(tree.data.uid ?? '') === uid) return tree;
  for (const child of tree.children ?? []) {
    const found = findNode(child, uid);
    if (found) return found;
  }
  return null;
}

export function applyOutlineImport(
  baseTree: MindMapTree,
  targetUid: string,
  result: Pick<OutlineTreeImportResult, 'lines' | 'errors'>,
  insertMode: OutlineTreeImportInsertMode = 'append-under-current',
): MindMapTree {
  if (result.errors.length || !result.lines.length) return cloneTree(baseTree);
  const next = cloneTree(baseTree);
  const target = findNode(next, targetUid);
  if (!target) return next;
  const forest = forestFromLines(result.lines);
  if (insertMode === 'replace-current') {
    const first = forest.shift();
    if (!first) return next;
    target.data = { ...target.data, text: first.data.text, richText: false, yemindTextPristine: false, yemindTextEdited: true, expand: true };
    target.children = [...first.children, ...forest, ...(target.children ?? [])];
  } else {
    target.data.expand = true;
    target.children = [...(target.children ?? []), ...forest];
  }
  return next;
}
