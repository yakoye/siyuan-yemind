import { afterEach, describe, expect, it } from 'vitest';
import { YeMindWebApp } from '../src/webApp';
import { createWebServices } from '../src/webServices';
import { createMemoryWebStore } from '../src/webStorage';
import type { YeMindEditorOptions } from '../../src/editor/YeMindEditor';

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

  it('injects complete backup and restore into the shared editor without duplicate shell buttons', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const services = createWebServices(createMemoryWebStore());
    let editorOptions: YeMindEditorOptions | undefined;
    const app = new YeMindWebApp(root, services, {
      createEditor: (options) => {
        editorOptions = options;
        return {
          destroy: () => undefined,
          resize: () => undefined,
        };
      },
    });
    await app.start();
    expect(editorOptions?.onExportBackup).toBeTypeOf('function');
    expect(editorOptions?.onRestoreBackup).toBeTypeOf('function');
    expect(root.querySelector('[data-web-action="export"]')).toBeNull();
    expect(root.querySelector('[data-web-action="import"]')).toBeNull();
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
