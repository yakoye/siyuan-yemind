import { describe, expect, it } from 'vitest';
import {
  resolveNodeQuickActionAnchorForLayout,
  resolveNodeQuickActionSide,
} from '../../../src/editor/nodeQuickActions';
import { layoutGeometryForPreset } from '../../../src/core/layoutGeometry';

function node(layerIndex: number, dir?: string, isRoot = layerIndex === 0) {
  return {
    layerIndex,
    dir,
    isRoot,
    getData: (key: string) => key === 'dir' || key === 'direction' ? dir : undefined,
  };
}

describe('v1.1.0 quick actions follow every preset geometry', () => {
  it('anchors root, intermediate and leaf controls to the configured outgoing side', () => {
    const cases = [
      ['right-mindmap', 'right'],
      ['left-mindmap', 'left'],
      ['tree-up-symmetric', 'top'],
      ['organization-up', 'top'],
      ['organization-right', 'right'],
      ['timeline-down', 'bottom'],
    ] as const;
    for (const [presetId, expected] of cases) {
      const layout = layoutGeometryForPreset(presetId).engineLayout;
      expect(resolveNodeQuickActionSide(layout, node(0))).toBe(expected);
      expect(resolveNodeQuickActionSide(layout, node(1))).toBe(expected);
      expect(resolveNodeQuickActionSide(layout, node(3))).toBe(expected);
    }
  });

  it('uses the actual branch side for bilateral layouts', () => {
    const mindMap = layoutGeometryForPreset('mindmap').engineLayout;
    expect(resolveNodeQuickActionSide(mindMap, node(1, 'left'))).toBe('left');
    expect(resolveNodeQuickActionSide(mindMap, node(1, 'right'))).toBe('right');
    const fishbone = layoutGeometryForPreset('fishbone-right').engineLayout;
    expect(resolveNodeQuickActionSide(fishbone, node(0))).toBe('left');
    expect(resolveNodeQuickActionSide(fishbone, node(1, 'top'))).toBe('top');
    expect(resolveNodeQuickActionSide(fishbone, node(1, 'bottom'))).toBe('bottom');
    const timeline = layoutGeometryForPreset('timeline-left').engineLayout;
    expect(resolveNodeQuickActionSide(timeline, node(0))).toBe('left');
    expect(resolveNodeQuickActionSide(timeline, node(1))).toBe('bottom');
  });

  it('keeps vertical layout controls on the configured outlet when children spread sideways', () => {
    const layout = layoutGeometryForPreset('tree-up-symmetric').engineLayout;
    const parentRect = { left: 600, top: 400, width: 100, height: 40 };
    const childRects = [
      { left: 420, top: 330, width: 100, height: 40 },
      { left: 660, top: 330, width: 100, height: 40 },
    ];

    expect(resolveNodeQuickActionAnchorForLayout(
      layout,
      node(1),
      parentRect,
      childRects,
    )).toMatchObject({ side: 'top', x: 650, y: 400 });
  });
});
