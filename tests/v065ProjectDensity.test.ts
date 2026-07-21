import { describe, expect, it, vi } from 'vitest';
import { createEditorTemplate } from '../src/editor/editorTemplate';
import { densitySpacing, normalizeProjectStyle, resolveProjectAppearance } from '../src/editor/projectStyle';
import { ProjectStylePanel } from '../src/ui/projectStylePanel';

describe('v0.6.5 whole-map density semantics', () => {
  it('keeps explicit preset spacing stable as later releases remap labels', () => {
    expect(densitySpacing('compact')).toEqual({
      second: { marginX: 30, marginY: 2 },
      node: { marginX: 30, marginY: 2 },
    });
    expect(densitySpacing('default')).toEqual({
      second: { marginX: 60, marginY: 14 },
      node: { marginX: 28, marginY: 6 },
    });
    expect(densitySpacing('comfortable')).toEqual({
      second: { marginX: 82, marginY: 22 },
      node: { marginX: 42, marginY: 11 },
    });
  });

  it('normalizes and applies explicit horizontal and vertical spacing', () => {
    const style = normalizeProjectStyle({ density: 'custom', customMarginX: 36, customMarginY: 8 });
    expect(style).toMatchObject({ density: 'custom', customMarginX: 36, customMarginY: 8 });
    const result = resolveProjectAppearance({
      style,
      themeConfig: { second: { marginX: 100, marginY: 38 }, node: { marginX: 54, marginY: 12 } },
      rainbow: { open: false, colorsList: [] },
    });
    expect(result.themeConfig.second).toMatchObject({ marginX: 36, marginY: 8 });
    expect(result.themeConfig.node).toMatchObject({ marginX: 36, marginY: 8 });
  });

  it('renders custom spacing inputs and closes only when clicking outside', () => {
    const root = document.createElement('div');
    root.innerHTML = createEditorTemplate('Demo');
    document.body.appendChild(root);
    const onChange = vi.fn();
    const panel = new ProjectStylePanel(root, { density: 'default', rainbowLines: null, backgroundColor: null }, () => false, onChange);
    panel.show();
    const surface = root.querySelector<HTMLElement>('[data-role="project-style-panel"]')!;
    expect(surface.querySelector('[data-project-spacing="horizontal"]')).not.toBeNull();
    surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(surface.hidden).toBe(false);
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(surface.hidden).toBe(true);
    panel.destroy();
    root.remove();
  });
});
