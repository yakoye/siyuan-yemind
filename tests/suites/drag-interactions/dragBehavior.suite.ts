import { describe, expect, it } from 'vitest';
import {
  buildDragAndLayoutOptions,
  normalizePersistedViewData,
  stripCustomPositions,
} from '../../../src/core/dragBehavior';
import { DEFAULT_SETTINGS } from '../../../src/settings/SettingsStore';

describe('drag behavior', () => {
  it('uses structured drag and disables edge auto-pan by default', () => {
    const options = buildDragAndLayoutOptions(DEFAULT_SETTINGS);
    expect(options).not.toHaveProperty('enableFreeDrag');
    expect(options.autoMoveWhenMouseInEdgeOnDrag).toBe(false);
    expect(options.isLimitMindMapInCanvas).toBe(false);
  });

  it('maps spacing settings into simple-mind-map theme margins', () => {
    const options = buildDragAndLayoutOptions({
      ...DEFAULT_SETTINGS,
      secondLevelMarginX: 120,
      secondLevelMarginY: 36,
      nodeMarginX: 64,
      nodeMarginY: 18,
    });
    expect(options.themeConfig).toMatchObject({
      second: { marginX: 120, marginY: 36 },
      node: { marginX: 64, marginY: 18 },
    });
  });

  it('removes legacy free-drag coordinates recursively without changing hierarchy', () => {
    const source = {
      data: { text: 'Root', customLeft: 10, customTop: 20 },
      children: [{
        data: { text: 'Child', customLeft: 30, customTop: 40 },
        children: [{ data: { text: 'Leaf' }, children: [] }],
      }],
    };
    const result = stripCustomPositions(source);
    expect(result.changed).toBe(true);
    expect(result.tree).toEqual({
      data: { text: 'Root' },
      children: [{
        data: { text: 'Child' },
        children: [{ data: { text: 'Leaf' }, children: [] }],
      }],
    });
    expect(source.data.customLeft).toBe(10);
  });

  it('rejects malformed and extreme persisted view data', () => {
    expect(normalizePersistedViewData(null)).toBeUndefined();
    expect(normalizePersistedViewData({ state: { scale: 1 }, transform: {} })).toBeUndefined();
    expect(normalizePersistedViewData({
      state: { scale: 1, x: 999999, y: 0, sx: 0, sy: 0 },
      transform: { scaleX: 1, scaleY: 1, translateX: 999999, translateY: 0 },
    })).toBeUndefined();
  });

  it('accepts a finite bounded persisted view transform', () => {
    const view = {
      state: { scale: 1.25, x: 120, y: -80, sx: 0, sy: 0 },
      transform: { scaleX: 1.25, scaleY: 1.25, translateX: 120, translateY: -80 },
    };
    expect(normalizePersistedViewData(view)).toEqual(view);
  });
});
