import { afterEach, describe, expect, it, vi } from 'vitest';
import { destroyGlobalSearchIntegrations, mountGlobalSearchResults } from '../../../src/plugin/globalSearch';

const maps = [{
  id: 'map-1', title: 'Map', createdAt: 1, updatedAt: 1, layout: 'logicalStructure', theme: 'default',
  data: { data: { uid: 'root', text: 'Root' }, children: [{ data: { uid: 'leaf', text: '43214' }, children: [] }] },
}];

function host() {
  const dialog = document.createElement('div');
  dialog.className = 'b3-dialog__container';
  dialog.innerHTML = `<button class="b3-dialog__close" aria-label="关闭"></button><div class="fn__flex-column"><div class="block__icons"><span id="searchResult">0</span></div><div class="search__header"><input id="searchInput" value="43214"></div><div class="search__layout"><div id="searchList" class="search__list"></div><div id="searchPreview" class="search__preview"></div></div></div>`;
  document.body.append(dialog);
  return dialog.querySelector<HTMLInputElement>('#searchInput')!;
}

afterEach(() => { destroyGlobalSearchIntegrations(); document.body.innerHTML = ''; });

describe('v0.7.0 global-search diagnostic chain', () => {
  it('reports query, result, preview, selection, enter, close and open transitions', () => {
    const input = host();
    const diagnostics = vi.fn();
    const state = vi.fn();
    const onOpen = vi.fn();
    mountGlobalSearchResults({ searchElement: input, maps, onOpen, onDiagnostic: diagnostics, onStateChange: state });
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const actions = diagnostics.mock.calls.map((call) => call[0]);
    for (const action of ['query-change','result-counts','list-mounted','preview-mounted','result-selected','enter-captured','close-request','open-request']) {
      expect(actions).toContain(action);
    }
    expect(state).toHaveBeenCalledWith(expect.objectContaining({ observed: true, yemindResultCount: 1, previewVisible: true }));
    expect(onOpen).toHaveBeenCalledWith('map-1', 'leaf');
  });
});
