import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import {
  buildSearchPattern,
  findSearchMatches,
  replaceSearchMatches,
  replaceSearchMatchesInHtml,
  type SearchOptions,
} from '../../../src/editor/searchEngine';
import { toggleSearchOption } from '../../../src/editor/searchPanelState';
import { createCommandAdapter } from '../../../src/core/commands';

const defaults: SearchOptions = {
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  preserveCase: false,
  scope: 'document',
};
const css = readFileSync('src/styles/index.css', 'utf8');

describe('v1.5.1 Version47 search and replace', () => {
  it('V151-23 renders all VS Code search toggles and the two-row replacement panel', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('搜索');
    for (const option of ['case-sensitive', 'whole-word', 'regex', 'selection-scope', 'preserve-case']) {
      expect(host.querySelector(`[data-search-option="${option}"]`), option).not.toBeNull();
    }
    expect(host.querySelector('[data-role="search-error"]')).not.toBeNull();
    expect(host.querySelector('[data-search-action="replace"]')).not.toBeNull();
    expect(host.querySelector('[data-search-action="replace-all"]')).not.toBeNull();
    expect(css).toContain('.ymz-search-panel__options');
    expect(css).toMatch(/\.ymz-search-panel button\.is-active[^}]*color:var\(--ymz-accent\)/s);
  });

  it('V151-23 supports case-sensitive, whole-word and regex matching', () => {
    expect(findSearchMatches('Alpha alpha alphabet', 'alpha', defaults).map((item) => item.text))
      .toEqual(['Alpha', 'alpha', 'alpha']);
    expect(findSearchMatches('Alpha alpha alphabet', 'alpha', { ...defaults, caseSensitive: true }).map((item) => item.text))
      .toEqual(['alpha', 'alpha']);
    expect(findSearchMatches('Alpha alpha alphabet', 'alpha', { ...defaults, wholeWord: true }).map((item) => item.text))
      .toEqual(['Alpha', 'alpha']);
    expect(findSearchMatches('A1 B22 C333', '[A-Z]\\d+', { ...defaults, useRegex: true }).map((item) => item.text))
      .toEqual(['A1', 'B22', 'C333']);
  });

  it('V151-23 reports invalid regular expressions without mutating content', () => {
    const result = buildSearchPattern('[', { ...defaults, useRegex: true });
    expect(result.pattern).toBeNull();
    expect(result.error).toBeTruthy();
    expect(replaceSearchMatches('keep me', '[', 'lost', { ...defaults, useRegex: true }).value).toBe('keep me');
  });

  it('V151-23 toggles search options with persistent pressed-state feedback', () => {
    const panel = document.createElement('div');
    panel.innerHTML = '<button data-search-option="whole-word" aria-pressed="false"></button>';
    const next = toggleSearchOption(panel, 'whole-word', defaults);
    expect(next.wholeWord).toBe(true);
    expect(panel.querySelector('button')?.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('button')?.classList.contains('is-active')).toBe(true);
  });

  it('V151-23 preserves upper, lower and title case during replacement', () => {
    const result = replaceSearchMatches(
      'ALPHA Alpha alpha',
      'alpha',
      'beta',
      { ...defaults, preserveCase: true },
    );
    expect(result.value).toBe('BETA Beta beta');
    expect(result.count).toBe(3);
  });

  it('V151-23 replaces rich text without destroying inline formatting', () => {
    const result = replaceSearchMatchesInHtml(
      '<strong>Alpha</strong> and <em>alpha</em>',
      'alpha',
      'beta',
      { ...defaults, preserveCase: true },
    );
    expect(result.value).toBe('<strong>Beta</strong> and <em>beta</em>');
    expect(result.count).toBe(2);
  });

  it('V151-23 replaces a match that crosses inline formatting boundaries', () => {
    const result = replaceSearchMatchesInHtml(
      '<strong>Al</strong><em>pha</em> and <u>alpha</u>',
      'alpha',
      'beta',
      { ...defaults, preserveCase: true },
    );
    const host = document.createElement('div');
    host.innerHTML = result.value;
    expect(host.textContent).toBe('Beta and beta');
    expect(result.count).toBe(2);
    expect(host.querySelector('u')?.textContent).toBe('beta');
  });

  it('V151-23 never creates a match across separate block elements', () => {
    const result = replaceSearchMatchesInHtml(
      '<p>foo</p><p>bar</p>',
      'oob',
      'X',
      defaults,
    );
    expect(result.value).toBe('<p>foo</p><p>bar</p>');
    expect(result.count).toBe(0);
  });

  it('V151-23 expands regular-expression capture groups during replacement', () => {
    const result = replaceSearchMatches(
      'Alpha-12 beta-34',
      '([A-Za-z]+)-(\\d+)',
      '$2:$1',
      { ...defaults, useRegex: true },
    );
    expect(result.value).toBe('12:Alpha 34:beta');
    expect(result.count).toBe(2);
  });

  it('V151-23 applies options to real node traversal and replacement commands', () => {
    const data = { uid: 'node-1', text: 'Alpha alpha alphabet', richText: false };
    const node = {
      data,
      children: [],
      getData: (key?: string) => key ? data[key as keyof typeof data] : data,
      setText: (text: string) => {
        data.text = text;
      },
    };
    const search = {
      matchNodeList: [] as any[],
      currentIndex: -1,
      searchText: '',
      updateMatchNodeList(list: any[]) {
        this.matchNodeList = list;
      },
      searchNext() {
        if (this.matchNodeList.length) this.currentIndex = 0;
      },
      emitEvent: vi.fn(),
      clearHighlightOnReadonly: vi.fn(),
    };
    const mindMap = {
      renderer: { renderTree: node, activeNodeList: [] },
      opt: { readonly: false, isOnlySearchCurrentRenderNodes: false },
      search,
      render: vi.fn((done?: () => void) => done?.()),
      command: { addHistory: vi.fn() },
      execCommand: vi.fn(),
    };
    const commands = createCommandAdapter(mindMap as any);
    const options = { ...defaults, wholeWord: true };
    commands.search('alpha', options);
    expect(search.matchNodeList).toEqual([node, node]);
    commands.replaceSearchAll('beta', options);
    expect(data.text).toBe('beta beta alphabet');
  });

  it('V151-23 counts and replaces each occurrence inside the same node independently', () => {
    const data = { uid: 'node-1', text: 'alpha alpha', richText: false };
    const node = {
      data,
      children: [],
      getData: (key?: string) => key ? data[key as keyof typeof data] : data,
      setText: (text: string) => {
        data.text = text;
      },
    };
    const search = {
      matchNodeList: [] as any[],
      currentIndex: -1,
      searchText: '',
      updateMatchNodeList(list: any[]) {
        this.matchNodeList = list;
      },
      searchNext() {
        if (this.matchNodeList.length) this.currentIndex = 0;
      },
      emitEvent: vi.fn(),
      clearHighlightOnReadonly: vi.fn(),
    };
    const mindMap = {
      renderer: { renderTree: node, activeNodeList: [] },
      opt: { readonly: false, isOnlySearchCurrentRenderNodes: false },
      search,
      render: vi.fn((done?: () => void) => done?.()),
      command: { addHistory: vi.fn() },
      execCommand: vi.fn(),
    };
    const commands = createCommandAdapter(mindMap as any);
    commands.search('alpha', defaults);
    expect(search.matchNodeList).toEqual([node, node]);
    search.currentIndex = 1;
    commands.replaceSearch('beta', defaults);
    expect(data.text).toBe('alpha beta');
  });

  it('V151-23 navigates duplicate advanced matches without rebuilding the result list', () => {
    const data = { uid: 'node-1', text: 'alpha alpha', richText: false };
    const node = {
      data,
      children: [],
      getData: (key?: string) => key ? data[key as keyof typeof data] : data,
    };
    const search = {
      matchNodeList: [] as any[],
      currentIndex: -1,
      searchText: '',
      search: vi.fn(),
      updateMatchNodeList(list: any[]) {
        this.matchNodeList = list;
      },
      searchNext: vi.fn(function (this: typeof search) {
        this.currentIndex = (this.currentIndex + 1) % this.matchNodeList.length;
      }),
      emitEvent: vi.fn(),
      clearHighlightOnReadonly: vi.fn(),
    };
    const commands = createCommandAdapter({
      renderer: { renderTree: node, activeNodeList: [] },
      opt: { readonly: false, isOnlySearchCurrentRenderNodes: false },
      search,
    } as any);

    commands.search('alpha', defaults);
    commands.searchNext();

    expect(search.search).not.toHaveBeenCalled();
    expect(search.searchNext).toHaveBeenCalledTimes(2);
    expect(search.currentIndex).toBe(1);
  });

  it('V151-23 limits search to the currently selected nodes when requested', () => {
    const makeNode = (uid: string) => {
      const data = { uid, text: 'alpha', richText: false };
      return {
        data,
        children: [] as any[],
        getData: (key?: string) => key ? data[key as keyof typeof data] : data,
      };
    };
    const selected = makeNode('selected');
    const outside = makeNode('outside');
    const root = makeNode('root');
    root.children = [selected, outside];
    const search = {
      matchNodeList: [] as any[],
      currentIndex: -1,
      searchText: '',
      updateMatchNodeList(list: any[]) {
        this.matchNodeList = list;
      },
      searchNext: vi.fn(),
      emitEvent: vi.fn(),
      clearHighlightOnReadonly: vi.fn(),
    };
    const commands = createCommandAdapter({
      renderer: { renderTree: root, activeNodeList: [selected] },
      opt: { readonly: false, isOnlySearchCurrentRenderNodes: false },
      search,
    } as any);

    commands.search('alpha', { ...defaults, scope: 'selection' });

    expect(search.matchNodeList).toEqual([selected]);
  });

  it('V151-23 does not count rich-text matches across separate paragraphs', () => {
    const data = {
      uid: 'node-1',
      text: '<p>foo</p><p>bar</p>',
      richText: true,
    };
    const node = {
      data,
      children: [],
      getData: (key?: string) => key ? data[key as keyof typeof data] : data,
    };
    const search = {
      matchNodeList: [] as any[],
      currentIndex: -1,
      searchText: '',
      updateMatchNodeList(list: any[]) {
        this.matchNodeList = list;
      },
      searchNext: vi.fn(),
      emitEvent: vi.fn(),
      clearHighlightOnReadonly: vi.fn(),
    };
    const commands = createCommandAdapter({
      renderer: { renderTree: node, activeNodeList: [] },
      opt: { readonly: false, isOnlySearchCurrentRenderNodes: false },
      search,
    } as any);

    commands.search('oob', defaults);

    expect(search.matchNodeList).toEqual([]);
  });
});
