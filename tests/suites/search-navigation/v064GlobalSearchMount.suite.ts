import { describe, expect, it, vi } from 'vitest';
import { mountGlobalSearchResults } from '../../../src/plugin/globalSearch';

const maps = [{
  id: 'm1', title: 'PCIe 学习', createdAt: 1, updatedAt: 1,
  layout: 'logicalStructure', theme: 'yemind-default', lineStyle: 'curve' as const,
  projectStyle: { density: 'default' as const, rainbowLines: null, backgroundColor: null },
  data: { data: { uid: 'root', text: 'PCIe Root' }, children: [
    { data: { uid: 'ats', text: 'ATS', yemindNote: { html: '<p>地址转换服务</p>', createdAt: 1, updatedAt: 1 }, yemindComments: [{ id: 'c1', text: '需要测试缓存失效', createdAt: 1, updatedAt: 1 }] }, children: [] },
  ] },
}];

describe('v0.6.4 host global-search mounting', () => {
  it('searches notes and comments and opens the matching map node', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="search__layout"><input value="缓存失效"></div>';
    document.body.appendChild(root);
    const input = root.querySelector('input')!;
    const onOpen = vi.fn();
    mountGlobalSearchResults({ searchElement: input, maps, onOpen });
    const result = root.querySelector<HTMLButtonElement>('[data-yemind-global-node="ats"]')!;
    expect(result.textContent).toContain('批注');
    expect(result.textContent).toContain('需要测试缓存失效');
    result.click();
    expect(onOpen).not.toHaveBeenCalled();
    result.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: 0 }));
    expect(onOpen).toHaveBeenCalledWith('m1', 'ats');
    root.remove();
  });

  it('removes stale YeMind results when the next query has no matches', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="search__layout"><input value="ATS"></div>';
    document.body.appendChild(root);
    const input = root.querySelector('input')!;
    mountGlobalSearchResults({ searchElement: input, maps, onOpen: vi.fn() });
    expect(root.querySelector('[data-yemind-global-results]')).not.toBeNull();
    input.value = 'not-found';
    mountGlobalSearchResults({ searchElement: input, maps, onOpen: vi.fn() });
    expect(root.querySelector('[data-yemind-global-results]')).toBeNull();
    root.remove();
  });
});
