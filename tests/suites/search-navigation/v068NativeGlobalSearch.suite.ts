import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectGlobalMapMatches,
  destroyGlobalSearchIntegrations,
  mountGlobalSearchResults,
  renderGlobalSearchPreview,
  resolveGlobalSearchSurface,
} from '../../../src/plugin/globalSearch';

const maps = [{
  id: 'map-1', title: '未命名导图2', createdAt: 1, updatedAt: 1,
  layout: 'logicalStructure', theme: 'yemind-default', lineStyle: 'curve' as const,
  projectStyle: { density: 'default' as const, rainbowLines: null, backgroundColor: null },
  data: { data: { uid: 'root', text: '未命名导图0' }, children: [
    { data: { uid: 'branch', text: '另一个主' }, children: [
      { data: { uid: 'target', text: '目标关键词' }, children: [
        { data: { uid: 'child', text: '后续节点' }, children: [] },
      ] },
    ] },
    { data: { uid: 'sibling', text: '其他主题' }, children: [] },
  ] },
}];

function createRealHost(): { root: HTMLElement; input: HTMLInputElement } {
  const root = document.createElement('div');
  root.innerHTML = readFileSync('tests/fixtures/siyuan-global-search-v3.html', 'utf8');
  document.body.appendChild(root);
  const input = root.querySelector<HTMLInputElement>('#searchInput')!;
  input.value = '目标关键词';
  return { root, input };
}


afterEach(() => {
  destroyGlobalSearchIntegrations();
  document.body.innerHTML = '';
});

