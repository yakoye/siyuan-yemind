import { describe, expect, it } from 'vitest';
import { resolveNodeQuickActionSide } from '../../../src/editor/nodeQuickActions';

function node(layerIndex: number, dir?: string) {
  return { layerIndex, dir, getData: (key: string) => key === 'direction' || key === 'dir' ? dir : undefined };
}

describe('v0.9.30 branch control placement', () => {
  it('follows the outgoing child connector for logic and bilateral mind-map layouts', () => {
    expect(resolveNodeQuickActionSide('logicalStructure', node(2))).toBe('right');
    expect(resolveNodeQuickActionSide('logicalStructureLeft', node(2))).toBe('left');
    expect(resolveNodeQuickActionSide('mindMap', node(1, 'left'))).toBe('left');
    expect(resolveNodeQuickActionSide('mindMap', node(1, 'right'))).toBe('right');
  });

  it('prefers rendered child geometry because the control belongs at the real outgoing connector', () => {
    const parent = { left: 100, top: 100, width: 80, height: 40 };
    expect(resolveNodeQuickActionSide('logicalStructure', node(1), parent, [{ left: 20, top: 100, width: 40, height: 30 }])).toBe('left');
    expect(resolveNodeQuickActionSide('logicalStructureLeft', node(1), parent, [{ left: 220, top: 100, width: 40, height: 30 }])).toBe('right');
    expect(resolveNodeQuickActionSide('organizationStructure', node(1), parent, [{ left: 110, top: 20, width: 40, height: 30 }])).toBe('top');
  });

  it('uses layout growth direction when child geometry is unavailable', () => {
    expect(resolveNodeQuickActionSide('organizationStructure', node(1))).toBe('bottom');
    expect(resolveNodeQuickActionSide('catalogOrganization', node(2))).toBe('bottom');
    expect(resolveNodeQuickActionSide('timeline', node(0))).toBe('right');
    expect(resolveNodeQuickActionSide('timeline', node(1))).toBe('bottom');
    expect(resolveNodeQuickActionSide('timeline2', node(1, 'top'))).toBe('top');
    expect(resolveNodeQuickActionSide('verticalTimeline', node(0))).toBe('bottom');
    expect(resolveNodeQuickActionSide('verticalTimeline', node(2, 'left'))).toBe('left');
    expect(resolveNodeQuickActionSide('fishbone', node(0))).toBe('right');
    expect(resolveNodeQuickActionSide('fishbone', node(1, 'top'))).toBe('top');
    expect(resolveNodeQuickActionSide('rightFishbone', node(0))).toBe('left');
  });
});
