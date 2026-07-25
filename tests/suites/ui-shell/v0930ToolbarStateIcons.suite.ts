import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import { lockIcon, pinIcon } from '../../../src/editor/projectControls';
import { DEFAULT_SETTINGS } from '../../../src/settings/SettingsStore';

describe('v0.9.30 toolbar state icons', () => {
  it('pins all floating toolbars by default and places the pin after zen', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('Demo');
    const zen = host.querySelector('[data-action="zen"]')!;
    expect(zen.nextElementSibling?.getAttribute('data-action')).toBe('toggle-toolbar-pin');
    expect(DEFAULT_SETTINGS.toolbarsPinned).toBe(true);
    const root = host.querySelector<HTMLElement>('.ymz-editor')!;
    expect(root.dataset.toolbarsPinned).toBe('true');
    expect(root.dataset.leftbarVisible).toBe('true');
  });

  it('uses distinct vertical/diagonal pin and locked/unlocked icons', () => {
    expect(pinIcon(true)).toContain('ymz-icon-pin--fixed');
    expect(pinIcon(false)).toContain('ymz-icon-pin--auto');
    expect(lockIcon(true)).toContain('ymz-icon-lock--closed');
    expect(lockIcon(false)).toContain('ymz-icon-lock--open');
  });
});
