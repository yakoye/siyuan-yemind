import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  destroyGlobalSearchIntegrations,
  mountGlobalSearchResults,
  resolveGlobalSearchSurface,
} from '../../../src/plugin/globalSearch';

const maps = [{
  id: 'map-exact', title: '未命名导图2', createdAt: 1, updatedAt: 1,
  layout: 'logicalStructure', theme: 'yemind-default', lineStyle: 'curve' as const,
  projectStyle: { density: 'default' as const, rainbowLines: null, backgroundColor: null },
  data: { data: { uid: 'root', text: '未命名导图0' }, children: [
    { data: { uid: 'branch', text: '另一个主' }, children: [
      { data: { uid: 'number-leaf', text: '43214' }, children: [] },
      { data: { uid: 'chinese-leaf', text: '但凡的' }, children: [] },
    ] },
  ] },
}];

function createEmptyNativeHost(query: string): {
  dialog: HTMLElement;
  root: HTMLElement;
  input: HTMLInputElement;
  close: HTMLButtonElement;
} {
  const dialog = document.createElement('div');
  dialog.className = 'b3-dialog__container';
  dialog.innerHTML = `
    <button type="button" class="b3-dialog__close" aria-label="关闭">×</button>
    <div class="fn__flex-column search-shell" style="height:600px;overflow:hidden">
      <div class="block__icons"><span id="searchResult">0 个文档中匹配 0 个块</span></div>
      <div class="b3-form__icon search__header"><input id="searchInput" value="${query}"></div>
      <div class="search__layout">
        <div id="searchList" class="fn__flex-1 search__list b3-list">
          <div data-type="search-item" class="b3-list-item">新建文档 ${query}</div>
        </div>
      </div>
      <div class="search__tips">↑/↓ 导航 Enter 打开 Esc 退出</div>
    </div>`;
  document.body.append(dialog);
  return {
    dialog,
    root: dialog.querySelector<HTMLElement>('.search-shell')!,
    input: dialog.querySelector<HTMLInputElement>('#searchInput')!,
    close: dialog.querySelector<HTMLButtonElement>('.b3-dialog__close')!,
  };
}

afterEach(() => {
  destroyGlobalSearchIntegrations();
  document.body.innerHTML = '';
});

describe('v0.6.9 exact-match preview and navigation', () => {
  it.each([
    ['43214', 'number-leaf'],
    ['但凡的', 'chinese-leaf'],
  ])('keeps a preview for exact leaf match %s when SiYuan has no native result', (query, uid) => {
    const { root, input } = createEmptyNativeHost(query);
    mountGlobalSearchResults({ searchElement: input, maps, onOpen: vi.fn() });

    const surface = resolveGlobalSearchSurface(input)!;
    expect(surface.preview).not.toBeNull();
    expect(surface.preview.classList.contains('ymz-global-preview-active')).toBe(true);
    expect(root.querySelector(`[data-yemind-global-node="${uid}"]`)?.classList.contains('b3-list-item--focus')).toBe(true);
    expect(root.querySelector(`[data-yemind-preview-node="${uid}"]`)?.classList.contains('is-current')).toBe(true);
    expect(root.querySelector('[data-yemind-global-preview]')?.textContent).toContain(query);
  });

  it('recreates the preview host and restores the selected leaf after SiYuan rebuilds an empty result layout', async () => {
    const { root, input } = createEmptyNativeHost('43214');
    mountGlobalSearchResults({ searchElement: input, maps, onOpen: vi.fn() });
    const layout = root.querySelector<HTMLElement>('.search__layout')!;
    layout.innerHTML = `<div id="searchList" class="fn__flex-1 search__list b3-list"><div class="b3-list-item">新建文档 43214</div></div>`;

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(layout.querySelector('[data-yemind-global-results]')).not.toBeNull();
    expect(layout.querySelector('[data-yemind-global-preview]')).not.toBeNull();
    expect(layout.querySelector('[data-yemind-preview-node="number-leaf"]')?.classList.contains('is-current')).toBe(true);
  });


  it('forces a host preview hidden by the empty native state back into the visible split layout', async () => {
    const { root, input } = createEmptyNativeHost('43214');
    const layout = root.querySelector<HTMLElement>('.search__layout')!;
    layout.insertAdjacentHTML('beforeend', '<div class="search__drag"></div><div id="searchPreview" class="fn__flex-1 search__preview fn__none" style="display:none"></div>');
    mountGlobalSearchResults({ searchElement: input, maps, onOpen: vi.fn() });

    const preview = root.querySelector<HTMLElement>('#searchPreview')!;
    expect(preview.classList.contains('fn__none')).toBe(false);
    expect(preview.style.display).not.toBe('none');
    expect(preview.querySelector('[data-yemind-preview-node="number-leaf"]')).not.toBeNull();

    preview.classList.add('fn__none');
    preview.style.display = 'none';
    preview.innerHTML = '';
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(preview.classList.contains('fn__none')).toBe(false);
    expect(preview.style.display).not.toBe('none');
    expect(preview.querySelector('[data-yemind-preview-node="number-leaf"]')).not.toBeNull();
  });

  it('closes the global-search dialog before Enter opens and focuses the selected node', () => {
    const { input, close } = createEmptyNativeHost('43214');
    const order: string[] = [];
    close.addEventListener('click', () => order.push('close'));
    const onOpen = vi.fn(() => order.push('open'));
    mountGlobalSearchResults({ searchElement: input, maps, onOpen });

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    expect(order).toEqual(['close', 'open']);
    expect(onOpen).toHaveBeenCalledWith('map-exact', 'number-leaf');
  });

  it('closes and passes right-side intent for Alt+Enter', () => {
    const { input, close } = createEmptyNativeHost('43214');
    const order: string[] = [];
    close.addEventListener('click', () => order.push('close'));
    const onOpen = vi.fn(() => order.push('open'));
    mountGlobalSearchResults({ searchElement: input, maps, onOpen });

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', altKey: true, bubbles: true, cancelable: true }));

    expect(order).toEqual(['close', 'open']);
    expect(onOpen).toHaveBeenCalledWith('map-exact', 'number-leaf', { position: 'right' });
  });
});
