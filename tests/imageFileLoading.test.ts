import { describe, expect, it, vi } from 'vitest';
import { loadImageFileSelection } from '../src/ui/imageFileLoading';

describe('local node image loading', () => {
  it('returns image data and dimensions on success', async () => {
    const onError = vi.fn();
    const result = await loadImageFileSelection({} as File, {
      read: vi.fn(async () => 'data:image/png;base64,abc'),
      measure: vi.fn(async () => ({ width: 640, height: 480 })),
      onError,
    });

    expect(result).toEqual({ dataUrl: 'data:image/png;base64,abc', size: { width: 640, height: 480 } });
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports read failures and returns null instead of rejecting', async () => {
    const error = new Error('read failed');
    const onError = vi.fn();
    const result = await loadImageFileSelection({} as File, {
      read: vi.fn(async () => { throw error; }),
      measure: vi.fn(),
      onError,
    });

    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledWith(error);
  });
});
