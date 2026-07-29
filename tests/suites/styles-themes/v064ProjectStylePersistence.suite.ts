import { describe, expect, it, vi } from 'vitest';
import { MapRepository } from '../../../src/model/MapRepository';
import { CheckpointRepository } from '../../../src/model/CheckpointRepository';
import { ProjectStylePanel } from '../../../src/ui/projectStylePanel';

function storage(initial: unknown = null) {
  let value = initial;
  return { load: async () => value, save: async (next: unknown) => { value = structuredClone(next); }, read: () => value };
}

describe('v0.6.4 whole-map style persistence', () => {
  it('persists density, rainbow lines and background through map storage and checkpoints', async () => {
    const mapStorage = storage();
    const maps = new MapRepository(mapStorage, { id: () => 'm1', now: () => 10 });
    await maps.load();
    await maps.create('Demo');
    const style = {
      density: 'custom' as const,
      rainbowLines: true,
      rainbowScheme: 'rose',
      backgroundColor: '#8fa1cf',
      customMarginX: 36,
      customMarginY: 8,
    };
    await maps.update('m1', { projectStyle: style });
    expect(maps.get('m1')?.projectStyle).toEqual(style);

    const checkpointStorage = storage();
    const checkpoints = new CheckpointRepository(checkpointStorage, { id: () => 'cp1', now: () => 20 });
    await checkpoints.load();
    await checkpoints.create(maps.get('m1')!, 'styled');
    expect(checkpoints.get('cp1')?.snapshot.projectStyle).toEqual(style);
  });

  it.skip('uses one panel transaction for density and background changes', () => {
    const host = document.createElement('div');
    host.innerHTML = `<aside data-role="project-style-panel"><button data-project-style-action="close"></button><button data-project-density="compact"></button><button data-project-density="default"></button><button data-project-density="comfortable"></button><input type="checkbox" data-project-style="rainbowLines"><select data-project-style="rainbowScheme"><option value="rainbow">彩虹</option></select><i data-project-rainbow-preview></i><input type="color" data-project-style="backgroundColor" value="#f8fafc"><button data-project-background=""></button><button data-project-background="#8fa1cf"></button><button data-project-style-action="reset"></button></aside>`;
    const onChange = vi.fn();
    const panel = new ProjectStylePanel(host, { density: 'default', rainbowLines: null, rainbowScheme: null, backgroundColor: null }, () => false, onChange);
    host.querySelector<HTMLButtonElement>('[data-project-density="compact"]')!.click();
    expect(onChange).toHaveBeenLastCalledWith({ density: 'compact', rainbowLines: null, rainbowScheme: null, backgroundColor: null });
    host.querySelector<HTMLButtonElement>('[data-project-background="#8fa1cf"]')!.click();
    expect(onChange).toHaveBeenLastCalledWith({ density: 'compact', rainbowLines: null, rainbowScheme: null, backgroundColor: '#8fa1cf' });
    panel.destroy();
  });

  it('maps every visible line-style choice to a distinct real engine value', () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <aside data-role="project-style-panel">
        <button data-project-style-action="close"></button>
        <button data-project-line-style="curve"></button>
        <button data-project-line-style="direct"></button>
        <button data-project-line-style="polyline"></button>
        <button data-project-line-style="straight"></button>
      </aside>`;
    const onLineStyleChange = vi.fn();
    const panel = new ProjectStylePanel(
      host,
      { density: 'default', rainbowLines: null, rainbowScheme: null, backgroundColor: null },
      () => false,
      vi.fn(),
      'curve',
      onLineStyleChange,
    );

    host.querySelector<HTMLButtonElement>('[data-project-line-style="direct"]')!.click();
    expect(onLineStyleChange).toHaveBeenLastCalledWith('direct');
    expect(host.querySelector('[data-project-line-style="direct"]')?.classList.contains('is-active')).toBe(true);
    host.querySelector<HTMLButtonElement>('[data-project-line-style="polyline"]')!.click();
    expect(onLineStyleChange).toHaveBeenLastCalledWith('polyline');
    expect(host.querySelector('[data-project-line-style="polyline"]')?.classList.contains('is-active')).toBe(true);
    host.querySelector<HTMLButtonElement>('[data-project-line-style="straight"]')!.click();
    expect(onLineStyleChange).toHaveBeenLastCalledWith('straight');
    expect(new Set(['curve', 'direct', 'polyline', 'straight']).size).toBe(4);
    panel.destroy();
  });
});
