import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import {
  EXPORT_CATEGORIES,
  EXPORT_FORMATS,
  exportFormatsForCategory,
} from '../../../src/transfer/formatCatalog';

describe('v1.2.0 import and export surfaces', () => {
  it('puts import and export in the shared editor topbar', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('导图');
    const topbar = host.querySelector('.ymz-topbar')!;
    expect(topbar.querySelector('[data-action="import-file"]')).not.toBeNull();
    expect(topbar.querySelector('[data-action="export-file"]')).not.toBeNull();
    expect(host.querySelector('[data-role="import-file-input"]')).not.toBeNull();
    expect(host.querySelector('[data-role="import-panel"]')).not.toBeNull();
    expect(host.textContent).toContain('恢复可编辑导图');
    expect(host.textContent).toContain('从其他格式导入');
  });

  it('shows full backup and restore only when the web host supplies those capabilities', () => {
    const pluginHost = document.createElement('div');
    pluginHost.innerHTML = createEditorTemplate('导图');
    expect(pluginHost.querySelector<HTMLElement>('[data-export-host-backup]')?.closest('section')?.hidden).toBe(true);
    expect(pluginHost.querySelector<HTMLElement>('[data-import-kind="host-backup"]')?.closest('section')?.hidden).toBe(true);

    const webHost = document.createElement('div');
    webHost.innerHTML = createEditorTemplate('导图', undefined, undefined, undefined, {
      fullBackup: true,
      fullRestore: true,
    });
    expect(webHost.querySelector<HTMLElement>('[data-export-host-backup]')?.closest('section')?.hidden).toBe(false);
    expect(webHost.querySelector<HTMLElement>('[data-import-kind="host-backup"]')?.closest('section')?.hidden).toBe(false);
    expect(webHost.textContent).toContain('.yemind.zip / .yemind.svg');
  });

  it('lists every export format in the requested order', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('导图');
    const buttons = Array.from(host.querySelectorAll<HTMLElement>('[data-export-format]'));
    expect(buttons.map((button) => button.dataset.exportFormat)).toEqual(EXPORT_FORMATS.map((format) => format.id));
    expect(buttons[0].dataset.default).toBe('true');
  });

  it('groups export choices into all, map and text-outline views', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('导图');
    const categories = Array.from(host.querySelectorAll<HTMLElement>('[data-export-category]'));

    expect(categories.map((button) => button.textContent?.trim())).toEqual(['全部', '导图', '文字大纲']);
    expect(categories.map((button) => button.dataset.exportCategory)).toEqual(
      EXPORT_CATEGORIES.map((category) => category.id),
    );
    expect(exportFormatsForCategory('map').some((format) => format.id === 'png')).toBe(true);
    expect(exportFormatsForCategory('map').some((format) => format.id === 'markdown')).toBe(false);
    expect(exportFormatsForCategory('outline').map((format) => format.id)).toEqual([
      'markdown', 'opml', 'text', 'html',
    ]);
  });
});

