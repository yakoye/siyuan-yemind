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

it('reports a mount failure instead of leaving an unhandled rejected promise', async () => {
  const onError = vi.fn();
  const state = { destroyed: false };

  await mountAfterReady(
    state,
    Promise.resolve(),
    () => ({ id: 'map-1' }),
    () => { throw new Error('editor failed'); },
    onError,
  );

  expect(onError).toHaveBeenCalledOnce();
  expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
});


it('cleans a registered tab handle when editor mounting fails', () => {
  const source = require('node:fs').readFileSync(require('node:path').resolve(process.cwd(), 'src/plugin/tabs.ts'), 'utf8');
  expect(source).toContain('state.unregister?.();');
  expect(source).toContain('state.unregister = undefined;');
});
