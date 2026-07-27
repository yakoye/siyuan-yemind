import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import { EXPORT_FORMATS } from '../../../src/transfer/formatCatalog';

describe('v1.2.0 import and export surfaces', () => {
  it('puts import and export in the shared editor topbar', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('导图');
    const topbar = host.querySelector('.ymz-topbar')!;
    expect(topbar.querySelector('[data-action="import-file"]')).not.toBeNull();
    expect(topbar.querySelector('[data-action="export-file"]')).not.toBeNull();
    expect(host.querySelector('[data-role="import-file-input"]')).not.toBeNull();
  });

  it('lists every export format in the requested order', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('导图');
    const buttons = Array.from(host.querySelectorAll<HTMLElement>('[data-export-format]'));
    expect(buttons.map((button) => button.dataset.exportFormat)).toEqual(EXPORT_FORMATS.map((format) => format.id));
    expect(buttons[0].dataset.default).toBe('true');
  });
});

