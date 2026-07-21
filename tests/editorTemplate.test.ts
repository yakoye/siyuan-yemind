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
    expect(html).toContain('data-action="fit"');
    expect(html).toContain('data-action="checkpoints"');
    expect(html).toContain('data-action="zoom-in"');
    expect(html).toContain('data-action="zoom-out"');
    expect(html).toContain('data-action="readonly"');
    expect(html).toContain('data-action="zen"');
    expect(html).toContain('data-action="fullscreen"');
    expect(html).toContain('data-action="layout"');
    expect(html).toContain('data-action="theme"');
    expect(html).toContain('data-action="line-style"');
    expect(html).toContain('data-action="node-style"');
    expect(html).not.toContain('data-action="remove"');
    expect(html).toContain('data-project-control="layout"');
    expect(html).toContain('data-project-control="theme"');
    expect(html).toContain('data-project-control="line-style"');
    expect(html).toContain('data-role="node-style-panel"');
  });
});
