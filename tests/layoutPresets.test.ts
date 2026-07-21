import { describe, expect, it } from 'vitest';
import { YEMIND_LAYOUT_PRESETS, layoutOptionsHtml, normalizeLayoutId } from '../src/core/layoutPresets';

describe('official-aligned layout presets', () => {
  it('exposes all layouts supported by the installed simple-mind-map runtime', () => {
    expect(YEMIND_LAYOUT_PRESETS.map((item) => item.id)).toEqual(expect.arrayContaining([
      'logicalStructure',
      'logicalStructureLeft',
      'mindMap',
      'organizationStructure',
      'catalogOrganization',
      'timeline',
      'timeline2',
      'verticalTimeline',
      'verticalTimeline2',
      'verticalTimeline3',
      'fishbone',
      'fishbone2',
      'rightFishbone',
      'rightFishbone2',
    ]));
  });

  it('falls back to right logical structure and marks the active layout', () => {
    expect(normalizeLayoutId('unknown')).toBe('logicalStructure');
    const html = layoutOptionsHtml('timeline2');
    expect(html).toContain('value="timeline2" selected');
    expect(html).toContain('双向时间轴');
  });
});
