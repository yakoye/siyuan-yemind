import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';

describe('outline layout', () => {
  it('places the outline after the canvas so split view renders it on the right', () => {
    const html = createEditorTemplate('Map');
    expect(html.indexOf('data-role="canvas"')).toBeLessThan(html.indexOf('data-role="outline"'));
  });
});
