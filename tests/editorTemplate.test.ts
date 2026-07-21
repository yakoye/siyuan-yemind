import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../src/editor/editorTemplate';

describe('editor template v0.5 controls', () => {
  it('contains map, split, outline and search/replace surfaces', () => {
    const html = createEditorTemplate('Demo');
    expect(html).toContain('data-action="view-map"');
    expect(html).toContain('data-action="view-split"');
    expect(html).toContain('data-action="view-outline"');
    expect(html).toContain('data-action="open-search"');
    expect(html).toContain('data-role="search-panel"');
    expect(html).toContain('data-search-action="replace-all"');
    expect(html).toContain('data-role="outline"');
    expect(html).toContain('data-action="reset-layout"');
  });
});
