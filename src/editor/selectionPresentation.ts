import type { CanvasMode } from '../settings/SettingsStore';

export interface SelectionPresentation {
  count: number;
  isMultiple: boolean;
  countText: string;
  modeLabel: string;
  modeTitle: string;
}

export function createSelectionPresentation(rawCount: number, mode: CanvasMode): SelectionPresentation {
  const count = Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 0;
  const isSelectMode = mode === 'select';
  return {
    count,
    isMultiple: count > 1,
    countText: count > 1 ? `已选 ${count}` : '',
    modeLabel: isSelectMode ? '选择优先' : '平移优先',
    modeTitle: isSelectMode
      ? '选择优先：左键框选；右键拖动画布'
      : '平移优先：左键拖动画布；Ctrl/Cmd + 左键框选',
  };
}
