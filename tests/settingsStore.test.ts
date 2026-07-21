import { describe, expect, it } from 'vitest';
import { SettingsStore } from '../src/settings/SettingsStore';

describe('SettingsStore', () => {
  it('normalizes invalid values and persists updates', async () => {
    let saved: unknown;
    const store = new SettingsStore({
      load: async () => ({ defaultLayout: 'bad', canvasMode: 'select', wheelMode: 'pan' }),
      save: async (value) => { saved = value; },
    });
    await store.load();
    expect(store.get()).toMatchObject({
      defaultLayout: 'logicalStructure',
      canvasMode: 'select',
      wheelMode: 'pan',
    });
    await store.update({ defaultLayout: 'mindMap' });
    expect(saved).toMatchObject({ defaultLayout: 'mindMap' });
  });
});
