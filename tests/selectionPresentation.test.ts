import { describe, expect, it } from 'vitest';
import { createSelectionPresentation } from '../src/editor/selectionPresentation';

describe('selection presentation', () => {
  it('describes pan-priority behavior without showing a count for zero selection', () => {
    expect(createSelectionPresentation(0, 'pan')).toEqual({
      count: 0,
      isMultiple: false,
      countText: '',
      modeLabel: '平移优先',
      modeTitle: '平移优先：左键拖动画布；Ctrl/Cmd + 左键框选',
    });
  });

  it('shows the active count only for multi-selection', () => {
    expect(createSelectionPresentation(1, 'select')).toMatchObject({
      count: 1,
      isMultiple: false,
      countText: '',
    });
    expect(createSelectionPresentation(3, 'select')).toMatchObject({
      count: 3,
      isMultiple: true,
      countText: '已选 3',
      modeLabel: '选择优先',
      modeTitle: '选择优先：左键框选；右键拖动画布',
    });
  });

  it('normalizes invalid counts', () => {
    expect(createSelectionPresentation(-2, 'pan').count).toBe(0);
    expect(createSelectionPresentation(Number.NaN, 'pan').count).toBe(0);
  });
});
