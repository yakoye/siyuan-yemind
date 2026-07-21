import type { MindMapTree, YeMindMapDocument } from '../model/types';

export interface GlobalMapMatch {
  mapId: string;
  nodeUid: string;
  mapTitle: string;
  text: string;
  path: string;
  titleMatch?: boolean;
  source?: 'title' | 'node' | 'note' | 'comment' | 'tag' | 'link' | 'todo';
}

export interface GlobalSearchOpenOptions {
  position?: 'right';
}

export interface GlobalSearchSurface {
  root: HTMLElement;
  list: HTMLElement;
  preview: HTMLElement;
  resultCount: HTMLElement | null;
}

interface GlobalSearchState {
  searchElement: HTMLInputElement;
  maps: YeMindMapDocument[];
  onOpen: (mapId: string, nodeUid: string, options?: GlobalSearchOpenOptions) => void;
  query: string;
  matches: GlobalMapMatch[];
  selectedKey: string | null;
  initialized: boolean;
  observer: MutationObserver | null;
  observedRoot: HTMLElement | null;
  observedList: HTMLElement | null;
  listMouseDown?: (event: MouseEvent) => void;
  listPointerDown?: (event: PointerEvent) => void;
  listClick?: (event: MouseEvent) => void;
  keyDown?: (event: KeyboardEvent) => void;
  scheduled: boolean;
  mutating: boolean;
}

