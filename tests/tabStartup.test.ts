import { describe, expect, it, vi } from 'vitest';
import { mountAfterReady } from '../src/plugin/deferredMount';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('restored tab startup', () => {
  it('waits for readiness before resolving and mounting a map', async () => {
    const ready = deferred();
    const resolveMap = vi.fn(() => ({ id: 'map-1', title: '未命名导图' }));
    const mount = vi.fn();
    const state = { destroyed: false };

    const mounting = mountAfterReady(state, ready.promise, resolveMap, mount);
    expect(resolveMap).not.toHaveBeenCalled();
    ready.resolve();
    await mounting;

    expect(resolveMap).toHaveBeenCalledOnce();
    expect(mount).toHaveBeenCalledWith({ id: 'map-1', title: '未命名导图' });
  });

  it('does not resolve or mount after the tab was destroyed while loading', async () => {
    const ready = deferred();
    const resolveMap = vi.fn(() => ({ id: 'map-1' }));
    const mount = vi.fn();
    const state = { destroyed: false };

    const mounting = mountAfterReady(state, ready.promise, resolveMap, mount);
    state.destroyed = true;
    ready.resolve();
    await mounting;

    expect(resolveMap).not.toHaveBeenCalled();
    expect(mount).not.toHaveBeenCalled();
  });
});
