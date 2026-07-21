import { describe, expect, it, vi } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import { NodeStylePanel } from '../../../src/ui/nodeStylePanel';

describe('node style panel', () => {
  it('isolates inputs and sends explicit style patches', () => {
    const root = document.createElement('div');
    root.innerHTML = createEditorTemplate('Demo');
    const commands = {
      isReadonly: () => false,
      getActiveNodeStyle: () => ({ fontSize: 18, textAlign: 'center' }),
      setActiveNodeStyle: vi.fn(),
      resetActiveNodeStyle: vi.fn(),
    } as any;
    const panel = new NodeStylePanel(root, commands);
    panel.show();
    const input = root.querySelector<HTMLInputElement>('[data-node-style="fontSize"]')!;
    expect(input.value).toBe('18');
    input.value = '20';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(commands.setActiveNodeStyle).toHaveBeenCalledWith({ fontSize: '20' });
    const keydown = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true });
    const ancestor = vi.fn();
    root.addEventListener('keydown', ancestor);
    input.dispatchEvent(keydown);
    expect(ancestor).not.toHaveBeenCalled();
    panel.destroy();
  });
});
