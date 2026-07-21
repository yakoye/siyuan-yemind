import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../src/editor/editorTemplate';

function surface(html: string, selector: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.querySelector<HTMLElement>(selector)!;
}

describe('v0.6.1 toolbar consolidation', () => {
  it('keeps only the requested actions in the top toolbar', () => {
    const top = surface(createEditorTemplate('未命名导图'), '.ymz-topbar');
    expect(top.querySelector('[data-action="open-search"]')).not.toBeNull();
    expect(top.querySelector('[data-action="layout"]')).not.toBeNull();
    expect(top.querySelector('[data-action="theme"]')).not.toBeNull();
    expect(top.querySelector('[data-action="line-style"]')).not.toBeNull();
    expect(top.textContent).toContain('线型');
    expect(top.querySelector('[data-action="node-style"]')).not.toBeNull();
    expect(top.textContent).toContain('节点样式');

    for (const action of ['add-child', 'add-sibling', 'checkpoints', 'undo', 'redo']) {
      expect(top.querySelector(`[data-action="${action}"]`)).toBeNull();
    }
  });

  it('moves history to the left toolbar and leaves fit only in the bottom toolbar', () => {
    const html = createEditorTemplate('未命名导图');
    const left = surface(html, '.ymz-leftbar');
    const bottom = surface(html, '.ymz-statusbar');

    expect(left.querySelector('[data-action="checkpoints"]')).not.toBeNull();
    expect(left.querySelector('[data-action="checkpoints"] svg')).not.toBeNull();
    expect(left.querySelector('[data-action="fit"]')).toBeNull();
    expect(left.querySelector('[data-action="reset"]')).toBeNull();
    expect(left.querySelector('[data-action="undo"]')).not.toBeNull();
    expect(left.querySelector('[data-action="redo"]')).not.toBeNull();

    expect(bottom.querySelector('[data-action="fit"]')).not.toBeNull();
    expect(bottom.querySelector('[data-action="open-search"]')).toBeNull();
  });
});
