import { renderCheckpointListHtml } from '../checkpoints/checkpointPresentation';
import type { MapCheckpoint } from '../model/checkpointTypes';

export function buildCheckpointDialogContent(checkpoints: MapCheckpoint[], readonly: boolean): string {
  return `<div class="b3-dialog__content ymz-checkpoint-dialog">
    <div class="ymz-checkpoint-dialog__intro">检查点保存在独立历史文件中。恢复前会自动保存当前状态为保护检查点。</div>
    <div class="ymz-checkpoint-list" data-role="checkpoint-list">${renderCheckpointListHtml(checkpoints, { readonly })}</div>
  </div>
  <div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel" data-checkpoint-dialog-action="close">关闭</button>
  </div>`;
}
