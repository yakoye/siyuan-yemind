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

/**
 * Keep the existing multi-selection while making the node that opened the
 * context menu the command target (activeNodeList[0]).
 */
export function promoteNodeToPrimary(renderer: any, node: any): boolean {
  const list = Array.isArray(renderer?.activeNodeList) ? renderer.activeNodeList : null;
  if (!list || !node) return false;
  const index = list.indexOf(node);
  if (index <= 0) return false;
  list.splice(index, 1);
  list.unshift(node);
  renderer.emitNodeActiveEvent?.();
  return true;
}

/** Prevent the upstream root-delete shortcut from clearing the complete map. */
export function shouldBlockRootDeleteShortcut(key: string, nodes: any[]): boolean {
  if (key !== 'Backspace' && key !== 'Delete') return false;
  return Array.isArray(nodes) && nodes.some((node) => Boolean(node?.isRoot));
}
