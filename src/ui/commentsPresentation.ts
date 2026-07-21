import type { NodeComment } from '../content/nodeContentState';

export type ConfirmHandler = (title: string, message: string, onConfirm: () => void) => void;

export function formatCommentTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function buildCommentsListHtml(comments: NodeComment[], editingId: string | null = null): string {
  if (comments.length === 0) return '<div class="ymz-empty-hint">暂无批注</div>';
  return comments.map((comment) => {
    const editing = comment.id === editingId;
    const body = editing
      ? `<textarea class="b3-text-field fn__block ymz-comment__editor" rows="3" data-field="edit-comment">${escapeHtml(comment.text)}</textarea>`
      : `<div class="ymz-comment__text">${escapeHtml(comment.text).replaceAll('\n', '<br>')}</div>`;
    const actions = editing
      ? `<button class="b3-button b3-button--outline" data-action="save-comment">保存</button>
         <button class="b3-button b3-button--cancel" data-action="cancel-edit-comment">取消</button>`
      : `<button class="b3-button b3-button--outline" data-action="edit-comment">编辑</button>
         <button class="b3-button b3-button--cancel" data-action="delete-comment">删除</button>`;
    return `<article class="ymz-comment" data-comment-id="${escapeAttribute(comment.id)}">
      <div class="ymz-comment__main">
        <time class="ymz-comment__time" datetime="${new Date(comment.createdAt).toISOString()}">${formatCommentTimestamp(comment.createdAt)}</time>
        ${body}
      </div>
      <div class="ymz-comment__actions">${actions}</div>
    </article>`;
  }).join('');
}

export function requestClearAllComments(confirmHandler: ConfirmHandler, onClear: () => void): void {
  confirmHandler(
    '清空全部批注',
    '确定要清空当前节点的全部批注吗？此操作无法撤销。',
    onClear,
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
