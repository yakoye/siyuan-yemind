import { afterEach, describe, expect, it, vi } from 'vitest';
import { YeMindWebApp } from '../src/webApp';
import { createWebServices } from '../src/webServices';
import { createMemoryWebStore } from '../src/webStorage';

afterEach(() => {
  document.body.innerHTML = '';
  delete document.documentElement.dataset.appearance;
  delete document.documentElement.dataset.appearanceMode;
  document.documentElement.style.colorScheme = '';
});

describe('standalone YeMind workspace', () => {
  it('creates a default map on first launch', async () => {
    const services = createWebServices(createMemoryWebStore());
    await services.load();
    expect(services.repository.list()).toHaveLength(1);
    expect(services.repository.getActiveMapId()).toBe(services.repository.list()[0].id);
  });

  it('switches editors without leaking the previous instance', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const services = createWebServices(createMemoryWebStore());
    const mounted: string[] = [];
    const destroyed: string[] = [];
    const app = new YeMindWebApp(root, services, {
      createEditor: (options) => {
        mounted.push(options.mapId);
        return {
          destroy: () => destroyed.push(options.mapId),
          resize: () => undefined,
        };
      },
    });
    await app.start();
    await app.createMap('第二张');
    expect(mounted).toHaveLength(2);
    expect(destroyed).toEqual([mounted[0]]);
    expect(root.querySelectorAll('[data-web-map-id]')).toHaveLength(2);
    app.destroy();
  });

  it('delegates map import and export to the live shared editor', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const services = createWebServices(createMemoryWebStore());
    const openExportDialog = vi.fn();
    const openImportPicker = vi.fn();
    const app = new YeMindWebApp(root, services, {
      createEditor: () => ({
        destroy: () => undefined,
        resize: () => undefined,
        openExportDialog,
        openImportPicker,
      }),
    });
    await app.start();
    root.querySelector<HTMLButtonElement>('[data-web-action="export"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-web-action="import"]')!.click();
    await Promise.resolve();
    expect(openExportDialog).toHaveBeenCalledOnce();
    expect(openImportPicker).toHaveBeenCalledOnce();
    app.destroy();
  });

  it('keeps the web shell synchronized with the shared appearance setting', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const services = createWebServices(createMemoryWebStore());
    const app = new YeMindWebApp(root, services, {
      createEditor: () => ({
        destroy: () => undefined,
        resize: () => undefined,
      }),
    });

    await app.start();
    expect(document.documentElement.dataset.appearanceMode).toBe('system');
    expect(['light', 'dark']).toContain(document.documentElement.dataset.appearance);

    await services.settingsStore.update({ appearanceMode: 'dark' });

    expect(document.documentElement.dataset.appearanceMode).toBe('dark');
    expect(document.documentElement.dataset.appearance).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    app.destroy();
  });
});
