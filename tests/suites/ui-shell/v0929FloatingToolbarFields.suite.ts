import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import { normalizeMapTitle } from '../../../src/editor/mapTitle';
import { parseZoomPercent } from '../../../src/editor/zoomPercent';
import { DEFAULT_SETTINGS } from '../../../src/settings/SettingsStore';

describe('v0.9.29 floating toolbar controls', () => {
  it('provides a persistent pin, editable zoom, and inline title input', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('Demo');
    expect(host.querySelector('[data-action="toggle-toolbar-pin"]')).not.toBeNull();
    expect(host.querySelector<HTMLInputElement>('[data-role="zoom"]')?.tagName).toBe('INPUT');
    expect(host.querySelector<HTMLInputElement>('[data-role="title-input"]')).not.toBeNull();
    expect(typeof DEFAULT_SETTINGS.toolbarsPinned).toBe('boolean');
  });

  it('parses zoom text and clamps to configured limits', () => {
    expect(parseZoomPercent('125%', 20, 400)).toBe(125);
    expect(parseZoomPercent('8', 20, 400)).toBe(20);
    expect(parseZoomPercent('900', 20, 400)).toBe(400);
    expect(parseZoomPercent('bad', 20, 400)).toBeNull();
  });

  it('normalizes blank titles', () => {
    expect(normalizeMapTitle('  New title  ')).toBe('New title');
    expect(normalizeMapTitle('   ')).toBe('未命名导图');
  });
});
