import { sanitizeRichHtml } from '../content/sanitizeRichHtml';
import type { MindMapTree } from '../model/types';
import { structuredOutlineHtmlToText } from './structuredOutlineDocument';

export const YEMIND_NODE_CLIPBOARD_MIME = 'application/x-yemind-nodes+json';

export type NodeClipboardSurface = 'canvas' | 'outline';

export interface NodeClipboardPayload {
  version: 1;
  sourceDocumentId: string;
  sourceSurface: NodeClipboardSurface;
  createdAt: number;
  nodes: MindMapTree[];
}

export interface CreateNodeClipboardPayloadOptions {
  sourceDocumentId: string;
  sourceSurface: NodeClipboardSurface;
  nodes: readonly MindMapTree[];
}

export interface NodeClipboardOutlineLine {
  depth: number;
  text: string;
  html: string;
}

export interface NodeClipboardOutline {
  text: string;
  lines: NodeClipboardOutlineLine[];
}

interface ClipboardTransfer {
  getData(type: string): string;
  setData?(type: string, value: string): void;
}

const PRESENTATION_DATA_KEYS = new Set([
  'backgroundColor',
  'borderColor',
  'borderDasharray',
  'borderRadius',
  'borderWidth',
  'color',
  'customTextWidth',
  'fillColor',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'gradientStyle',
  'height',
  'lineColor',
  'lineDasharray',
  'lineFlow',
  'lineStyle',
  'lineWidth',
  'opacity',
  'shadow',
  'shape',
  'textAlign',
  'textDecoration',
  'width',
  'yemindImportedAutoWidth',
]);

const PRESENTATION_STYLE_PROPERTIES = [
  'background',
  'background-color',
  'border',
  'border-color',
  'border-radius',
  'border-style',
  'border-width',
  'box-shadow',
  'color',
  'font-family',
  'font-size',
  'letter-spacing',
  'line-height',
  'opacity',
  'text-shadow',
  'text-align',
];

let sharedPayload: NodeClipboardPayload | null = null;

function semanticClasses(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .filter((name) => !/^ql-(?:align|background|color|font|size)-/.test(name))
    .join(' ');
}

function comparableClipboardText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\t \u00a0]+$/gm, '')
    .replace(/\n+$/, '');
}

function cloneTree(tree: MindMapTree, removeIdentity = false): MindMapTree {
  const data = structuredClone(tree.data) as Record<string, unknown>;
  if (removeIdentity) {
    delete data.uid;
    delete data.isActive;
    delete data.inserting;
  }
  return {
    data: data as MindMapTree['data'],
    children: (tree.children ?? []).map((child) => cloneTree(child, removeIdentity)),
  };
}

function isSurface(value: unknown): value is NodeClipboardSurface {
  return value === 'canvas' || value === 'outline';
}

function validTree(value: unknown): value is MindMapTree {
  if (!value || typeof value !== 'object') return false;
  const tree = value as Partial<MindMapTree>;
  return Boolean(tree.data && typeof tree.data === 'object' && Array.isArray(tree.children));
}

function parsePayload(value: unknown): NodeClipboardPayload | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Partial<NodeClipboardPayload>;
  if (
    payload.version !== 1
    || typeof payload.sourceDocumentId !== 'string'
    || !isSurface(payload.sourceSurface)
    || !Array.isArray(payload.nodes)
    || !payload.nodes.every(validTree)
  ) return null;
  return {
    version: 1,
    sourceDocumentId: payload.sourceDocumentId,
    sourceSurface: payload.sourceSurface,
    createdAt: Number.isFinite(payload.createdAt) ? Number(payload.createdAt) : Date.now(),
    nodes: payload.nodes.map((tree) => cloneTree(tree)),
  };
}

