import { Dialog, showMessage } from 'siyuan';
import { findShortcutConflicts, keyboardEventToShortcut } from '../editor/shortcuts';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SHORTCUTS,
  type SettingsStore,
  type ShortcutCommand,
  type YeMindSettings,
} from './SettingsStore';
import { createSettingsDialogTemplate, SHORTCUT_ROWS } from './settingsDialogTemplate';
import { saveSettingsDraft } from './saveSettingsDraft';

function cloneSettings(settings: YeMindSettings): YeMindSettings {
  return { ...settings, shortcutMap: { ...settings.shortcutMap } };
}

function setControlValue(control: HTMLInputElement | HTMLSelectElement, value: unknown): void {
  if (control instanceof HTMLInputElement && control.type === 'checkbox') control.checked = Boolean(value);
  else control.value = String(value ?? '');
}

export function openYeMindSettingsDialog(store: SettingsStore): void {
  let draft = cloneSettings(store.get());
  let recordingCleanup: (() => void) | null = null;
  const dialog = new Dialog({
    title: 'YeMind Zen 设置',
    content: createSettingsDialogTemplate(draft),
    width: '880px',
    height: '78vh',
    destroyCallback: () => recordingCleanup?.(),
  });

  const shell = dialog.element.querySelector<HTMLElement>('.ymz-settings-shell');
  if (!shell) return;
  const saveButton = shell.querySelector<HTMLButtonElement>('[data-settings-action="save"]');
  let hasShortcutConflict = false;
  let saving = false;

  const refreshConflicts = (): void => {
    const conflicts = findShortcutConflicts(draft.shortcutMap);
    let hasConflict = false;
    SHORTCUT_ROWS.forEach((row) => {
      const targets = conflicts[row.key];
      const container = shell.querySelector<HTMLElement>(`[data-shortcut-row="${row.key}"]`);
      const hint = shell.querySelector<HTMLElement>(`[data-shortcut-conflict="${row.key}"]`);
      const labels = targets.map((target) => SHORTCUT_ROWS.find((item) => item.key === target)?.label ?? target);
      container?.classList.toggle('has-conflict', targets.length > 0);
      if (hint) hint.textContent = targets.length > 0 ? `与“${labels.join('、')}”冲突` : '';
      if (targets.length > 0) hasConflict = true;
    });
    hasShortcutConflict = hasConflict;
    if (saveButton) {
      saveButton.disabled = saving || hasConflict;
      saveButton.title = hasConflict ? '请先解决快捷键冲突' : '';
    }
  };

  const refreshControls = (): void => {
    shell.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]').forEach((control) => {
      const key = control.dataset.setting as keyof YeMindSettings;
      setControlValue(control, draft[key]);
    });
    shell.querySelectorAll<HTMLInputElement>('[data-shortcut]').forEach((input) => {
      const key = input.dataset.shortcut as ShortcutCommand;
      input.value = draft.shortcutMap[key];
      input.placeholder = '未设置';
      delete input.dataset.recording;
    });
    refreshConflicts();
  };

  shell.querySelectorAll<HTMLButtonElement>('[data-settings-page]').forEach((button) => {
    button.addEventListener('click', () => {
      const page = button.dataset.settingsPage;
      shell.querySelectorAll('[data-settings-page]').forEach((item) => item.classList.toggle('is-active', item === button));
      shell.querySelectorAll<HTMLElement>('[data-settings-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.settingsPanel !== page;
      });
    });
  });

  shell.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]').forEach((control) => {
    control.addEventListener('change', () => {
      const key = control.dataset.setting as keyof YeMindSettings;
      const value: unknown = control instanceof HTMLInputElement && control.type === 'checkbox'
        ? control.checked
        : control instanceof HTMLInputElement && control.type === 'number'
          ? Number(control.value)
          : key === 'codeBlockTabSize'
            ? Number(control.value)
            : control.value;
      (draft as unknown as Record<string, unknown>)[key] = value;
    });
  });

  shell.querySelectorAll<HTMLInputElement>('[data-shortcut]').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.shortcut as ShortcutCommand;
      draft.shortcutMap[key] = input.value.trim();
      refreshConflicts();
    });
  });

  const beginRecording = (key: ShortcutCommand, input: HTMLInputElement): void => {
    recordingCleanup?.();
    input.focus();
    input.select();
    input.placeholder = '请按快捷键，Esc 取消';
    input.dataset.recording = 'true';
    const previous = input.value;
    const listener = (event: KeyboardEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        input.value = previous;
      } else {
        const shortcut = keyboardEventToShortcut(event);
        if (!shortcut) return;
        input.value = shortcut;
        draft.shortcutMap[key] = shortcut;
      }
      recordingCleanup?.();
      refreshConflicts();
    };
    window.addEventListener('keydown', listener, true);
    recordingCleanup = () => {
      window.removeEventListener('keydown', listener, true);
      input.placeholder = '未设置';
      delete input.dataset.recording;
      recordingCleanup = null;
    };
  };

  shell.querySelectorAll<HTMLButtonElement>('[data-shortcut-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.shortcutKey as ShortcutCommand;
      const input = shell.querySelector<HTMLInputElement>(`[data-shortcut="${key}"]`);
      if (!input) return;
      const action = button.dataset.shortcutAction;
      if (action === 'disable') {
        input.value = '';
        draft.shortcutMap[key] = '';
        refreshConflicts();
      } else if (action === 'restore') {
        input.value = DEFAULT_SHORTCUTS[key];
        draft.shortcutMap[key] = DEFAULT_SHORTCUTS[key];
        refreshConflicts();
      } else {
        beginRecording(key, input);
      }
    });
  });

  shell.querySelector('[data-settings-action="cancel"]')?.addEventListener('click', () => {
    recordingCleanup?.();
    dialog.destroy();
  });
  shell.querySelector('[data-settings-action="reset"]')?.addEventListener('click', () => {
    draft = cloneSettings(DEFAULT_SETTINGS);
    refreshControls();
    showMessage('已恢复默认值，点击“保存”后生效');
  });
  saveButton?.addEventListener('click', async () => {
    if (saving || saveButton.disabled) return;
    recordingCleanup?.();
    const originalText = saveButton.textContent ?? '保存';
    saving = true;
    saveButton.disabled = true;
    saveButton.textContent = '保存中…';
    try {
      await saveSettingsDraft(store, cloneSettings(draft));
      dialog.destroy();
    } catch (error) {
      console.error('[YeMind Zen] settings save failed', error);
      showMessage('YeMind Zen 设置保存失败，请检查存储后重试', 5000, 'error');
      saving = false;
      saveButton.textContent = originalText;
      saveButton.disabled = hasShortcutConflict;
    }
  });

  refreshConflicts();
}
