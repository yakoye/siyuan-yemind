import type { NodeComment } from '../content/nodeContentState';
import type { NodeNote } from '../content/nodeNoteState';
import { sanitizeRichHtml } from '../content/sanitizeRichHtml';

export type NodeHoverPreviewType = 'note' | 'comments';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}



export function buildHoverPreviewHtml(type: NodeHoverPreviewType, value: NodeNote | NodeComment[] | null | undefined): string {
  if (type === 'note') {
    const note = value as NodeNote | null | undefined;
    return note?.html ? `<div class="ymz-node-hover-preview__note">${sanitizeRichHtml(note.html)}</div>` : '<div class="ymz-empty-hint">暂无备注</div>';
  }
  const comments = Array.isArray(value) ? value as NodeComment[] : [];
  if (!comments.length) return '<div class="ymz-empty-hint">暂无批注</div>';
  return `<div class="ymz-node-hover-preview__comments">${comments.map((comment) => `<div class="ymz-node-hover-preview__comment">${escapeHtml(comment.text).replaceAll('\n', '<br>')}</div>`).join('')}</div>`;
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
    const root = this.root.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    const width = this.element.offsetWidth || 360;
    const height = this.element.offsetHeight || 220;
    const rootWidth = this.root.clientWidth || root.width || window.innerWidth;
    const rootHeight = this.root.clientHeight || root.height || window.innerHeight;
    const left = Math.max(8, Math.min(rect.right - root.left + 8, rootWidth - width - 8));
    const top = Math.max(8, Math.min(rect.top - root.top, rootHeight - height - 8));
    this.element.style.left = `${Math.round(left)}px`;
    this.element.style.top = `${Math.round(top)}px`;
  }
}
