import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';

describe('v0.6.4 find and replace panel', () => {
  it('opens in find-only mode and reveals replace controls from the disclosure button', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('Demo');
    const panel = host.querySelector<HTMLElement>('[data-role="search-panel"]')!;
    expect(panel.dataset.replaceExpanded).toBe('false');
    expect(panel.querySelector('[data-search-action="toggle-replace"]')).not.toBeNull();
    expect(panel.querySelector('[data-role="replace-row"]')).not.toBeNull();
    expect(panel.querySelector('[data-role="replace-row"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('uses find and replace labels matching the host search language', () => {
    const html = createEditorTemplate('Demo');
    expect(html).toContain('placeholder="查找"');
    expect(html).toContain('placeholder="替换"');
    expect(html).toContain('data-search-action="replace-all"');
  });
});
