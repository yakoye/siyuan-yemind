import { describe, expect, it, vi } from 'vitest';
import { createEditorTemplate } from '../src/editor/editorTemplate';
import { COLOR_SWATCHES } from '../src/editor/colorPalette';
import { NodeStylePanel } from '../src/ui/nodeStylePanel';

describe('v0.6.5 node-style color controls', () => {
  it('uses the shared rich-text palette instead of bare color inputs', () => {
    const html = createEditorTemplate('Demo');
    expect(html).toContain('data-node-color-trigger="fillColor"');
    expect(html).toContain('data-node-color-trigger="borderColor"');
    expect(html).toContain('data-node-color-trigger="color"');
    expect(COLOR_SWATCHES).toHaveLength(52);
  });

  it('applies a palette swatch and reset through native node style commands', () => {
    const root = document.createElement('div');
    root.innerHTML = createEditorTemplate('Demo');
    document.body.appendChild(root);
    const commands = {
      getActiveNodeStyle: vi.fn(() => ({ fillColor: '#ffffff' })),
      setActiveNodeStyle: vi.fn(),
      resetActiveNodeStyle: vi.fn(),
      isReadonly: vi.fn(() => false),
    } as any;
    const panel = new NodeStylePanel(root, commands);
    panel.show();
    root.querySelector<HTMLButtonElement>('[data-node-color-trigger="fillColor"]')!.click();
    const popover = root.querySelector<HTMLElement>('.ymz-node-color-popover')!;
    expect(popover.hidden).toBe(false);
    popover.querySelector<HTMLButtonElement>('[data-color-value="#ff4d3d"]')!.click();
    expect(commands.setActiveNodeStyle).toHaveBeenCalledWith({ fillColor: '#ff4d3d' });
    root.querySelector<HTMLButtonElement>('[data-node-color-trigger="fillColor"]')!.click();
    popover.querySelector<HTMLButtonElement>('[data-color-action="reset"]')!.click();
    expect(commands.setActiveNodeStyle).toHaveBeenCalledWith({ fillColor: null });
    panel.destroy();
    root.remove();
  });
});
