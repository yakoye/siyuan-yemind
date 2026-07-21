import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../src/editor/editorTemplate';
import { setSearchReplaceExpanded } from '../src/editor/searchPanelState';

describe('v0.6.4 search disclosure interaction', () => {
  it('round-trips between find-only and replace mode without rebuilding inputs', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('Demo');
    const panel = host.querySelector<HTMLElement>('[data-role="search-panel"]')!;
    const find = panel.querySelector<HTMLInputElement>('[data-role="search-input"]')!;
    const replace = panel.querySelector<HTMLElement>('[data-role="replace-row"]')!;
    const toggle = panel.querySelector<HTMLElement>('[data-search-action="toggle-replace"]')!;

    setSearchReplaceExpanded(panel, true);
    expect(panel.dataset.replaceExpanded).toBe('true');
    expect(replace.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel.querySelector('[data-role="search-input"]')).toBe(find);

    setSearchReplaceExpanded(panel, false);
    expect(panel.dataset.replaceExpanded).toBe('false');
    expect(replace.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel.querySelector('[data-role="search-input"]')).toBe(find);
  });
});
