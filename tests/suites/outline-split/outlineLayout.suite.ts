import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';

describe('outline layout', () => {
  it('places the outline after the canvas so split view renders it on the right', () => {
    const html = createEditorTemplate('Map');
    expect(html.indexOf('data-role="canvas"')).toBeLessThan(html.indexOf('data-role="outline"'));
  });
  it('provides one unified structured outline document without mode switching', () => {
    const html = createEditorTemplate('Map');
    expect(html).toContain('data-role="outline-tree"');
    expect(html).toContain('ymz-structured-outline');
    expect(html).not.toContain('data-outline-mode-button');
    expect(html).not.toContain('data-role="outline-text-editor"');
    expect((html.match(/data-role="outline-tree"/g) ?? []).length).toBe(1);
  });

});