const states = new WeakMap<HTMLInputElement, GlobalSearchState>();
const activeStates = new Set<GlobalSearchState>();

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function plainText(value: unknown): string {
  const text = String(value ?? '');
  if (!text.includes('<')) return text.replace(/\s+/g, ' ').trim();
  if (typeof document !== 'undefined') {
    const element = document.createElement('div');
    element.innerHTML = text;
    return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  }
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalized(value: string): string {
  return value.toLocaleLowerCase();
}

function sourceLabel(source: GlobalMapMatch['source']): string {
  switch (source) {
    case 'note': return '备注';
    case 'comment': return '批注';
    case 'tag': return '标签';
    case 'link': return '链接';
    case 'todo': return '待办';
    case 'title': return '导图';
    default: return '';
  }
}

function sourcePriority(source: GlobalMapMatch['source']): number {
  switch (source) {
    case 'node': return 0;
    case 'title': return 1;
    case 'note': return 2;
    case 'comment': return 3;
    case 'tag': return 4;
    case 'todo': return 5;
    case 'link': return 6;
    default: return 7;
  }
}

function matchPriority(match: GlobalMapMatch, query: string): number {
  const text = normalized(match.text.replace(/^(备注|批注|标签|链接|待办)：/, ''));
  if (text === query) return sourcePriority(match.source);
  if (text.startsWith(query)) return 20 + sourcePriority(match.source);
  return 40 + sourcePriority(match.source);
}

function highlightText(text: string, rawQuery: string): string {
  const query = rawQuery.trim();
  if (!query) return escapeHtml(text);
  const lower = normalized(text);
  const needle = normalized(query);
  let start = 0;
  let index = lower.indexOf(needle, start);
  if (index < 0) return escapeHtml(text);
  const chunks: string[] = [];
  while (index >= 0) {
    chunks.push(escapeHtml(text.slice(start, index)));
    chunks.push(`<mark>${escapeHtml(text.slice(index, index + query.length))}</mark>`);
    start = index + query.length;
    index = lower.indexOf(needle, start);
  }
  chunks.push(escapeHtml(text.slice(start)));
  return chunks.join('');
}

function nodeFragments(node: MindMapTree): Array<{ text: string; source: NonNullable<GlobalMapMatch['source']> }> {
  const data = node.data;
  const fragments: Array<{ text: string; source: NonNullable<GlobalMapMatch['source']> }> = [];
  const push = (value: unknown, source: NonNullable<GlobalMapMatch['source']>, prefix = ''): void => {
    const text = plainText(value);
    if (text) fragments.push({ text: `${prefix}${text}`, source });
  };
  push(data.text, 'node');
  push(data.yemindNote && typeof data.yemindNote === 'object' ? data.yemindNote.html : data.note, 'note', '备注：');
  if (Array.isArray(data.yemindComments)) {
    data.yemindComments.forEach((comment) => push(comment?.text, 'comment', '批注：'));
  }
  if (Array.isArray(data.tag)) data.tag.forEach((tag) => push(tag, 'tag', '标签：'));
  push(data.hyperlinkTitle || data.hyperlink, 'link', '链接：');
  if (data.yemindTodo && typeof data.yemindTodo === 'object') push(data.yemindTodo.text, 'todo', '待办：');
  return fragments;
}

function visitTree(
  map: YeMindMapDocument,
  node: MindMapTree,
  query: string,
  path: string[],
  matches: GlobalMapMatch[],
  limit: number,
): void {
  if (matches.length >= limit) return;
  const nodeText = plainText(node.data.text);
  const nextPath = nodeText ? [...path, nodeText] : path;
  const fragments = nodeFragments(node).filter((item) => normalized(item.text).includes(query));
  if (fragments.length > 0) {
    const fragment = [...fragments].sort((left, right) => {
      const leftMatch: GlobalMapMatch = { mapId: map.id, nodeUid: '', mapTitle: map.title, text: left.text, path: '', source: left.source };
      const rightMatch: GlobalMapMatch = { mapId: map.id, nodeUid: '', mapTitle: map.title, text: right.text, path: '', source: right.source };
      return matchPriority(leftMatch, query) - matchPriority(rightMatch, query);
    })[0]!;
    matches.push({
      mapId: map.id,
      nodeUid: String(node.data.uid ?? ''),
      mapTitle: map.title,
      text: fragment.text,
      path: nextPath.join(' › '),
      source: fragment.source,
    });
  }
  for (const child of node.children ?? []) visitTree(map, child, query, nextPath, matches, limit);
}

export function collectGlobalMapMatches(
  maps: YeMindMapDocument[],
  rawQuery: string,
  limit = 30,
): GlobalMapMatch[] {
  const query = normalized(rawQuery.trim());
  if (!query) return [];
  const matches: GlobalMapMatch[] = [];
  for (const map of maps) {
    if (normalized(map.title).includes(query)) {
      matches.push({
        mapId: map.id,
        nodeUid: String(map.data.data.uid ?? ''),
        mapTitle: map.title,
        text: map.title,
        path: plainText(map.data.data.text) || map.title,
        titleMatch: true,
        source: 'title',
      });
    }
    visitTree(map, map.data, query, [], matches, limit * 2);
  }
  const unique = new Map<string, GlobalMapMatch>();
  matches.forEach((item) => {
    const key = `${item.mapId}:${item.nodeUid}`;
    const existing = unique.get(key);
    if (!existing || matchPriority(item, query) < matchPriority(existing, query)) unique.set(key, item);
  });
  return [...unique.values()]
    .sort((left, right) => matchPriority(left, query) - matchPriority(right, query)
      || right.mapTitle.localeCompare(left.mapTitle)
      || left.path.localeCompare(right.path))
    .slice(0, limit);
}

function resultPath(match: GlobalMapMatch): string {
  const path = match.path && match.path !== match.mapTitle ? match.path : '';
  return path ? `${match.mapTitle} / ${path.replaceAll(' › ', ' / ')}` : match.mapTitle;
}

function displayMatchText(match: GlobalMapMatch): string {
  return match.text.replace(/^(备注|批注|标签|链接|待办)：/, '');
}

function resultSignature(matches: GlobalMapMatch[], query: string): string {
  return `${query}::${matches.map((item) => `${item.mapId}:${item.nodeUid}:${item.source}:${item.text}`).join('|')}`;
}

export function renderGlobalSearchResults(matches: GlobalMapMatch[], query = ''): string {
  if (matches.length === 0) return '';
  const signature = resultSignature(matches, query);
  const rows = matches.map((item) => {
    const label = sourceLabel(item.source);
    return `<div role="option" tabindex="-1" class="b3-list-item ymz-global-search-result" data-yemind-global-result data-yemind-global-map="${escapeHtml(item.mapId)}" data-yemind-global-node="${escapeHtml(item.nodeUid)}">
      <svg class="b3-list-item__graphic ymz-global-search-result__icon" aria-hidden="true"><use xlink:href="#iconYeMind"></use></svg>
      <span class="b3-list-item__text">${label ? `<span class="ymz-global-search-result__source">${escapeHtml(label)}</span>` : ''}<span class="ymz-global-search-result__content">${highlightText(displayMatchText(item), query)}</span></span>
      <span class="b3-list-item__meta b3-list-item__meta--ellipsis ariaLabel" aria-label="${escapeHtml(resultPath(item))}">${escapeHtml(resultPath(item))}</span>
    </div>`;
  }).join('');
  return `<section class="ymz-global-search-results" data-yemind-global-results data-yemind-global-signature="${escapeHtml(signature)}" role="group" aria-label="YeMind Zen 搜索结果">
    <header class="ymz-global-search-results__header"><strong>YeMind Zen</strong><span>${matches.length} 条结果</span></header>
    <div class="ymz-global-search-results__list">${rows}</div>
  </section>`;
}

function findNodePath(root: MindMapTree, uid: string, path: MindMapTree[] = []): MindMapTree[] | null {
  const next = [...path, root];
  if (String(root.data.uid ?? '') === uid) return next;
  for (const child of root.children ?? []) {
    const found = findNodePath(child, uid, next);
    if (found) return found;
  }
  return null;
}

function renderPreviewRow(node: MindMapTree, depth: number, targetUid: string, onPath: boolean, current: boolean): string {
  const uid = String(node.data.uid ?? '');
  const text = plainText(node.data.text) || '未命名节点';
  const children = node.children ?? [];
  const marker = children.length > 0 ? (onPath ? '▾' : '▸') : '●';
  return `<div class="ymz-global-search-preview__row${current ? ' is-current' : ''}${onPath ? ' is-path' : ''}" data-yemind-preview-node="${escapeHtml(uid)}" style="--ymz-preview-depth:${depth}">
    <span class="ymz-global-search-preview__marker" aria-hidden="true">${marker}</span>
    <span class="ymz-global-search-preview__text">${escapeHtml(text)}</span>
    ${children.length > 0 && !onPath ? `<span class="ymz-global-search-preview__count">${children.length}</span>` : ''}
  </div>`;
}

export function renderGlobalSearchPreview(map: YeMindMapDocument, match: GlobalMapMatch, maxRows = 200): string {
  const path = findNodePath(map.data, match.nodeUid) ?? [map.data];
  const pathSet = new Set(path.map((node) => String(node.data.uid ?? '')));
  const target = path.at(-1) ?? map.data;
  const rows: string[] = [];
  let count = 0;
  const push = (node: MindMapTree, depth: number, onPath: boolean, current = false): void => {
    if (count >= maxRows) return;
    rows.push(renderPreviewRow(node, depth, match.nodeUid, onPath, current));
    count += 1;
  };

  const renderPathContext = (node: MindMapTree, depth: number): void => {
    if (count >= maxRows) return;
    const uid = String(node.data.uid ?? '');
    const current = uid === match.nodeUid;
    push(node, depth, true, current);
    if (current) {
      for (const child of node.children ?? []) push(child, depth + 1, false, false);
      return;
    }
    for (const child of node.children ?? []) {
      const childUid = String(child.data.uid ?? '');
      if (pathSet.has(childUid)) renderPathContext(child, depth + 1);
      else push(child, depth + 1, false, false);
      if (count >= maxRows) break;
    }
  };
  renderPathContext(map.data, 0);

  const source = sourceLabel(match.source);
  const fullPath = resultPath(match);
  return `<section class="ymz-global-search-preview" data-yemind-global-preview data-yemind-preview-map="${escapeHtml(map.id)}" data-yemind-preview-node-target="${escapeHtml(match.nodeUid)}">
    <header class="ymz-global-search-preview__header">
      <div><strong>${escapeHtml(map.title)}</strong><small title="${escapeHtml(fullPath)}">${escapeHtml(fullPath)}</small></div>
      <button type="button" class="b3-button b3-button--small b3-button--outline" data-yemind-preview-open>打开导图</button>
    </header>
    ${source && match.source !== 'title' && match.source !== 'node' ? `<div class="ymz-global-search-preview__match"><span>${escapeHtml(source)}</span>${escapeHtml(displayMatchText(match))}</div>` : ''}
    <div class="ymz-global-search-preview__outline" role="tree">${rows.join('')}</div>
    ${count >= maxRows ? `<footer>预览已限制为 ${maxRows} 个节点</footer>` : ''}
  </section>`;
}

function findSearchRoot(searchElement: HTMLInputElement): HTMLElement | null {
  return searchElement.closest<HTMLElement>('.fn__flex-column')
    ?? searchElement.closest<HTMLElement>('.search__panel')
    ?? searchElement.closest<HTMLElement>('.search__layout')
    ?? searchElement.parentElement;
}

export function resolveGlobalSearchSurface(searchElement: HTMLInputElement): GlobalSearchSurface | null {
  const root = findSearchRoot(searchElement);
  if (!root) return null;
  const list = root.querySelector<HTMLElement>('#searchList, .search__list')
    ?? searchElement.closest<HTMLElement>('.search__layout')
    ?? root;
  let preview = root.querySelector<HTMLElement>('#searchPreview, .search__preview');
  if (!preview && typeof document !== 'undefined') {
    preview = document.createElement('div');
    preview.className = 'search__preview ymz-global-search-preview-host';
    preview.dataset.yemindFallbackPreview = '';
    if (list.parentElement) list.parentElement.append(preview);
    else root.append(preview);
  }
  if (!preview) return null;
  return {
    root,
    list,
    preview,
    resultCount: root.querySelector<HTMLElement>('#searchResult'),
  };
}

/** @deprecated Kept for older tests and downstream adapters. */
export function resolveGlobalSearchMount(searchElement: HTMLInputElement): { cleanupRoot: HTMLElement; mountPoint: HTMLElement } | null {
  const surface = resolveGlobalSearchSurface(searchElement);
  return surface ? { cleanupRoot: surface.root, mountPoint: surface.list } : null;
}

function keyForMatch(match: GlobalMapMatch): string {
  return `${match.mapId}:${match.nodeUid}`;
}

function matchForRow(state: GlobalSearchState, row: HTMLElement): GlobalMapMatch | undefined {
  const mapId = row.dataset.yemindGlobalMap ?? '';
  const nodeUid = row.dataset.yemindGlobalNode ?? '';
  return state.matches.find((item) => item.mapId === mapId && item.nodeUid === nodeUid);
}

function findMap(state: GlobalSearchState, mapId: string): YeMindMapDocument | undefined {
  return state.maps.find((map) => map.id === mapId);
}

function clearPreview(surface: GlobalSearchSurface): void {
  surface.preview.querySelector<HTMLElement>('[data-yemind-global-preview]')?.remove();
  surface.preview.classList.remove('ymz-global-preview-active');
}

function clearCustomSelection(state: GlobalSearchState, surface: GlobalSearchSurface): void {
  surface.list.querySelectorAll<HTMLElement>('[data-yemind-global-result].b3-list-item--focus').forEach((item) => item.classList.remove('b3-list-item--focus'));
  state.selectedKey = null;
  clearPreview(surface);
}

function openMatch(state: GlobalSearchState, match: GlobalMapMatch, position?: 'right'): void {
  if (position) state.onOpen(match.mapId, match.nodeUid, { position });
  else state.onOpen(match.mapId, match.nodeUid);
}

function showPreview(state: GlobalSearchState, surface: GlobalSearchSurface, match: GlobalMapMatch): void {
  const map = findMap(state, match.mapId);
  if (!map) return;
  const existing = surface.preview.querySelector<HTMLElement>('[data-yemind-global-preview]');
  if (existing?.dataset.yemindPreviewMap === match.mapId
    && existing.dataset.yemindPreviewNodeTarget === match.nodeUid) {
    surface.preview.classList.add('ymz-global-preview-active');
    return;
  }
  clearPreview(surface);
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderGlobalSearchPreview(map, match);
  const preview = wrapper.firstElementChild as HTMLElement | null;
  if (!preview) return;
  preview.querySelector<HTMLElement>('[data-yemind-preview-open]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openMatch(state, match);
  });
  preview.querySelectorAll<HTMLElement>('[data-yemind-preview-node]').forEach((row) => {
    row.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const uid = row.dataset.yemindPreviewNode ?? match.nodeUid;
      if (uid) state.onOpen(match.mapId, uid);
    });
  });
  surface.preview.append(preview);
  surface.preview.classList.add('ymz-global-preview-active');
}

