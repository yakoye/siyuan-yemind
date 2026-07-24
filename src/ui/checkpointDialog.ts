import { Dialog, showMessage } from 'siyuan';
import type { CheckpointService } from '../checkpoints/CheckpointService';
import { renderCheckpointListHtml } from '../checkpoints/checkpointPresentation';
import type { CheckpointRepository } from '../model/CheckpointRepository';
import type { YeMindMapDocument } from '../model/types';
import { confirmAction, promptText } from './dialogs';
import { buildCheckpointDialogContent } from './checkpointDialogTemplate';

export interface CheckpointDialogOptions {
  mapId: string;
  mapTitle: string;
  readonly: boolean;
  repository: CheckpointRepository;
  service: CheckpointService;
  onCreate(): Promise<void>;
  onBeforeRestore(): Promise<void>;
  onRestored(map: YeMindMapDocument): Promise<void> | void;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function openCheckpointManager(options: CheckpointDialogOptions): void {
  const dialog = new Dialog({
    title: `检查点 · ${escapeHtml(options.mapTitle)}`,
    width: '720px',
    content: buildCheckpointDialogContent(options.repository.list(options.mapId), options.readonly),
  });
  let busy = false;

  const render = (): void => {
    const list = dialog.element.querySelector<HTMLElement>('[data-role="checkpoint-list"]');
    if (list) list.innerHTML = renderCheckpointListHtml(options.repository.list(options.mapId), { readonly: options.readonly });
  };

  dialog.element.querySelector('[data-checkpoint-dialog-action="close"]')?.addEventListener('click', () => dialog.destroy());
  dialog.element.querySelector('[data-checkpoint-dialog-action="create"]')?.addEventListener('click', () => {
    if (busy) return;
    void (async () => {
      busy = true;
      try {
        await options.onCreate();
        render();
      } catch (error) {
        console.error('[YeMind] checkpoint create failed', error);
        showMessage('检查点创建失败，请稍后重试', 5000, 'error');
      } finally {
        busy = false;
      }
    })();
  });
  dialog.element.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-checkpoint-action]');
    if (!button || busy || button.disabled) return;
    const row = button.closest<HTMLElement>('[data-checkpoint-id]');
    const checkpointId = row?.dataset.checkpointId;
    if (!checkpointId) return;
    const checkpoint = options.repository.get(checkpointId);
    if (!checkpoint) {
      render();
      return;
    }

    const action = button.dataset.checkpointAction;
    void (async () => {
      busy = true;
      try {
        if (action === 'rename') {
          const name = await promptText('重命名检查点', checkpoint.name, '检查点名称');
          if (name && name !== checkpoint.name) await options.repository.rename(checkpoint.id, name);
        } else if (action === 'delete') {
          const confirmed = await confirmAction('删除检查点', `确认删除“${checkpoint.name}”？`, '删除');
          if (confirmed) await options.repository.remove(checkpoint.id);
        } else if (action === 'restore' && !options.readonly) {
          const confirmed = await confirmAction(
            '恢复检查点',
            `确认恢复“${checkpoint.name}”？当前状态会先自动保存为恢复前保护检查点。`,
            '恢复',
          );
          if (!confirmed) return;
          await options.onBeforeRestore();
          const restored = await options.service.restore(options.mapId, checkpoint.id);
          await options.onRestored(restored);
          showMessage('检查点恢复完成');
        }
        render();
      } catch (error) {
        console.error('[YeMind] checkpoint operation failed', error);
        showMessage('检查点操作失败，请稍后重试', 5000, 'error');
      } finally {
        busy = false;
      }
    })();
  });
}
