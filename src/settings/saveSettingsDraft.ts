import type { SettingsStore, YeMindSettings } from './SettingsStore';

/** Persist a complete settings draft. The caller decides when the dialog may close. */
export async function saveSettingsDraft(
  store: Pick<SettingsStore, 'update'>,
  draft: YeMindSettings,
): Promise<void> {
  await store.update(draft);
}
