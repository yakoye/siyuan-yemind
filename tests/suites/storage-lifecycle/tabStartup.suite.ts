import { describe, expect, it, vi } from 'vitest';
import { mountAfterReady } from '../../../src/plugin/deferredMount';

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

it('registers a restored tab before waiting for repository readiness or visibility', () => {
  const source = require('node:fs').readFileSync(require('node:path').resolve(process.cwd(), 'src/plugin/tabs.ts'), 'utf8');
  const registerAt = source.indexOf('host.tabRegistry.tryRegister(mapId');
  const mountAt = source.indexOf('void mountAfterReady(');
  expect(registerAt).toBeGreaterThan(0);
  expect(registerAt).toBeLessThan(mountAt);
});

it('uses the custom-tab destroy lifecycle instead of transient head attachment during restore', () => {
  const source = require('node:fs').readFileSync(require('node:path').resolve(process.cwd(), 'src/plugin/tabs.ts'), 'utf8');
  expect(source).toContain('isAlive: () => !state.destroyed');
  expect(source).not.toContain('headElement.isConnected');
});

it('does not mount an editor for a duplicate restored owner and closes it after attachment', () => {
  const source = require('node:fs').readFileSync(require('node:path').resolve(process.cwd(), 'src/plugin/tabs.ts'), 'utf8');
  expect(source).toContain('host.tabRegistry.tryRegister(mapId');
  expect(source).toContain('if (!registration.accepted)');
  expect(source).toContain('window.requestAnimationFrame(() => closeTab(attempt + 1))');
  expect(source).toContain("import { closeSiYuanTab } from './siyuanTabLifecycle'");
  expect(source).toContain('closeSiYuanTab(this.tab as any)');
});

it('persists imported study cards with the same contract as the web host', () => {
  const source = require('node:fs').readFileSync(require('node:path').resolve(process.cwd(), 'src/plugin/tabs.ts'), 'utf8');
  expect(source).toContain('studyCards: imported.studyCards');
});
