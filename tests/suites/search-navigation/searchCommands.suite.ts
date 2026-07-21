import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../../../src/core/commands';

describe('search command adapter', () => {
  it('uses the simple-mind-map Search plugin for navigation and replacement', () => {
    const search = {
      searchText: 'PCIe',
      currentIndex: 1,
      matchNodeList: [{}, {}, {}],
      search: vi.fn(),
      jump: vi.fn(),
      replace: vi.fn(),
      replaceAll: vi.fn(),
      endSearch: vi.fn(),
    };
    const map = {
      execCommand: vi.fn(),
      view: { fit: vi.fn(), reset: vi.fn(), enlarge: vi.fn(), narrow: vi.fn() },
      renderer: { activeNodeList: [], toggleActiveExpand: vi.fn(), startTextEdit: vi.fn() },
      search,
    };
    const commands = createCommandAdapter(map as never);

    commands.search('ATS');
    commands.searchNext();
    commands.searchPrevious();
    commands.replaceSearch('IOMMU');
    commands.replaceSearchAll('DMA');
    commands.endSearch();
    commands.goToNode('node-1');

    expect(search.search).toHaveBeenNthCalledWith(1, 'ATS');
    expect(search.search).toHaveBeenNthCalledWith(2, 'PCIe');
    expect(search.jump).toHaveBeenCalledWith(0);
    expect(search.replace).toHaveBeenCalledWith('IOMMU', true);
    expect(search.replaceAll).toHaveBeenCalledWith('DMA');
    expect(search.endSearch).toHaveBeenCalledOnce();
    expect(map.execCommand).toHaveBeenCalledWith('GO_TARGET_NODE', 'node-1');
  });
});
