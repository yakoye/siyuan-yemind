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
  const fragment = nodeFragments(node).find((item) => item.text.toLocaleLowerCase().includes(query));
  if (fragment) {
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
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return [];
  const matches: GlobalMapMatch[] = [];
  for (const map of maps) {
    if (map.title.toLocaleLowerCase().includes(query)) {
      matches.push({
        mapId: map.id,
        nodeUid: String(map.data.data.uid ?? ''),
        mapTitle: map.title,
        text: map.title,
        path: map.title,
        titleMatch: true,
        source: 'title',
      });
    }
    visitTree(map, map.data, query, [], matches, limit);
    if (matches.length >= limit) break;
  }
  const unique = new Map<string, GlobalMapMatch>();
  matches.forEach((item) => unique.set(`${item.mapId}:${item.nodeUid}:${item.source}`, item));
  return [...unique.values()].slice(0, limit);
}

export function renderGlobalSearchResults(matches: GlobalMapMatch[]): string {
  if (matches.length === 0) return '';
  return `<section class="ymz-global-search-results" data-yemind-global-results><header><strong>YeMind Zen</strong><span>${matches.length} 条结果</span></header><div class="ymz-global-search-results__list">${matches.map((item) => `<button type="button" class="b3-list-item ymz-global-search-result" data-yemind-global-map="${escapeHtml(item.mapId)}" data-yemind-global-node="${escapeHtml(item.nodeUid)}"><span class="b3-list-item__graphic">Ye</span><span class="b3-list-item__text"><strong>${escapeHtml(item.text)}</strong><small>${escapeHtml(item.mapTitle)}${item.path && item.path !== item.text ? ` · ${escapeHtml(item.path)}` : ''}</small></span></button>`).join('')}</div></section>`;
}

export function mountGlobalSearchResults(options: {
  searchElement: HTMLInputElement;
  maps: YeMindMapDocument[];
  onOpen: (mapId: string, nodeUid: string) => void;
}): void {
  const parent = options.searchElement.closest<HTMLElement>('.search__header, .search__layout, .protyle') ?? options.searchElement.parentElement;
  if (!parent) return;
  const root = parent.parentElement ?? parent;
  root.querySelector<HTMLElement>('[data-yemind-global-results]')?.remove();
  const matches = collectGlobalMapMatches(options.maps, options.searchElement.value);
  if (matches.length === 0) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderGlobalSearchResults(matches);
  const panel = wrapper.firstElementChild as HTMLElement | null;
  if (!panel) return;
  let lastButton: HTMLElement | null = null;
  let lastActivatedAt = 0;
  const activate = (event: Event): void => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-yemind-global-map]');
    if (!button) return;
    if (event instanceof MouseEvent && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const now = Date.now();
    if (button === lastButton && now - lastActivatedAt < 500) return;
    lastButton = button;
    lastActivatedAt = now;
    options.onOpen(button.dataset.yemindGlobalMap ?? '', button.dataset.yemindGlobalNode ?? '');
  };
  // SiYuan may rebuild the search surface as soon as the input loses focus.
  // Open on mousedown so the result cannot disappear before the later click.
  panel.addEventListener('mousedown', activate, true);
  panel.addEventListener('click', activate);
  panel.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Enter') activate(event);
  });
  root.appendChild(panel);
}
