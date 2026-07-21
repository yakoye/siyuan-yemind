import { describe, expect, it, vi } from 'vitest';
import { runIsolatedLifecycleProbe } from '../src/diagnostics/isolatedLifecycleProbe';

function storage() {
  let value: unknown = null;
  return {
    load: async () => structuredClone(value),
    save: async (next: unknown) => { value = structuredClone(next); },
  };
}

describe('runIsolatedLifecycleProbe', () => {
  it('runs the full map/checkpoint lifecycle only inside the supplied isolated stores', async () => {
    const cleanup = vi.fn(async () => undefined);
    const result = await runIsolatedLifecycleProbe({
      maps: storage(),
      checkpoints: storage(),
      cleanup,
    }, 'logicalStructure');

    expect(result).toEqual({
      create: true,
      update: true,
      checkpoint: true,
      restore: true,
      cleanup: true,
    });
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('still cleans isolated storage when an operation fails', async () => {
    const cleanup = vi.fn(async () => undefined);
    await expect(runIsolatedLifecycleProbe({
      maps: {
        load: async () => null,
        save: async () => { throw new Error('write failed'); },
      },
      checkpoints: storage(),
      cleanup,
    }, 'logicalStructure')).rejects.toThrow('write failed');
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
