import { describe, expect, it } from 'vitest';
import { DEFAULT_SPLIT_OUTLINE_RATIO, ratioFromPointer, normalizeSplitOutlineRatio } from '../../../src/editor/splitPane';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';

describe('official-style split pane', () => {
  it('renders a keyboard-accessible divider between canvas and outline', () => {
    const html = createEditorTemplate('Map');
    const canvas = html.indexOf('data-role="canvas"');
    const divider = html.indexOf('data-role="split-divider"');
    const outline = html.indexOf('data-role="outline"');
    expect(canvas).toBeLessThan(divider);
    expect(divider).toBeLessThan(outline);
    expect(html).toContain('role="separator"');
  });

  it('normalizes persisted ratios and maps pointer positions to outline width', () => {
    expect(normalizeSplitOutlineRatio(undefined)).toBe(DEFAULT_SPLIT_OUTLINE_RATIO);
    expect(normalizeSplitOutlineRatio(0.1)).toBe(0.25);
    expect(normalizeSplitOutlineRatio(0.9)).toBe(0.7);
    expect(ratioFromPointer({ left: 100, width: 1000 }, 680)).toBeCloseTo(0.42);
  });
});
