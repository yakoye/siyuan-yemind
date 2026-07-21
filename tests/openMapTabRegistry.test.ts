import { describe, expect, it, vi } from 'vitest';
import { OpenMapTabRegistry } from '../src/plugin/OpenMapTabRegistry';

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

  it('does not let an old unregister callback remove a replacement handle', () => {
    const registry = new OpenMapTabRegistry();
    const unregisterOld = registry.register('map-1', { activate: vi.fn(), close: vi.fn(), updateTitle: vi.fn() });
    const activateNew = vi.fn();
    registry.register('map-1', { activate: activateNew, close: vi.fn(), updateTitle: vi.fn() });

    unregisterOld();
    expect(registry.activate('map-1')).toBe(true);
    expect(activateNew).toHaveBeenCalledOnce();
  });
});