function selectMatch(state: GlobalSearchState, surface: GlobalSearchSurface, match: GlobalMapMatch, scroll = true): void {
  surface.list.querySelectorAll<HTMLElement>('.b3-list-item--focus').forEach((item) => item.classList.remove('b3-list-item--focus'));
  surface.list.querySelectorAll<HTMLElement>('[data-yemind-global-result][aria-selected="true"]').forEach((item) => item.setAttribute('aria-selected', 'false'));
  const row = Array.from(surface.list.querySelectorAll<HTMLElement>('[data-yemind-global-result]'))
    .find((item) => item.dataset.yemindGlobalMap === match.mapId && item.dataset.yemindGlobalNode === match.nodeUid);
  if (!row) return;
  row.classList.add('b3-list-item--focus');
  row.setAttribute('aria-selected', 'true');
  state.selectedKey = keyForMatch(match);
  showPreview(state, surface, match);
  if (scroll && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' });
}

function selectedMatch(state: GlobalSearchState): GlobalMapMatch | undefined {
  return state.selectedKey ? state.matches.find((item) => keyForMatch(item) === state.selectedKey) : undefined;
}

function activateNativeResult(state: GlobalSearchState, surface: GlobalSearchSurface, native: HTMLElement): void {
  clearCustomSelection(state, surface);
  surface.list.querySelectorAll<HTMLElement>('.b3-list-item--focus').forEach((item) => item.classList.remove('b3-list-item--focus'));
  native.classList.add('b3-list-item--focus');
  native.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
  if (typeof native.scrollIntoView === 'function') native.scrollIntoView({ block: 'nearest' });
}

function attachRowEvents(state: GlobalSearchState, surface: GlobalSearchSurface): void {
  surface.list.querySelectorAll<HTMLElement>('[data-yemind-global-result]').forEach((row) => {
    if (row.dataset.yemindEvents === '1') return;
    row.dataset.yemindEvents = '1';
    const selectFromEvent = (event: Event): GlobalMapMatch | undefined => {
      if (event instanceof MouseEvent && event.button !== 0) return undefined;
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
      const match = matchForRow(state, row);
      if (match) selectMatch(state, surface, match, false);
      return match;
    };
    row.addEventListener('pointerdown', (event) => { selectFromEvent(event); }, true);
    row.addEventListener('mousedown', (event) => { selectFromEvent(event); }, true);
    row.addEventListener('click', (event) => {
      const match = selectFromEvent(event);
      if (match && (event as MouseEvent).altKey) openMatch(state, match, 'right');
    });
    row.addEventListener('dblclick', (event) => {
      const match = selectFromEvent(event);
      if (match) openMatch(state, match);
    });
  });
}

function attachNativeSelectionRestore(state: GlobalSearchState, surface: GlobalSearchSurface): void {
  if (state.observedList === surface.list) return;
  if (state.observedList && state.listMouseDown) state.observedList.removeEventListener('mousedown', state.listMouseDown, true);
  if (state.observedList && state.listPointerDown) state.observedList.removeEventListener('pointerdown', state.listPointerDown, true);
  if (state.observedList && state.listClick) state.observedList.removeEventListener('click', state.listClick, true);
  state.observedList = surface.list;
  const restore = (event: Event): void => {
    const item = (event.target as Element | null)?.closest<HTMLElement>('.b3-list-item');
    if (!item || item.hasAttribute('data-yemind-global-result')) return;
    clearCustomSelection(state, surface);
  };
  state.listMouseDown = (event: MouseEvent): void => restore(event);
  state.listPointerDown = (event: PointerEvent): void => restore(event);
  state.listClick = (event: MouseEvent): void => restore(event);
  surface.list.addEventListener('pointerdown', state.listPointerDown, true);
  surface.list.addEventListener('mousedown', state.listMouseDown, true);
  surface.list.addEventListener('click', state.listClick, true);
}

function updateResultCount(surface: GlobalSearchSurface, count: number): void {
  const host = surface.resultCount;
  if (!host) return;
  const existing = host.querySelector<HTMLElement>('[data-yemind-search-count]');
  if (count <= 0) {
    existing?.remove();
    return;
  }
  const text = ` · ${count} 个导图节点`;
  if (existing) {
    if (existing.textContent !== text) existing.textContent = text;
    return;
  }
  const badge = document.createElement('span');
  badge.dataset.yemindSearchCount = '';
  badge.className = 'ymz-global-search-count';
  badge.textContent = text;
  host.append(badge);
}

function updateNativeEmptyState(surface: GlobalSearchSurface, hasYeMindResults: boolean): void {
  surface.list.querySelectorAll<HTMLElement>('[data-yemind-native-empty-hidden]').forEach((item) => {
    item.classList.remove('ymz-global-search-native-empty-hidden');
    delete item.dataset.yemindNativeEmptyHidden;
  });
  if (!hasYeMindResults) return;
  Array.from(surface.list.children).forEach((child) => {
    if (!(child instanceof HTMLElement) || child.hasAttribute('data-yemind-global-results')) return;
    const text = (child.textContent ?? '').trim();
    if (/搜索结果为空|没有搜索结果|无结果/.test(text)) {
      child.dataset.yemindNativeEmptyHidden = '';
      child.classList.add('ymz-global-search-native-empty-hidden');
    }
  });
}

function ensureMounted(state: GlobalSearchState, selectInitial = false): void {
  const surface = resolveGlobalSearchSurface(state.searchElement);
  if (!surface) return;
  state.mutating = true;
  try {
    const panels = Array.from(surface.root.querySelectorAll<HTMLElement>('[data-yemind-global-results]'));
    let panel = panels.find((item) => item.parentElement === surface.list) ?? null;
    panels.forEach((item) => { if (item !== panel) item.remove(); });
    const signature = resultSignature(state.matches, state.query);
    if (panel && panel.dataset.yemindGlobalSignature !== signature) {
      panel.remove();
      panel = null;
    }

    if (!state.query || state.matches.length === 0) {
      panel?.remove();
      clearPreview(surface);
      updateResultCount(surface, 0);
      updateNativeEmptyState(surface, false);
      state.selectedKey = null;
      state.initialized = true;
      return;
    }

    if (!panel) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = renderGlobalSearchResults(state.matches, state.query);
      panel = wrapper.firstElementChild as HTMLElement | null;
      if (panel) surface.list.prepend(panel);
    }
    if (!panel) return;
    attachRowEvents(state, surface);
    attachNativeSelectionRestore(state, surface);
    updateResultCount(surface, state.matches.length);
    updateNativeEmptyState(surface, true);

    const selected = selectedMatch(state);
    if (selected) selectMatch(state, surface, selected, false);
    else if (selectInitial && state.matches[0]) selectMatch(state, surface, state.matches[0], false);
    state.initialized = true;
  } finally {
    state.mutating = false;
  }
}

