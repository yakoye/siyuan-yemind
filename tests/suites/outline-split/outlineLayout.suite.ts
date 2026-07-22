import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';

describe('outline layout', () => {
  it('places the outline after the canvas so split view renders it on the right', () => {
    const html = createEditorTemplate('Map');
    expect(html.indexOf('data-role="canvas"')).toBeLessThan(html.indexOf('data-role="outline"'));
  });
  it('provides one continuous text editor alongside the legacy node tree editor', () => {
    const html = createEditorTemplate('Map');
    expect(html).toContain('data-outline-mode-button="text"');
    expect(html).toContain('data-outline-mode-button="tree"');
    expect(html).toContain('data-role="outline-tree"');
    expect(html).toContain('data-role="outline-text-editor"');
    expect((html.match(/data-role="outline-text-editor"/g) ?? []).length).toBe(1);
  });

});
