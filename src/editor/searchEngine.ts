export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  preserveCase: boolean;
  scope: 'document' | 'selection';
}

export interface SearchPatternResult {
  pattern: RegExp | null;
  error: string;
}

export interface SearchTextMatch {
  start: number;
  end: number;
  text: string;
}

export interface SearchReplaceResult {
  value: string;
  count: number;
  error: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSearchPattern(query: string, options: SearchOptions): SearchPatternResult {
  if (!query) return { pattern: null, error: '' };
  try {
    const source = options.useRegex ? query : escapeRegExp(query);
    const bounded = options.wholeWord
      ? `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])`
      : source;
    return {
      pattern: new RegExp(bounded, `g${options.caseSensitive ? '' : 'i'}u`),
      error: '',
    };
  } catch (error) {
    return {
      pattern: null,
      error: error instanceof Error ? error.message : '正则表达式无效',
    };
  }
}

export function findSearchMatches(
  value: string,
  query: string,
  options: SearchOptions,
): SearchTextMatch[] {
  const { pattern } = buildSearchPattern(query, options);
  if (!pattern) return [];
  const matches: SearchTextMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
    if (match[0].length === 0) pattern.lastIndex += 1;
  }
  return matches;
}

function preserveReplacementCase(match: string, replacement: string): string {
  if (match && match === match.toUpperCase()) return replacement.toUpperCase();
  if (match && match === match.toLowerCase()) return replacement.toLowerCase();
  if (
    match.length > 1
    && match[0] === match[0].toUpperCase()
    && match.slice(1) === match.slice(1).toLowerCase()
  ) {
    return replacement
      ? replacement[0].toUpperCase() + replacement.slice(1).toLowerCase()
      : replacement;
  }
  return replacement;
}

function expandReplacementTemplate(
  replacement: string,
  match: RegExpExecArray,
  source: string,
): string {
  const offset = match.index;
  const named = match.groups ?? {};
  return replacement.replace(/\$(\$|&|`|'|<([^>]+)>|(\d{1,2}))/g, (token, kind, name, digits) => {
    if (kind === '$') return '$';
    if (kind === '&') return match[0];
    if (kind === '`') return source.slice(0, offset);
    if (kind === "'") return source.slice(offset + match[0].length);
    if (name !== undefined) return Object.hasOwn(named, name) ? named[name] ?? '' : token;
    const index = Number(digits);
    if (index > 0 && index < match.length) return match[index] ?? '';
    if (digits.length === 2) {
      const first = Number(digits[0]);
      if (first > 0 && first < match.length) return `${match[first] ?? ''}${digits[1]}`;
    }
    return token;
  });
}

function replacementAt(
  source: string,
  start: number,
  pattern: RegExp,
  replacement: string,
  preserveCase: boolean,
): string {
  const probe = new RegExp(pattern.source, pattern.flags);
  probe.lastIndex = start;
  const match = probe.exec(source);
  if (!match || match.index !== start) return replacement;
  const expanded = expandReplacementTemplate(replacement, match, source);
  return preserveCase ? preserveReplacementCase(match[0], expanded) : expanded;
}

export function replaceSearchMatches(
  value: string,
  query: string,
  replacement: string,
  options: SearchOptions,
  limit = Number.POSITIVE_INFINITY,
  skip = 0,
): SearchReplaceResult {
  const built = buildSearchPattern(query, options);
  if (!built.pattern) return { value, count: 0, error: built.error };
  let count = 0;
  const pattern = built.pattern;
  let seen = 0;
  const next = value.replace(pattern, (match, ...args: unknown[]) => {
    if (seen++ < skip) return match;
    if (count >= limit) return match;
    const groupsOffset = typeof args.at(-1) === 'object' ? 1 : 0;
    const offset = Number(args.at(-(2 + groupsOffset)));
    count += 1;
    return replacementAt(value, offset, pattern, replacement, options.preserveCase);
  });
  return { value: next, count, error: '' };
}

export function replaceSearchMatchesInHtml(
  html: string,
  query: string,
  replacement: string,
  options: SearchOptions,
  limit = Number.POSITIVE_INFINITY,
  skip = 0,
): SearchReplaceResult {
  if (typeof document === 'undefined') {
    return replaceSearchMatches(html, query, replacement, options, limit);
  }
  const host = document.createElement('div');
  host.innerHTML = html;
  const built = buildSearchPattern(query, options);
  if (!built.pattern) return { value: html, count: 0, error: built.error };
  type TextEntry = { node: Text; start: number; end: number };
  type SearchRun = { text: string; entries: TextEntry[] };
  const blockTags = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'DT', 'DD',
    'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3',
    'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P',
    'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD',
    'TR', 'UL',
  ]);
  const runs: SearchRun[] = [];
  let current: SearchRun = { text: '', entries: [] };
  const flush = (): void => {
    if (current.entries.length > 0) runs.push(current);
    current = { text: '', entries: [] };
  };
  const appendText = (textNode: Text): void => {
    const value = textNode.nodeValue ?? '';
    const start = current.text.length;
    current.text += value;
    current.entries.push({ node: textNode, start, end: start + value.length });
  };
  const visit = (parent: Node): void => {
    Array.from(parent.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        appendText(child as Text);
        return;
      }
      if (!(child instanceof Element)) return;
      if (child.tagName === 'BR') {
        flush();
        return;
      }
      if (blockTags.has(child.tagName)) {
        flush();
        visit(child);
        flush();
        return;
      }
      visit(child);
    });
  };
  visit(host);
  flush();

  const candidates = runs.flatMap((run) => findSearchMatches(run.text, query, options)
    .map((match) => ({ run, match })));
  const selected = candidates.slice(skip, skip + limit);
  const locate = (
    run: SearchRun,
    offset: number,
    endBoundary: boolean,
  ): { node: Text; offset: number } | null => {
    for (const entry of run.entries) {
      if (offset < entry.end || (endBoundary && offset === entry.end)) {
        return {
          node: entry.node,
          offset: Math.max(0, Math.min(entry.node.length, offset - entry.start)),
        };
      }
    }
    const last = run.entries.at(-1);
    return last ? { node: last.node, offset: last.node.length } : null;
  };
  [...selected].reverse().forEach(({ run, match }) => {
    const start = locate(run, match.start, false);
    const end = locate(run, match.end, true);
    if (!start || !end) return;
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const next = replacementAt(
      run.text,
      match.start,
      built.pattern!,
      replacement,
      options.preserveCase,
    );
    range.deleteContents();
    range.insertNode(document.createTextNode(next));
  });
  return { value: host.innerHTML, count: selected.length, error: '' };
}

export function plainTextFromSearchValue(value: unknown, richText = false): string {
  const source = String(value ?? '');
  if (!richText) return source;
  if (typeof document === 'undefined') {
    return source
      .replace(/<\/?(?:address|article|aside|blockquote|div|dl|dt|dd|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul|br)\b[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '');
  }
  const host = document.createElement('div');
  host.innerHTML = source;
  host.querySelectorAll(
    'address,article,aside,blockquote,div,dl,dt,dd,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,header,hr,li,main,nav,ol,p,pre,section,table,tbody,td,tfoot,th,thead,tr,ul,br',
  ).forEach((element) => element.append(document.createTextNode('\n')));
  return host.textContent ?? '';
}
