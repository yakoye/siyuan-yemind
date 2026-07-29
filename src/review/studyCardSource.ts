import type { NodeComment, NodeTodo } from '../content/nodeContentState';
import { sanitizeRichHtml } from '../content/sanitizeRichHtml';

export interface StudyCardSourceImage {
  src: string;
  title: string;
  kind: 'image' | 'clipart';
  width?: number;
  height?: number;
}

export interface StudyCardSourceSnapshot {
  version: 1;
  capturedAt: number;
  nodeTextHtml: string;
  nodeTextPlain: string;
  icons: string[];
  tags: string[];
  todo: NodeTodo | null;
  hyperlink: string;
  hyperlinkTitle: string;
  image: StudyCardSourceImage | null;
  noteHtml: string;
  comments: NodeComment[];
}

const MAX_ACCESSORIES = 32;
const MAX_COMMENTS = 200;

function finiteTimestamp(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function positiveDimension(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : undefined;
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const text = String(item ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
    if (result.length >= MAX_ACCESSORIES) break;
  }
  return result;
}

function safeResourceUrl(value: unknown): string {
  const source = String(value ?? '').trim();
  const compact = source.replace(/[\u0000-\u001f\u007f\s]+/g, '').toLowerCase();
  if (!compact || compact.startsWith('javascript:') || compact.startsWith('vbscript:')) return '';
  if (compact.startsWith('data:') && !compact.startsWith('data:image/')) return '';
  return source;
}

function normalizeTodo(value: unknown): NodeTodo | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const text = String(source.text ?? '').trim();
  return {
    checked: source.checked === true,
    ...(text ? { text } : {}),
  };
}

function normalizeComments(value: unknown): NodeComment[] {
  if (!Array.isArray(value)) return [];
  const result: NodeComment[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const source = item as Record<string, unknown>;
    const id = String(source.id ?? '').trim();
    const text = String(source.text ?? '').trim();
    if (!id || !text || seen.has(id)) continue;
    seen.add(id);
    const createdAt = finiteTimestamp(source.createdAt);
    const updatedAt = Math.max(createdAt, finiteTimestamp(source.updatedAt));
    result.push({ id, text, createdAt, updatedAt });
    if (result.length >= MAX_COMMENTS) break;
  }
  return result;
}

function normalizeImage(value: unknown): StudyCardSourceImage | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const src = safeResourceUrl(source.src);
  if (!src) return null;
  const width = positiveDimension(source.width);
  const height = positiveDimension(source.height);
  return {
    src,
    title: String(source.title ?? '').trim(),
    kind: source.kind === 'clipart' ? 'clipart' : 'image',
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
}

export function normalizeStudyCardSource(value: unknown): StudyCardSourceSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  return {
    version: 1,
    capturedAt: finiteTimestamp(source.capturedAt),
    nodeTextHtml: sanitizeRichHtml(String(source.nodeTextHtml ?? '')).trim(),
    nodeTextPlain: String(source.nodeTextPlain ?? '').trim(),
    icons: uniqueStrings(source.icons),
    tags: uniqueStrings(source.tags),
    todo: normalizeTodo(source.todo),
    hyperlink: safeResourceUrl(source.hyperlink),
    hyperlinkTitle: String(source.hyperlinkTitle ?? '').trim(),
    image: normalizeImage(source.image),
    noteHtml: sanitizeRichHtml(String(source.noteHtml ?? '')).trim(),
    comments: normalizeComments(source.comments),
  };
}

export function studyCardSourceSearchText(value: StudyCardSourceSnapshot | undefined): string {
  if (!value) return '';
  return [
    value.nodeTextPlain,
    value.tags.join(' '),
    value.todo?.text ?? '',
    value.hyperlinkTitle,
    value.image?.title ?? '',
    value.noteHtml.replace(/<[^>]+>/g, ' '),
    ...value.comments.map((comment) => comment.text),
  ].join('\n').replace(/\s+/g, ' ').trim();
}
