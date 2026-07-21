import { describe, expect, it, vi } from 'vitest';
import { runSafeOperation } from '../../../src/plugin/operationSafety';

describe('plugin operation safety', () => {
  it('returns results and reports failures without unhandled rejections', async () => {
    const onError = vi.fn();
    await expect(runSafeOperation(async () => 42, onError)).resolves.toBe(42);
    const error = new Error('storage unavailable');
    await expect(runSafeOperation(async () => { throw error; }, onError)).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(error);
  });
});