describe('v0.6.8 native SiYuan global-search integration', () => {
  it('mounts results inside #searchList and never inside the search input header', () => {
    const { root, input } = createRealHost();
    const surface = resolveGlobalSearchSurface(input)!;
    expect(surface.list.id).toBe('searchList');
    expect(surface.preview.id).toBe('searchPreview');

    mountGlobalSearchResults({ searchElement: input, maps, onOpen: vi.fn() });

    expect(input.parentElement?.querySelector('[data-yemind-global-results]')).toBeNull();
    expect(surface.list.querySelector('[data-yemind-global-results]')).not.toBeNull();
    expect(surface.list.firstElementChild?.hasAttribute('data-yemind-global-results')).toBe(true);
    root.remove();
  });

  it('renders one native-style result per node with content and path metadata', () => {
    const { root, input } = createRealHost();
    mountGlobalSearchResults({ searchElement: input, maps, onOpen: vi.fn() });
    const row = root.querySelector<HTMLElement>('[data-yemind-global-node="target"]')!;
    expect(row.classList.contains('b3-list-item')).toBe(true);
    expect(row.querySelector('.b3-list-item__text')?.textContent).toContain('目标关键词');
    expect(row.querySelector('.b3-list-item__meta')?.textContent).toContain('未命名导图2');
    expect(row.querySelector('.b3-list-item__meta')?.textContent).toContain('另一个主');
    expect(row.querySelector('mark')?.textContent).toBe('目标关键词');
    root.remove();
  });

  it('selects on single click, previews outline context, and opens only on double click', () => {
    const { root, input } = createRealHost();
    const onOpen = vi.fn();
    mountGlobalSearchResults({ searchElement: input, maps, onOpen });
    const row = root.querySelector<HTMLElement>('[data-yemind-global-node="target"]')!;

    row.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    expect(onOpen).not.toHaveBeenCalled();
    expect(row.classList.contains('b3-list-item--focus')).toBe(true);
    const preview = root.querySelector<HTMLElement>('[data-yemind-global-preview]')!;
    expect(preview.textContent).toContain('未命名导图2');
    expect(preview.textContent).toContain('另一个主');
    expect(preview.querySelector('[data-yemind-preview-node="target"]')?.classList.contains('is-current')).toBe(true);

    row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: 0 }));
    expect(onOpen).toHaveBeenCalledWith('map-1', 'target');
    root.remove();
  });

  it('supports Enter and Alt+Enter/Alt+click opening semantics', () => {
    const { root, input } = createRealHost();
    const onOpen = vi.fn();
    mountGlobalSearchResults({ searchElement: input, maps, onOpen });
    const row = root.querySelector<HTMLElement>('[data-yemind-global-node="target"]')!;
    row.click();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onOpen).toHaveBeenNthCalledWith(1, 'map-1', 'target');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', altKey: true, bubbles: true }));
    expect(onOpen).toHaveBeenNthCalledWith(2, 'map-1', 'target', { position: 'right' });

    row.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, altKey: true }));
    expect(onOpen).toHaveBeenNthCalledWith(3, 'map-1', 'target', { position: 'right' });
    root.remove();
  });

  it('restores the native preview when a normal SiYuan result is selected', () => {
    const { root, input } = createRealHost();
    mountGlobalSearchResults({ searchElement: input, maps, onOpen: vi.fn() });
    expect(root.querySelector('#searchPreview')?.classList.contains('ymz-global-preview-active')).toBe(true);
    const native = root.querySelector<HTMLElement>('#searchList [data-type="search-item"]:not([data-yemind-global-result])')!;
    native.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    expect(root.querySelector('[data-yemind-global-preview]')).toBeNull();
    expect(root.querySelector('#searchPreview')?.classList.contains('ymz-global-preview-active')).toBe(false);
    root.remove();
  });

  it('re-renders result contents when the query changes without leaving stale rows', () => {
    const { root, input } = createRealHost();
    mountGlobalSearchResults({ searchElement: input, maps, onOpen: vi.fn() });
    expect(root.querySelector('[data-yemind-global-node="target"]')).not.toBeNull();
    input.value = '其他主题';
    mountGlobalSearchResults({ searchElement: input, maps, onOpen: vi.fn() });
    expect(root.querySelector('[data-yemind-global-node="target"]')).toBeNull();
    expect(root.querySelector('[data-yemind-global-node="sibling"]')).not.toBeNull();
    expect(root.querySelectorAll('[data-yemind-global-results]')).toHaveLength(1);
    root.remove();
  });

  it('moves through YeMind rows with arrows and hands off to the first native row', () => {
    const secondMap = structuredClone(maps[0]!);
    secondMap.id = 'map-2';
    secondMap.title = '第二张导图';
    secondMap.data.children[0]!.children[0]!.data.uid = 'target-2';
    const { root, input } = createRealHost();
    mountGlobalSearchResults({ searchElement: input, maps: [maps[0]!, secondMap], onOpen: vi.fn() });
    const custom = Array.from(root.querySelectorAll<HTMLElement>('[data-yemind-global-result]'));
    expect(custom.length).toBe(2);
    expect(custom[0]!.classList.contains('b3-list-item--focus')).toBe(true);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(custom[1]!.classList.contains('b3-list-item--focus')).toBe(true);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const native = root.querySelector<HTMLElement>('#searchList [data-type="search-item"]:not([data-yemind-global-result])')!;
    expect(native.classList.contains('b3-list-item--focus')).toBe(true);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(custom[1]!.classList.contains('b3-list-item--focus')).toBe(true);
    root.remove();
  });

  it('reinstalls results after the host rebuilds #searchList without duplicating them', async () => {
    const { root, input } = createRealHost();
    mountGlobalSearchResults({ searchElement: input, maps, onOpen: vi.fn() });
    const list = root.querySelector<HTMLElement>('#searchList')!;
    list.innerHTML = '<div data-type="search-item" class="b3-list-item">native rebuilt</div>';
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(list.querySelectorAll('[data-yemind-global-results]')).toHaveLength(1);
    expect(list.querySelectorAll('[data-yemind-global-node="target"]')).toHaveLength(1);
    root.remove();
  });

  it('passes right-split intent through the plugin open pipeline', () => {
    const pluginSource = readFileSync('src/plugin/YeMindPlugin.ts', 'utf8');
    expect(pluginSource).toContain("async openMap(mapId: string, options: { position?: 'right' } = {})");
    expect(pluginSource).toContain('position: options.position');
    expect(pluginSource).toContain('this.openMapAtNode(mapId, nodeUid, openOptions)');
  });

  it('renders a bounded outline preview with the current path and nearby context', () => {
    const match = collectGlobalMapMatches(maps, '目标关键词')[0]!;
    const html = renderGlobalSearchPreview(maps[0]!, match, 200);
    expect(html).toContain('data-yemind-preview-node="root"');
    expect(html).toContain('data-yemind-preview-node="branch"');
    expect(html).toContain('data-yemind-preview-node="target"');
    expect(html).toContain('data-yemind-preview-node="child"');
    expect(html).toContain('其他主题');
    expect(html).toContain('is-current');
  });
});
