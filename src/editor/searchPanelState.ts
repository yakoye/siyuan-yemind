import type { SearchOptions } from './searchEngine';

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  preserveCase: false,
  scope: 'document',
};

const OPTION_KEYS = {
  'case-sensitive': 'caseSensitive',
  'whole-word': 'wholeWord',
  regex: 'useRegex',
  'preserve-case': 'preserveCase',
} as const;

export type SearchOptionControl = keyof typeof OPTION_KEYS;

export function toggleSearchOption(
  panel: HTMLElement,
  control: string,
  options: SearchOptions,
): SearchOptions {
  if (control === 'selection-scope') {
    const next = {
      ...options,
      scope: options.scope === 'selection' ? 'document' : 'selection',
    } satisfies SearchOptions;
    const button = panel.querySelector<HTMLButtonElement>('[data-search-option="selection-scope"]');
    const active = next.scope === 'selection';
    button?.setAttribute('aria-pressed', String(active));
    button?.classList.toggle('is-active', active);
    return next;
  }
  if (!(control in OPTION_KEYS)) return options;
  const typedControl = control as SearchOptionControl;
  const key = OPTION_KEYS[typedControl];
  const next = { ...options, [key]: !options[key] };
  const button = panel.querySelector<HTMLButtonElement>(`[data-search-option="${typedControl}"]`);
  button?.setAttribute('aria-pressed', String(next[key]));
  button?.classList.toggle('is-active', next[key]);
  return next;
}

export function setSearchReplaceExpanded(panel: HTMLElement, expanded: boolean): void {
  panel.dataset.replaceExpanded = String(expanded);
  const row = panel.querySelector<HTMLElement>('[data-role="replace-row"]');
  if (row) row.hidden = !expanded;
  const button = panel.querySelector<HTMLElement>('[data-search-action="toggle-replace"]');
  if (!button) return;
  button.textContent = expanded ? '⌄' : '›';
  button.setAttribute('aria-expanded', String(expanded));
  button.setAttribute('title', expanded ? '收起替换' : '展开替换');
  button.setAttribute('aria-label', expanded ? '收起替换' : '展开替换');
}
