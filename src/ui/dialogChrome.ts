import { Dialog } from 'siyuan';

export const YEMIND_DIALOG_CLASS = 'ymz-dialog-shell';

export function applyDialogChrome(dialog: Dialog): Dialog {
  dialog.element.classList.add(YEMIND_DIALOG_CLASS);
  dialog.element.dataset.yemindDialog = 'true';
  return dialog;
}

export function createYeMindDialog(options: any): Dialog {
  return applyDialogChrome(new Dialog(options));
}
