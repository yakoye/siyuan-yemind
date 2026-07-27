import { describe, expect, it } from 'vitest';
import { createMemoryWebStore, jsonStorage } from '../src/webStorage';

describe('web storage', () => {
  it('round-trips cloned JSON values', async () => {
    const store = createMemoryWebStore();
    const storage = jsonStorage<{ nested: { value: number } }>(store, 'maps');
    const value = { nested: { value: 1 } };
    await storage.save(value);
    value.nested.value = 2;
    expect(await storage.load()).toEqual({ nested: { value: 1 } });
  });

  it('serializes writes for the same key', async () => {
    const store = createMemoryWebStore();
    const storage = jsonStorage<{ n: number }>(store, 'maps');
    await Promise.all([storage.save({ n: 1 }), storage.save({ n: 2 })]);
    expect(await storage.load()).toEqual({ n: 2 });
  });

  it('commits several keys as one transaction', async () => {
    const store = createMemoryWebStore();
    await store.transaction({ maps: { version: 1 }, settings: { theme: 'light' } });
    expect(await store.get('maps')).toEqual({ version: 1 });
    expect(await store.get('settings')).toEqual({ theme: 'light' });
  });
});
