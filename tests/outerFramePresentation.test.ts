import { describe, expect, it } from 'vitest';
import { createOuterFramePresentation } from '../src/editor/outerFramePresentation';
import { createEditorTemplate } from '../src/editor/editorTemplate';

describe('native outer-frame presentation', () => {
  it('hides the toolbar without an active native frame', () => {
    expect(createOuterFramePresentation({ activeStyle: null, readonly: false })).toEqual({
      hidden: true,
      readonly: false,
      hint: '',
      strokeColor: '#0984e3',
      fill: '#0984e3',
      strokeDasharray: '5,5',
      textAlign: 'left',
    });
  });

  it('normalizes native style state and marks readonly presentation', () => {
    expect(createOuterFramePresentation({
      readonly: true,
      activeStyle: {
        text: '重点范围',
        strokeColor: '#ff0000',
        fill: 'rgba(0, 255, 0, 0.2)',
        strokeDasharray: 'none',
        textAlign: 'center',
      },
    })).toEqual({
      hidden: false,
      readonly: true,
      hint: '外框已选中 · 重点范围',
      strokeColor: '#ff0000',
      fill: '#00ff00',
      strokeDasharray: 'none',
      textAlign: 'center',
    });
  });

  it('renders one compact toolbar with native edit, style, alignment, and delete actions', () => {
    const html = createEditorTemplate('Map');
    expect(html).toContain('data-role="outer-frame-panel"');
    expect(html).toContain('data-outer-frame-action="edit"');
    expect(html).toContain('data-outer-frame-setting="strokeColor"');
    expect(html).toContain('data-outer-frame-setting="fill"');
    expect(html).toContain('data-outer-frame-setting="strokeDasharray"');
    expect(html).toContain('data-outer-frame-setting="textAlign"');
    expect(html).toContain('data-outer-frame-action="delete"');
  });
});
