import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../src/editor/editorTemplate';
import { normalizeProjectStyle, resolveProjectAppearance } from '../src/editor/projectStyle';

describe('v0.6.4 whole-map style', () => {
  it('renames the top-level entry to Style and keeps node style distinct', () => {
    const html = createEditorTemplate('Demo');
    expect(html).toContain('data-action="project-style"');
    expect(html).toContain('<span>样式</span>');
    expect(html).toContain('data-role="node-style-panel"');
    expect(html).toContain('<strong>节点样式</strong>');
  });

  it('normalizes density, rainbow and background overrides', () => {
    expect(normalizeProjectStyle({ density: 'compact', rainbowLines: true, backgroundColor: '#8fa1cf' })).toEqual({
      density: 'compact',
      rainbowLines: true,
      backgroundColor: '#8fa1cf',
    });
    expect(normalizeProjectStyle({ density: 'bad', rainbowLines: 'x', backgroundColor: 'red' })).toEqual({
      density: 'default',
      rainbowLines: null,
      backgroundColor: null,
    });
  });

  it('applies density spacing and project overrides over a theme', () => {
    const result = resolveProjectAppearance({
      style: { density: 'comfortable', rainbowLines: true, backgroundColor: '#8fa1cf' },
      themeConfig: { second: { marginX: 100, marginY: 30 }, node: { marginX: 50, marginY: 16 }, backgroundColor: '#fff' },
      rainbow: { open: false, colorsList: ['#111'] },
    });
    expect(result.themeConfig.second).toMatchObject({ marginX: 100, marginY: 30 });
    expect(result.themeConfig.node).toMatchObject({ marginX: 50, marginY: 16 });
    expect(result.themeConfig.backgroundColor).toBe('#8fa1cf');
    expect(result.rainbow.open).toBe(true);
  });
});
