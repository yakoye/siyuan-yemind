import { describe, expect, it, vi } from 'vitest';
import { saveSettingsDraft } from '../src/settings/saveSettingsDraft';
import { DEFAULT_SETTINGS } from '../src/settings/SettingsStore';

describe('settings save lifecycle', () => {
  it('waits for storage success before reporting success', async () => {
    let resolve!: () => void;
    const update = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    const promise = saveSettingsDraft({ update } as never, DEFAULT_SETTINGS);

    expect(update).toHaveBeenCalledOnce();
    let settled = false;
    void promise.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    resolve();
    await promise;
    expect(settled).toBe(true);
  });

  it('propagates storage failures so the dialog can remain open', async () => {
    const error = new Error('disk full');
    const update = vi.fn().mockRejectedValue(error);
    await expect(saveSettingsDraft({ update } as never, DEFAULT_SETTINGS)).rejects.toBe(error);
  });
});