function semanticHtmlWithoutPresentation(value: unknown): string {
  const source = sanitizeRichHtml(String(value ?? ''));
  if (!source || typeof document === 'undefined') {
    return source
      .replace(/\s+style=(?:"[^"]*"|'[^']*')/gi, '')
      .replace(/\s+class=(["'])(.*?)\1/gi, (_match, quote: string, classes: string) => {
        const kept = semanticClasses(classes);
        return kept ? ` class=${quote}${kept}${quote}` : '';
      });
  }
  const template = document.createElement('template');
  template.innerHTML = source;
  template.content.querySelectorAll<HTMLElement>('*').forEach((element) => {
    PRESENTATION_STYLE_PROPERTIES.forEach((property) => element.style.removeProperty(property));
    if (!element.getAttribute('style')?.trim()) element.removeAttribute('style');
    const classes = semanticClasses(element.className);
    if (classes) element.className = classes;
    else element.removeAttribute('class');
  });
  return template.innerHTML;
}

function stripTreePresentation(tree: MindMapTree): MindMapTree {
  const data = structuredClone(tree.data) as Record<string, unknown>;
  PRESENTATION_DATA_KEYS.forEach((key) => delete data[key]);
  if (data.richText === true) data.text = semanticHtmlWithoutPresentation(data.text);
  return {
    data: data as MindMapTree['data'],
    children: (tree.children ?? []).map(stripTreePresentation),
  };
}

function plainNodeText(tree: MindMapTree): string {
  const source = String(tree.data?.text ?? '');
  return tree.data?.richText === true
    ? structuredOutlineHtmlToText(source)
    : source;
}

function flattenTree(tree: MindMapTree, depth: number, lines: NodeClipboardOutlineLine[]): void {
  const text = plainNodeText(tree);
  const html = tree.data?.richText === true
    ? sanitizeRichHtml(String(tree.data.text ?? ''))
    : text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('\n', '<br>');
  lines.push({ depth, text, html });
  (tree.children ?? []).forEach((child) => flattenTree(child, depth + 1, lines));
}

export function createNodeClipboardPayload(
  options: CreateNodeClipboardPayloadOptions,
): NodeClipboardPayload {
  return {
    version: 1,
    sourceDocumentId: String(options.sourceDocumentId ?? ''),
    sourceSurface: options.sourceSurface,
    createdAt: Date.now(),
    nodes: options.nodes.map((tree) => cloneTree(tree, true)),
  };
}

export function prepareNodeClipboardForDestination(
  payload: NodeClipboardPayload,
  destinationDocumentId: string,
  _destinationSurface: NodeClipboardSurface,
): NodeClipboardPayload {
  const sameDocument = payload.sourceDocumentId === String(destinationDocumentId ?? '');
  return {
    ...payload,
    nodes: payload.nodes.map((tree) => sameDocument ? cloneTree(tree) : stripTreePresentation(tree)),
  };
}

export function nodeClipboardToOutline(payload: NodeClipboardPayload): NodeClipboardOutline {
  const lines: NodeClipboardOutlineLine[] = [];
  payload.nodes.forEach((tree) => flattenTree(tree, 0, lines));
  return {
    text: lines.map((line) => `${'    '.repeat(line.depth)}${line.text}`).join('\n'),
    lines,
  };
}

export function publishNodeClipboard(
  payload: NodeClipboardPayload,
  transfer?: Pick<ClipboardTransfer, 'setData'> | null,
): void {
  sharedPayload = parsePayload(payload);
  transfer?.setData?.(YEMIND_NODE_CLIPBOARD_MIME, JSON.stringify(payload));
}

export function readNodeClipboard(
  transfer?: Pick<ClipboardTransfer, 'getData'> | null,
  allowSharedFallback = true,
): NodeClipboardPayload | null {
  const serialized = transfer?.getData?.(YEMIND_NODE_CLIPBOARD_MIME) ?? '';
  if (serialized) {
    try {
      const parsed = parsePayload(JSON.parse(serialized));
      if (parsed) {
        sharedPayload = parsed;
        return parsed;
      }
    } catch {
      // Ignore malformed or foreign custom clipboard data.
    }
  }
  if (!allowSharedFallback || !sharedPayload) return null;
  const parsed = parsePayload(sharedPayload);
  if (!parsed) return null;
  if (transfer) {
    const plain = transfer.getData('text/plain');
    if (
      !plain
      || comparableClipboardText(plain) !== comparableClipboardText(nodeClipboardToOutline(parsed).text)
    ) return null;
  }
  return parsed;
}

export function clearNodeClipboard(): void {
  sharedPayload = null;
}

export function bindCanvasNodeClipboard(
  renderer: any,
  getDocumentId: () => string,
): () => void {
  if (!renderer || renderer.__yemindNodeClipboardBound === true) return () => undefined;
  const originalCopy = typeof renderer.copy === 'function' ? renderer.copy.bind(renderer) : null;
  const originalCut = typeof renderer.cut === 'function' ? renderer.cut.bind(renderer) : null;
  const originalPaste = typeof renderer.paste === 'function' ? renderer.paste.bind(renderer) : null;
  renderer.__yemindNodeClipboardBound = true;

  const publishCurrent = (): void => {
    const nodes = Array.isArray(renderer.beingCopyData) ? renderer.beingCopyData : [];
    if (nodes.length === 0) return;
    const payload = createNodeClipboardPayload({
      sourceDocumentId: getDocumentId(),
      sourceSurface: 'canvas',
      nodes,
    });
    publishNodeClipboard(payload);
    const plain = nodeClipboardToOutline(payload).text;
    const write = typeof navigator !== 'undefined' ? navigator.clipboard?.writeText?.(plain) : null;
    if (write && typeof (write as Promise<void>).catch === 'function') {
      void (write as Promise<void>).catch(() => undefined);
    }
  };

  if (originalCopy) {
    renderer.copy = (...args: unknown[]) => {
      const result = originalCopy(...args);
      publishCurrent();
      return result;
    };
  }
  if (originalCut) {
    renderer.cut = (...args: unknown[]) => {
      const result = originalCut(...args);
      publishCurrent();
      return result;
    };
  }
  if (originalPaste) {
    renderer.paste = async (...args: unknown[]) => {
      const payload = readNodeClipboard();
      if (payload?.nodes.length) {
        const prepared = prepareNodeClipboardForDestination(payload, getDocumentId(), 'canvas');
        renderer.beingCopyData = prepared.nodes;
      }
      return originalPaste(...args);
    };
  }

  return () => {
    if (originalCopy) renderer.copy = originalCopy;
    if (originalCut) renderer.cut = originalCut;
    if (originalPaste) renderer.paste = originalPaste;
    delete renderer.__yemindNodeClipboardBound;
  };
}