function scheduleEnsure(state: GlobalSearchState): void {
  if (state.scheduled) return;
  state.scheduled = true;
  window.setTimeout(() => {
    state.scheduled = false;
    if (!state.searchElement.isConnected) {
      destroyState(state, false);
      return;
    }
    ensureMounted(state, false);
  }, 0);
}

function observeSurface(state: GlobalSearchState): void {
  const surface = resolveGlobalSearchSurface(state.searchElement);
  if (!surface) return;
  if (state.observedRoot === surface.root && state.observer) return;
  state.observer?.disconnect();
  state.observedRoot = surface.root;
  state.observer = new MutationObserver(() => {
    if (!state.mutating) scheduleEnsure(state);
  });
  state.observer.observe(surface.root, { childList: true, subtree: true });
}

function attachKeyboard(state: GlobalSearchState): void {
  if (state.keyDown) return;
  state.keyDown = (event: KeyboardEvent): void => {
    const surface = resolveGlobalSearchSurface(state.searchElement);
    if (!surface || state.matches.length === 0) return;
    const current = selectedMatch(state);
    const currentIndex = current ? state.matches.findIndex((item) => keyForMatch(item) === keyForMatch(current)) : -1;
    const customRows = Array.from(surface.list.querySelectorAll<HTMLElement>('[data-yemind-global-result]'));
    const nativeRows = Array.from(surface.list.querySelectorAll<HTMLElement>('.b3-list-item:not([data-yemind-global-result])'));
    const focusedNative = nativeRows.find((item) => item.classList.contains('b3-list-item--focus'));
    const stop = (): void => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    if (event.key === 'Enter' && current) {
      stop();
      openMatch(state, current, event.altKey ? 'right' : undefined);
      return;
    }
    if (event.key === 'ArrowDown') {
      if (currentIndex >= 0) {
        stop();
        if (currentIndex < state.matches.length - 1) selectMatch(state, surface, state.matches[currentIndex + 1]!);
        else if (nativeRows[0]) activateNativeResult(state, surface, nativeRows[0]);
        return;
      }
      if (!focusedNative && state.matches[0]) {
        stop();
        selectMatch(state, surface, state.matches[0]);
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      if (currentIndex > 0) {
        stop();
        selectMatch(state, surface, state.matches[currentIndex - 1]!);
        return;
      }
      if (currentIndex === 0) {
        stop();
        return;
      }
      if (focusedNative && nativeRows.indexOf(focusedNative) === 0 && state.matches.at(-1)) {
        stop();
        selectMatch(state, surface, state.matches.at(-1)!);
      }
      return;
    }
    if (event.key === 'PageUp' && customRows.length > 0) {
      stop();
      selectMatch(state, surface, state.matches[0]!);
      return;
    }
    if (event.key === 'PageDown' && customRows.length > 0) {
      stop();
      selectMatch(state, surface, state.matches.at(-1)!);
    }
  };
  state.searchElement.addEventListener('keydown', state.keyDown, true);
}

function destroyState(state: GlobalSearchState, removeDom = true): void {
  state.observer?.disconnect();
  state.observer = null;
  if (state.keyDown) state.searchElement.removeEventListener('keydown', state.keyDown, true);
  if (state.observedList && state.listMouseDown) state.observedList.removeEventListener('mousedown', state.listMouseDown, true);
  if (state.observedList && state.listPointerDown) state.observedList.removeEventListener('pointerdown', state.listPointerDown, true);
  if (state.observedList && state.listClick) state.observedList.removeEventListener('click', state.listClick, true);
  if (removeDom) {
    const surface = resolveGlobalSearchSurface(state.searchElement);
    if (surface) {
      surface.root.querySelectorAll('[data-yemind-global-results]').forEach((item) => item.remove());
      clearPreview(surface);
      updateResultCount(surface, 0);
      updateNativeEmptyState(surface, false);
    }
  }
  activeStates.delete(state);
  states.delete(state.searchElement);
}

export function destroyGlobalSearchIntegrations(): void {
  Array.from(activeStates).forEach((state) => destroyState(state));
}

export function mountGlobalSearchResults(options: {
  searchElement: HTMLInputElement;
  maps: YeMindMapDocument[];
  onOpen: (mapId: string, nodeUid: string, options?: GlobalSearchOpenOptions) => void;
}): void {
  let state = states.get(options.searchElement);
  const query = options.searchElement.value.trim();
  const queryChanged = !state || state.query !== query;
  if (!state) {
    state = {
      searchElement: options.searchElement,
      maps: options.maps,
      onOpen: options.onOpen,
      query,
      matches: [],
      selectedKey: null,
      initialized: false,
      observer: null,
      observedRoot: null,
      observedList: null,
      scheduled: false,
      mutating: false,
    };
    states.set(options.searchElement, state);
    activeStates.add(state);
  }
  state.maps = options.maps;
  state.onOpen = options.onOpen;
  state.query = query;
  state.matches = collectGlobalMapMatches(options.maps, query);
  if (queryChanged) state.selectedKey = null;
  attachKeyboard(state);
  ensureMounted(state, queryChanged || !state.initialized);
  if (state.query && state.matches.length > 0) observeSurface(state);
  else { state.observer?.disconnect(); state.observer = null; state.observedRoot = null; }
}
