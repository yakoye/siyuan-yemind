import { Dialog } from 'siyuan';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function promptText(title: string, initialValue: string, placeholder = ''): Promise<string | null> {
  return new Promise((resolve) => {
    const inputId = `ymz-input-${Date.now()}`;
    const dialog = new Dialog({
      title,
      width: '440px',
      content: `<div class="b3-dialog__content"><input id="${inputId}" class="b3-text-field fn__block" value="${escapeHtml(initialValue)}" placeholder="${escapeHtml(placeholder)}"></div><div class="b3-dialog__action"><button class="b3-button b3-button--cancel">取消</button><button class="b3-button b3-button--text">确定</button></div>`,
      destroyCallback: () => resolve(null),
    });
    const element = dialog.element;
    const input = element.querySelector<HTMLInputElement>(`#${inputId}`)!;
    const cancel = element.querySelector<HTMLButtonElement>('.b3-button--cancel')!;
    const confirm = element.querySelector<HTMLButtonElement>('.b3-button--text')!;
    let completed = false;
    const finish = (value: string | null) => {
      if (completed) return;
      completed = true;
      resolve(value);
      dialog.destroy();
    };
    cancel.addEventListener('click', () => finish(null));
    confirm.addEventListener('click', () => finish(input.value.trim() || null));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') finish(input.value.trim() || null);
      if (event.key === 'Escape') finish(null);
    });
    requestAnimationFrame(() => { input.focus(); input.select(); });
  });
}

export function confirmAction(title: string, message: string, confirmText = '确定'): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = new Dialog({
      title,
      width: '440px',
      content: `<div class="b3-dialog__content"><p>${escapeHtml(message)}</p></div><div class="b3-dialog__action"><button class="b3-button b3-button--cancel">取消</button><button class="b3-button b3-button--text">${escapeHtml(confirmText)}</button></div>`,
      destroyCallback: () => resolve(false),
    });
    let completed = false;
    const finish = (value: boolean) => {
      if (completed) return;
      completed = true;
      resolve(value);
      dialog.destroy();
    };
    dialog.element.querySelector<HTMLButtonElement>('.b3-button--cancel')?.addEventListener('click', () => finish(false));
    dialog.element.querySelector<HTMLButtonElement>('.b3-button--text')?.addEventListener('click', () => finish(true));
  });
}
