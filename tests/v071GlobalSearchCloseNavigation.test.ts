import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  closeGlobalSearchSurface,
  destroyGlobalSearchIntegrations,
  mountGlobalSearchResults,
} from '../src/plugin/globalSearch';

const maps = [{
  id: 'map-close', title: '搜索测试导图', createdAt: 1, updatedAt: 1,
  layout: 'logicalStructure', theme: 'kmind-default', lineStyle: 'curve' as const,
  projectStyle: { density: 'default' as const, rainbowLines: null, backgroundColor: null },
  data: { data: { uid: 'root', text: 'Root' }, children: [
    { data: { uid: 'target', text: '43214' }, children: [] },
  ] },
}];

function createSvgCloseHost(): { input: HTMLInputElement; dialog: HTMLElement; closeSvg: SVGElement } {
  const dialog = document.createElement('div');
  dialog.className = 'b3-dialog__container';
  dialog.innerHTML = `
    <span class="search-dialog-close">
      <svg class="b3-dialog__close" data-type="close"><use href="#iconClose"></use></svg>
    </span>
    <div class="fn__flex-column search-shell">
      <div class="block__icons"><span id="searchResult">0 个文档中匹配 0 个块</span></div>
      <div class="search__header"><input id="searchInput" value="43214"></div>
      <div class="search__layout">
        <div id="searchList" class="search__list b3-list"><div class="b3-list-item">新建文档 43214</div></div>
      </div>
    </div>`;
  document.body.append(dialog);
  return {
    input: dialog.querySelector<HTMLInputElement>('#searchInput')!,
    dialog,
    closeSvg: dialog.querySelector<SVGElement>('.b3-dialog__close')!,
  };
}

afterEach(() => {
  destroyGlobalSearchIntegrations();
  document.body.innerHTML = '';
});

describe('v0.7.1 global-search close and navigation adapter', () => {
  it('closes through an SVG close icon without assuming a .click() method', () => {
    const { input, dialog } = createSvgCloseHost();
    let closed = false;
    dialog.querySelector('.search-dialog-close')?.addEventListener('click', () => { closed = true; });
    Object.defineProperty(dialog.querySelector('.b3-dialog__close')!, 'click', { configurable: true, value: 'not-a-function' });

    expect(() => closeGlobalSearchSurface(input)).not.toThrow();
    expect(closed).toBe(true);
  });

  it('does not let a close-control failure block Enter navigation', () => {
    const { input, closeSvg } = createSvgCloseHost();
    Object.defineProperty(closeSvg, 'click', { configurable: true, value: 'not-a-function' });
    const onOpen = vi.fn();
    mountGlobalSearchResults({ searchElement: input, maps, onOpen });

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    expect(onOpen).toHaveBeenCalledWith('map-close', 'target');
  });

  it('opens from double-click and the preview Open Map button with the same safe close path', () => {
    const { input } = createSvgCloseHost();
    const onOpen = vi.fn();
    mountGlobalSearchResults({ searchElement: input, maps, onOpen });

    const row = document.querySelector<HTMLElement>('[data-yemind-global-node="target"]')!;
    row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: 0 }));
    expect(onOpen).toHaveBeenNthCalledWith(1, 'map-close', 'target');

    // Remount because a real host would close after the first navigation.
    mountGlobalSearchResults({ searchElement: input, maps, onOpen });
    document.querySelector<HTMLElement>('[data-yemind-preview-open]')?.click();
    expect(onOpen).toHaveBeenNthCalledWith(2, 'map-close', 'target');
  });
});

import { runDiagnosticsSelfCheck } from '../src/diagnostics/selfCheck';
import { DEFAULT_SETTINGS } from '../src/settings/SettingsStore';

it('reports a stalled search navigation as failed instead of a false pass', async () => {
  const report = await runDiagnosticsSelfCheck({
    maps: [], checkpoints: [], settings: DEFAULT_SETTINGS, editors: [],
    globalSearch: {
      observed: true, queryLength: 5, nativeResultCount: 0, yemindResultCount: 1,
      listMounted: true, previewMounted: true, previewVisible: true, selectedType: 'yemind',
      lastNavigationStep: 'close-request', lastNavigationSuccess: null, updatedAt: 1_000,
    },
    storageProbe: async () => ({ write: true, read: true, remove: true }),
    lifecycleProbe: async () => ({ create: true, update: true, checkpoint: true, restore: true, cleanup: true }),
    now: () => 5_000,
  });
  const search = report.items.find((item) => item.id === 'global-search');
  expect(search?.status).toBe('fail');
  expect(search?.summary).toContain('停滞');
});
