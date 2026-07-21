import type { MapCheckpoint } from '../model/checkpointTypes';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function formatCheckpointTime(value: number): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function renderCheckpointListHtml(checkpoints: MapCheckpoint[], options: { readonly: boolean }): string {
  if (checkpoints.length === 0) {
    return '<div class="ymz-checkpoint-empty">暂无检查点</div>';
  }
  return checkpoints.map((checkpoint) => {
    const kind = checkpoint.kind === 'recovery-protection' ? '恢复前保护' : '普通检查点';
    const restoreDisabled = options.readonly ? ' disabled' : '';
    return `<article class="ymz-checkpoint-item" data-checkpoint-id="${escapeHtml(checkpoint.id)}">
      <div class="ymz-checkpoint-item__main">
        <strong>${escapeHtml(checkpoint.name)}</strong>
        <span>${kind} · ${formatCheckpointTime(checkpoint.createdAt)} · ${checkpoint.nodeCount} 个节点</span>
      </div>
      <div class="ymz-checkpoint-item__actions">
        <button data-checkpoint-action="restore"${restoreDisabled}>恢复</button>
        <button data-checkpoint-action="rename">重命名</button>
        <button class="is-danger" data-checkpoint-action="delete">删除</button>
      </div>
    </article>`;
  }).join('');
}
