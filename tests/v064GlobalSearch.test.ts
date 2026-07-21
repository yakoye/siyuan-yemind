import { describe, expect, it } from 'vitest';
import { collectGlobalMapMatches, renderGlobalSearchResults } from '../src/plugin/globalSearch';

describe('v0.6.4 SiYuan global search integration', () => {
  const maps = [{
    id: 'm1', title: 'PCIe 学习', createdAt: 1, updatedAt: 1,
    layout: 'logicalStructure', theme: 'kmind-default', lineStyle: 'curve' as const,
    data: { data: { uid: 'root', text: 'PCIe Root' }, children: [
      { data: { uid: 'ats', text: '<b>ATS 地址转换服务</b>', richText: true }, children: [] },
    ] },
  }];

  it('finds map titles and node text from plugin storage', () => {
    expect(collectGlobalMapMatches(maps, 'ATS')).toEqual([
      expect.objectContaining({ mapId: 'm1', nodeUid: 'ats', mapTitle: 'PCIe 学习', text: 'ATS 地址转换服务' }),
    ]);
    expect(collectGlobalMapMatches(maps, 'PCIe').length).toBeGreaterThanOrEqual(1);
  });

  it('renders clickable YeMind results for the host search surface', () => {
    const html = renderGlobalSearchResults(collectGlobalMapMatches(maps, 'ATS'));
    expect(html).toContain('data-yemind-global-map="m1"');
    expect(html).toContain('data-yemind-global-node="ats"');
    expect(html).toContain('YeMind Zen');
  });
});
