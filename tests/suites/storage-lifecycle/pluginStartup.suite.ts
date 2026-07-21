import { describe, expect, it, vi } from 'vitest';
import { initializePluginStartup } from '../../../src/plugin/pluginStartup';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('plugin startup coordination', () => {
  it('starts the real bootstrap before any UI registration', () => {
    const order: string[] = [];
    const boot = deferred();
    const ready = initializePluginStartup({
      startBootstrap: () => {
        order.push('bootstrap');
        return boot.promise;
      },
      registrations: [
        { name: 'tab', register: () => { order.push('tab'); } },
        { name: 'dock', register: () => { order.push('dock'); } },
      ],
      onRegistrationError: vi.fn(),
    });

    expect(order).toEqual(['bootstrap', 'tab', 'dock']);
    expect(ready).toBe(boot.promise);
  });

  it('publishes the real readiness promise before a registration can call host.whenReady()', () => {
    const order: string[] = [];
    const boot = deferred();
    let published: Promise<void> | null = null;

    initializePluginStartup({
      startBootstrap: () => {
        order.push('bootstrap');
        return boot.promise;
      },
      publishReady: (ready) => {
        published = ready;
        order.push('ready');
      },
      registrations: [
        {
          name: 'dock',
          register: () => {
            order.push('dock');
            expect(published).toBe(boot.promise);
          },
        },
      ],
      onRegistrationError: vi.fn(),
    });

    expect(order).toEqual(['bootstrap', 'ready', 'dock']);
  });

  it('isolates a failed optional registration and continues the remaining startup steps', () => {
    const calls: string[] = [];
    const onRegistrationError = vi.fn();
    const error = new Error('settings unavailable');

    initializePluginStartup({
      startBootstrap: () => Promise.resolve(),
      registrations: [
        { name: 'tab', register: () => { calls.push('tab'); } },
        { name: 'settings', register: () => { throw error; } },
        { name: 'commands', register: () => { calls.push('commands'); } },
      ],
      onRegistrationError,
    });

    expect(calls).toEqual(['tab', 'commands']);
    expect(onRegistrationError).toHaveBeenCalledWith('settings', error);
  });
});
