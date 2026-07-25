import { describe, expect, it } from 'vitest';
import {
  directChildCount,
  resolveQuickActionAnchor,
  quickActionSideForLayout,
} from '../../../src/editor/nodeQuickActions';

describe('v0.9.29 quick action geometry and semantics', () => {
  it('counts only direct children', () => {
    const node = {
      nodeData: {
        children: [
          { data: { uid: 'a' }, children: [{ data: { uid: 'a1' }, children: [] }] },
          { data: { uid: 'b' }, children: [] },
        ],
      },
    };
    expect(directChildCount(node)).toBe(2);
  });

  it('uses the layout direction when a collapsed root has no measurable children', () => {
    expect(quickActionSideForLayout('logicalStructureLeft')).toBe('left');
    expect(quickActionSideForLayout('organizationStructure')).toBe('bottom');
    expect(quickActionSideForLayout('catalogOrganization')).toBe('bottom');
    expect(quickActionSideForLayout('mindMap')).toBe('right');
  });

  it('anchors controls on the actual child connection side', () => {
    const node = { left: 100, top: 100, width: 80, height: 40 };
    expect(resolveQuickActionAnchor(node, [{ left: 240, top: 105, width: 80, height: 40 }])).toMatchObject({ side: 'right', x: 180, y: 120 });
    expect(resolveQuickActionAnchor(node, [{ left: -40, top: 105, width: 80, height: 40 }])).toMatchObject({ side: 'left', x: 100, y: 120 });
    expect(resolveQuickActionAnchor(node, [{ left: 105, top: 220, width: 80, height: 40 }])).toMatchObject({ side: 'bottom', x: 140, y: 140 });
    expect(resolveQuickActionAnchor(node, [{ left: 105, top: 0, width: 80, height: 40 }])).toMatchObject({ side: 'top', x: 140, y: 100 });
  });
});
