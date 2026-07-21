import type { NodeComment } from '../content/nodeContentState';
import type { NodeNote } from '../content/nodeNoteState';
import { sanitizeRichHtml } from '../content/sanitizeRichHtml';
import { formatCommentTimestamp } from './commentsPresentation';

export type NodeHoverPreviewType = 'note' | 'comments';

interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface HoverPreviewPlacementInput {
  root: RectLike;
  anchor: RectLike;
  preview: { width: number; height: number };
  gap?: number;
  margin?: number;
}

export interface HoverPreviewPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
  placement: string;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function intersects(a: RectLike, b: RectLike): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function candidateRect(left: number, top: number, width: number, height: number): RectLike {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function inside(rect: RectLike, root: RectLike, margin: number): boolean {
  return rect.left >= root.left + margin
    && rect.top >= root.top + margin
    && rect.right <= root.right - margin
    && rect.bottom <= root.bottom - margin;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function computeHoverPreviewPlacement(input: HoverPreviewPlacementInput): HoverPreviewPlacement {
  const gap = Math.max(0, input.gap ?? 8);
  const margin = Math.max(0, input.margin ?? 8);
  const root = input.root;
  const anchor = input.anchor;
  const desiredWidth = Math.max(80, input.preview.width);
  const desiredHeight = Math.max(48, input.preview.height);
  const maxWidth = Math.max(40, root.width - margin * 2);
  const maxHeight = Math.max(40, root.height - margin * 2);
  const width = Math.min(desiredWidth, maxWidth);
  const height = Math.min(desiredHeight, maxHeight);
  const centeredTop = anchor.top + (anchor.height - height) / 2;
  const centeredLeft = anchor.left + (anchor.width - width) / 2;
  const candidates = [
    { placement: 'right-bottom', left: anchor.right + gap, top: anchor.top },
    { placement: 'right-top', left: anchor.right + gap, top: anchor.bottom - height },
    { placement: 'left-bottom', left: anchor.left - gap - width, top: anchor.top },
    { placement: 'left-top', left: anchor.left - gap - width, top: anchor.bottom - height },
    { placement: 'right', left: anchor.right + gap, top: centeredTop },
    { placement: 'left', left: anchor.left - gap - width, top: centeredTop },
    { placement: 'bottom-right', left: anchor.left, top: anchor.bottom + gap },
    { placement: 'bottom-left', left: anchor.right - width, top: anchor.bottom + gap },
    { placement: 'top-right', left: anchor.left, top: anchor.top - gap - height },
    { placement: 'top-left', left: anchor.right - width, top: anchor.top - gap - height },
  ];

  for (const candidate of candidates) {
    const rect = candidateRect(candidate.left, candidate.top, width, height);
    if (inside(rect, root, margin) && !intersects(rect, anchor)) {
      return { ...candidate, width, height };
    }
  }

  const sideCandidates = [
    {
      placement: 'left-adaptive',
      width: Math.max(40, Math.min(width, anchor.left - gap - (root.left + margin))),
      height,
      left: root.left + margin,
      top: centeredTop,
    },
    {
      placement: 'right-adaptive',
      width: Math.max(40, Math.min(width, root.right - margin - (anchor.right + gap))),
      height,
      left: anchor.right + gap,
      top: centeredTop,
    },
    {
      placement: 'top-adaptive',
      width,
      height: Math.max(40, Math.min(height, anchor.top - gap - (root.top + margin))),
      left: centeredLeft,
      top: root.top + margin,
    },
    {
      placement: 'bottom-adaptive',
      width,
      height: Math.max(40, Math.min(height, root.bottom - margin - (anchor.bottom + gap))),
      left: centeredLeft,
      top: anchor.bottom + gap,
    },
  ].map((candidate) => ({
    ...candidate,
    left: clamp(candidate.left, root.left + margin, root.right - margin - candidate.width),
    top: clamp(candidate.top, root.top + margin, root.bottom - margin - candidate.height),
  })).filter((candidate) => candidate.width >= 40 && candidate.height >= 40)
    .sort((a, b) => b.width * b.height - a.width * a.height);

  const adaptive = sideCandidates.find((candidate) => !intersects(candidateRect(candidate.left, candidate.top, candidate.width, candidate.height), anchor));
  if (adaptive) return adaptive;

  const fallbackWidth = Math.min(width, maxWidth);
  const fallbackHeight = Math.min(height, Math.max(40, anchor.top - root.top - gap - margin));
  return {
    placement: 'top-fallback',
    width: fallbackWidth,
    height: fallbackHeight,
    left: clamp(centeredLeft, root.left + margin, root.right - margin - fallbackWidth),
    top: Math.max(root.top + margin, anchor.top - gap - fallbackHeight),
  };
}

export function buildHoverPreviewHtml(type: NodeHoverPreviewType, value: NodeNote | NodeComment[] | null | undefined): string {
  if (type === 'note') {
    const note = value as NodeNote | null | undefined;
    return note?.html ? `<div class="ymz-node-hover-preview__note">${sanitizeRichHtml(note.html)}</div>` : '<div class="ymz-empty-hint">暂无备注</div>';
  }
  const comments = Array.isArray(value) ? value as NodeComment[] : [];
  if (!comments.length) return '<div class="ymz-empty-hint">暂无批注</div>';
  return `<div class="ymz-node-hover-preview__comments">${comments.map((comment) => `<div class="ymz-node-hover-preview__comment"><div class="ymz-node-hover-preview__comment-text">${escapeHtml(comment.text).replaceAll('\n', '<br>')}</div><time class="ymz-node-hover-preview__comment-time" datetime="${new Date(comment.createdAt).toISOString()}">${formatCommentTimestamp(comment.createdAt)}</time></div>`).join('')}</div>`;
}

export class NodeHoverPreview {
  private readonly element: HTMLElement;
  private showTimer: number | null = null;
  private hideTimer: number | null = null;
  private anchor: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'ymz-node-hover-preview';
    this.element.hidden = true;
    this.element.addEventListener('pointerenter', () => this.cancelHide());
    this.element.addEventListener('pointerleave', () => this.scheduleHide());
    root.appendChild(this.element);
  }

  show(type: NodeHoverPreviewType, value: NodeNote | NodeComment[], anchor: HTMLElement, delay = 220): void {
    this.cancelTimers();
    this.anchor = anchor;
    this.showTimer = window.setTimeout(() => {
      this.showTimer = null;
      this.element.dataset.type = type;
      this.element.innerHTML = buildHoverPreviewHtml(type, value);
      this.element.hidden = false;
      this.position(anchor);
    }, delay);
  }

  scheduleHide(delay = 160): void {
    if (this.showTimer !== null) window.clearTimeout(this.showTimer);
    this.showTimer = null;
    this.cancelHide();
    this.hideTimer = window.setTimeout(() => this.hide(), delay);
  }

  hide(): void {
    this.cancelTimers();
    this.element.hidden = true;
    this.element.innerHTML = '';
    this.element.style.removeProperty('width');
    this.element.style.removeProperty('max-height');
    delete this.element.dataset.placement;
    this.anchor = null;
  }

  destroy(): void {
    this.hide();
    this.element.remove();
  }

  private cancelHide(): void {
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  private cancelTimers(): void {
    if (this.showTimer !== null) window.clearTimeout(this.showTimer);
    this.showTimer = null;
    this.cancelHide();
  }

  private position(anchor: HTMLElement): void {
    const rootRect = this.root.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const rootWidth = this.root.clientWidth || rootRect.width || window.innerWidth;
    const rootHeight = this.root.clientHeight || rootRect.height || window.innerHeight;
    const normalizedRoot: RectLike = {
      left: rootRect.left,
      top: rootRect.top,
      right: rootRect.left + rootWidth,
      bottom: rootRect.top + rootHeight,
      width: rootWidth,
      height: rootHeight,
    };
    const desiredWidth = Math.min(360, Math.max(180, this.element.offsetWidth || 360));
    const desiredHeight = Math.min(320, Math.max(80, this.element.offsetHeight || 220));
    const placement = computeHoverPreviewPlacement({
      root: normalizedRoot,
      anchor: anchorRect,
      preview: { width: desiredWidth, height: desiredHeight },
    });
    this.element.dataset.placement = placement.placement;
    this.element.style.width = `${Math.round(placement.width)}px`;
    this.element.style.maxHeight = `${Math.round(placement.height)}px`;
    this.element.style.left = `${Math.round(placement.left - rootRect.left)}px`;
    this.element.style.top = `${Math.round(placement.top - rootRect.top)}px`;
  }
}
