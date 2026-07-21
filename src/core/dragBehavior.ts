import type { MindMapTree } from '../model/types';
import type { YeMindSettings } from '../settings/SettingsStore';

export interface PersistedViewData {
  transform: {
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
    [key: string]: unknown;
  };
  state: {
    scale: number;
    x: number;
    y: number;
    sx: number;
    sy: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface DragAndLayoutOptions {
  autoMoveWhenMouseInEdgeOnDrag: boolean;
  isLimitMindMapInCanvas: boolean;
  minZoomRatio: number;
  maxZoomRatio: number;
  fitPadding: number;
  themeConfig: {
    second: { marginX: number; marginY: number };
    node: { marginX: number; marginY: number };
    generalization: { marginX: number; marginY: number };
  };
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const MAX_SAVED_TRANSLATE = 50_000;

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function normalizePersistedViewData(value: unknown): PersistedViewData | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<PersistedViewData>;
  const state = candidate.state;
  const transform = candidate.transform;
  if (!state || !transform) return undefined;

  const stateValues = [state.scale, state.x, state.y, state.sx, state.sy];
  const transformValues = [transform.scaleX, transform.scaleY, transform.translateX, transform.translateY];
  if (![...stateValues, ...transformValues].every(finite)) return undefined;
  if (state.scale < 0.05 || state.scale > 10) return undefined;
  if (transform.scaleX < 0.05 || transform.scaleX > 10 || transform.scaleY < 0.05 || transform.scaleY > 10) return undefined;
  if (Math.abs(state.x) > MAX_SAVED_TRANSLATE || Math.abs(state.y) > MAX_SAVED_TRANSLATE) return undefined;
  if (Math.abs(transform.translateX) > MAX_SAVED_TRANSLATE || Math.abs(transform.translateY) > MAX_SAVED_TRANSLATE) return undefined;
  return clone(candidate as PersistedViewData);
}

export function stripCustomPositions(tree: MindMapTree): { tree: MindMapTree; changed: boolean } {
  let changed = false;
  const walk = (node: MindMapTree): MindMapTree => {
    const data = { ...node.data };
    if (Object.prototype.hasOwnProperty.call(data, 'customLeft')) {
      delete data.customLeft;
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'customTop')) {
      delete data.customTop;
      changed = true;
    }
    return {
      data,
      children: (node.children ?? []).map(walk),
    };
  };
  return { tree: walk(tree), changed };
}

export function buildDragAndLayoutOptions(settings: YeMindSettings): DragAndLayoutOptions {
  return {
    autoMoveWhenMouseInEdgeOnDrag: settings.dragEdgeAutoPan,
    isLimitMindMapInCanvas: settings.limitMindMapInCanvas,
    minZoomRatio: settings.minZoomRatio,
    maxZoomRatio: settings.maxZoomRatio,
    fitPadding: settings.fitPadding,
    themeConfig: {
      second: {
        marginX: settings.secondLevelMarginX,
        marginY: settings.secondLevelMarginY,
      },
      node: {
        marginX: settings.nodeMarginX,
        marginY: settings.nodeMarginY,
      },
      generalization: {
        marginX: settings.secondLevelMarginX,
        marginY: settings.secondLevelMarginY,
      },
    },
  };
}
