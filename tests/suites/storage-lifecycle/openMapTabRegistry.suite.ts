import { describe, expect, it, vi } from 'vitest';
import { OpenMapTabRegistry } from '../../../src/plugin/OpenMapTabRegistry';
import {
  collectRestoredMapTabsFromLayout,
  deduplicateRestoredMapTabs,
} from '../../../src/plugin/siyuanTabLifecycle';

describe('OpenMapTabRegistry', () => {
  it('activates and updates the existing tab for a map', () => {
    const registry = new OpenMapTabRegistry();
    const activate = vi.fn();
    const updateTitle = vi.fn();
    registry.register('map-1', { activate, close: vi.fn(), updateTitle });

    expect(registry.activate('map-1')).toBe(true);
    registry.updateTitle('map-1', 'Renamed');
    expect(activate).toHaveBeenCalledOnce();
    expect(updateTitle).toHaveBeenCalledWith('Renamed');
  });

  it('keeps the first live restored tab and closes a duplicate owner', async () => {
    const registry = new OpenMapTabRegistry();
    const activateOld = vi.fn();
    const unregisterOld = registry.register('map-1', { activate: vi.fn(), close: vi.fn(), updateTitle: vi.fn() });
    const closeDuplicate = vi.fn();
    registry.register('map-1', { activate: vi.fn(), close: closeDuplicate, updateTitle: vi.fn() });

    await Promise.resolve();
    expect(closeDuplicate).toHaveBeenCalledOnce();
    unregisterOld();
    registry.register('map-1', { activate: activateOld, close: vi.fn(), updateTitle: vi.fn() });
    expect(registry.activate('map-1')).toBe(true);
    expect(activateOld).toHaveBeenCalledOnce();
  });

  it('reports duplicate ownership so a restoring tab does not mount a second editor', async () => {
    const registry = new OpenMapTabRegistry();
    expect(registry.tryRegister('map-1', {
      activate: vi.fn(),
      close: vi.fn(),
      updateTitle: vi.fn(),
    }).accepted).toBe(true);
    const closeDuplicate = vi.fn();
    const duplicate = registry.tryRegister('map-1', {
      activate: vi.fn(),
      close: closeDuplicate,
      updateTitle: vi.fn(),
    });
    expect(duplicate.accepted).toBe(false);
    await Promise.resolve();
    expect(closeDuplicate).toHaveBeenCalledOnce();
  });

  it('waits for a restoring tab to register before allowing creation', async () => {
    const registry = new OpenMapTabRegistry();
    const waiting = registry.waitForRegistration('map-1', 1000);
    registry.register('map-1', { activate: vi.fn(), close: vi.fn(), updateTitle: vi.fn() });
    await expect(waiting).resolves.toBe(true);
  });
});

it('removes a handle before closing so repeated close requests are idempotent', () => {
  const registry = new OpenMapTabRegistry();
  const close = vi.fn(() => {
    expect(registry.close('map-1')).toBe(false);
  });
  registry.register('map-1', { activate: vi.fn(), close, updateTitle: vi.fn() });

  expect(registry.close('map-1')).toBe(true);
  expect(registry.close('map-1')).toBe(false);
  expect(close).toHaveBeenCalledOnce();
});


it('drops a stale tab handle so the map can be opened again', () => {
  const registry = new OpenMapTabRegistry();
  const activate = vi.fn();
  registry.register('map-1', { activate, close: vi.fn(), updateTitle: vi.fn(), isAlive: () => false });

  expect(registry.activate('map-1')).toBe(false);
  expect(activate).not.toHaveBeenCalled();
});

it('deduplicates lazy restored tabs before their editors are initialized', () => {
  const removeTab = vi.fn();
  const makeCustom = (mapId: string, id: string, active = false) => ({
    data: { mapId },
    tab: {
      id,
      parent: { removeTab },
      headElement: {
        isConnected: true,
        classList: { contains: (name: string) => active && name === 'item--focus' },
      },
    },
  });
  const first = makeCustom('map-1', 'first');
  const active = makeCustom('map-1', 'active', true);
  const duplicate = makeCustom('map-1', 'duplicate');
  const other = makeCustom('map-2', 'other');

  expect(deduplicateRestoredMapTabs({ tabs: [first, active, duplicate, other] })).toBe(2);
  expect(removeTab).toHaveBeenCalledWith('first');
  expect(removeTab).toHaveBeenCalledWith('duplicate');
  expect(removeTab).not.toHaveBeenCalledWith('active');
  expect(removeTab).not.toHaveBeenCalledWith('other');
});

it('reads lazy custom map ids from SiYuan tab head init data', () => {
  const removeTab = vi.fn();
  const makeTab = (id: string, initData: unknown) => ({
    id,
    parent: { removeTab },
    headElement: {
      classList: { contains: () => false },
      getAttribute: (name: string) => name === 'data-initdata'
        ? JSON.stringify(initData)
        : null,
    },
  });
  const layout = {
    children: [{
      children: [
        makeTab('first', {
          instance: 'Custom',
          customModelType: 'siyuan-yemindyemind-map',
          customModelData: { mapId: 'map-1' },
        }),
        makeTab('duplicate', {
          instance: 'Custom',
          customModelType: 'siyuan-yemindyemind-map',
          customModelData: { mapId: 'map-1' },
        }),
        makeTab('kmind', {
          instance: 'Custom',
          customModelType: 'siyuan-kmind-zenMindmap',
          customModelData: { mapId: 'map-1' },
        }),
      ],
    }],
  };
  const restored = collectRestoredMapTabsFromLayout(layout, 'siyuan-yemindyemind-map');
  expect(restored.map((custom) => custom.data?.mapId)).toEqual(['map-1', 'map-1']);
  expect(deduplicateRestoredMapTabs({ layout: restored })).toBe(1);
  expect(removeTab).toHaveBeenCalledWith('duplicate');
  expect(removeTab).not.toHaveBeenCalledWith('kmind');
});
