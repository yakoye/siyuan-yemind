import { describe, expect, it } from 'vitest';
import {
  normalizeAppearanceMode,
  resolveAppearance,
} from '../../../src/core/appearanceMode';
import {
  DEFAULT_SETTINGS,
  SettingsStore,
} from '../../../src/settings/SettingsStore';

describe('v1.3.0 appearance mode settings', () => {
  it('normalizes unknown values to system mode', () => {
    expect(normalizeAppearanceMode('system')).toBe('system');
    expect(normalizeAppearanceMode('light')).toBe('light');
    expect(normalizeAppearanceMode('dark')).toBe('dark');
    expect(normalizeAppearanceMode('sepia')).toBe('system');
    expect(normalizeAppearanceMode(null)).toBe('system');
  });

  it('resolves system mode without changing explicit modes', () => {
    expect(resolveAppearance('system', true)).toBe('dark');
    expect(resolveAppearance('system', false)).toBe('light');
    expect(resolveAppearance('light', true)).toBe('light');
    expect(resolveAppearance('dark', false)).toBe('dark');
  });

  it('migrates legacy settings to system appearance', async () => {
    const store = new SettingsStore({
      load: async () => ({ toolbarsPinned: false }),
      save: async () => {},
    });

    await store.load();

    expect(DEFAULT_SETTINGS.appearanceMode).toBe('system');
    expect(store.get().appearanceMode).toBe('system');
  });

  it('persists an explicit appearance and rejects a malformed stored value', async () => {
    let saved: unknown;
    const store = new SettingsStore({
      load: async () => ({ appearanceMode: 'contrast' }),
      save: async (value) => {
        saved = value;
      },
    });
    await store.load();
    expect(store.get().appearanceMode).toBe('system');

    await store.update({ appearanceMode: 'dark' });

    expect(store.get().appearanceMode).toBe('dark');
    expect(saved).toMatchObject({ appearanceMode: 'dark' });
  });
});
