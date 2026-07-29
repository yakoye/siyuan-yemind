export interface SymbolGroup {
  id: string;
  label: string;
  layout?: 'spatial' | 'pairs' | 'number-pad' | 'labeled' | 'spatial-labeled';
  columns: number;
  cells: readonly (string | null)[];
  symbols: readonly string[];
  aliases?: readonly string[];
  labels?: Readonly<Record<string, string>>;
}

export interface SymbolSection {
  id: string;
  label: string;
  groups: readonly SymbolGroup[];
}

interface SymbolGridOptions {
  layout?: SymbolGroup['layout'];
  columns?: number;
  aliases?: readonly string[];
  labels?: Readonly<Record<string, string>>;
}

const grid = (
  id: string,
  label: string,
  rows: readonly (readonly (string | null)[])[],
  options: SymbolGridOptions = {},
): SymbolGroup => {
  const columns = options.columns
    ?? rows.reduce((maximum, row) => Math.max(maximum, row.length), 1);
  const cells = rows.flatMap((row) => [
    ...row,
    ...Array.from({ length: Math.max(0, columns - row.length) }, () => null),
  ]);
  return {
    id,
    label,
    layout: options.layout,
    columns,
    cells,
    symbols: cells.filter((symbol): symbol is string => Boolean(symbol)),
    aliases: options.aliases,
    labels: options.labels,
  };
};

export const SYMBOL_SECTIONS: readonly SymbolSection[] = [
  {
    id: 'arrows',
    label: '箭头',
    groups: [
      grid('basic-directions', '基础方向', [
        ['↖', '↑', '↗'],
        ['←', null, '→'],
        ['↙', '↓', '↘'],
      ], {
        layout: 'spatial',
        columns: 3,
        aliases: ['方向', '箭头', '上下左右'],
        labels: {
          '↖': '左上', '↑': '上', '↗': '右上', '←': '左', '→': '右',
          '↙': '左下', '↓': '下', '↘': '右下',
        },
      }),
      grid('curved-directions', '弯曲与长箭头', [
        ['↜', '↟', '↝'],
        ['↞', '↔', '↠'],
        ['↚', '↡', '↛'],
      ], { layout: 'spatial', columns: 3 }),
      grid('special-arrows', '双向与特殊', [
        ['↢', '↣', '↨'],
        ['↭', '↮', '↯'],
        ['⇐', '⇔', '⇒'],
      ], { columns: 3 }),
    ],
  },
  {
    id: 'shapes',
    label: '形状',
    groups: [
      grid('solid-directions', '实心方向', [
        [null, '▲', null],
        ['◀', null, '▶'],
        [null, '▼', null],
      ], { layout: 'spatial', columns: 3 }),
      grid('outline-directions', '空心方向', [
        [null, '△', null],
        ['◁', null, '▷'],
        [null, '▽', null],
      ], { layout: 'spatial', columns: 3 }),
      grid('small-directions', '小型方向', [
        [null, '▴', null],
        ['◂', null, '▸'],
        [null, '▾', null],
      ], { layout: 'spatial', columns: 3 }),
      grid('thin-directions', '细型方向', [
        [null, '▵', null],
        ['◃', null, '▹'],
        [null, '▿', null],
      ], { layout: 'spatial', columns: 3 }),
      grid('shape-pairs', '形状成对', [
        ['●', '○'],
        ['◆', '◇'],
        ['■', '□'],
        ['▰', '▱'],
        ['◪', '◩'],
        ['◻', '◼'],
      ], { layout: 'pairs', columns: 2 }),
    ],
  },
  {
    id: 'numbers',
    label: '数字',
    groups: [
      grid('circled-numbers', '圆圈数字', [
        ['①', '②', '③'],
        ['④', '⑤', '⑥'],
        ['⑦', '⑧', '⑨'],
        [null, '⑩', null],
      ], { layout: 'number-pad', columns: 3 }),
      grid('dotted-numbers', '带点数字', [
        ['⒈', '⒉', '⒊'], ['⒋', '⒌', '⒍'], ['⒎', '⒏', '⒐'], [null, '⒑', null],
        ['⒒', '⒓', '⒔'], ['⒕', '⒖', '⒗'], ['⒘', '⒙', '⒚'], [null, '⒛', null],
      ], { layout: 'number-pad', columns: 3 }),
      grid('parenthesized-numbers', '括号数字', [
        ['⑴', '⑵', '⑶'], ['⑷', '⑸', '⑹'], ['⑺', '⑻', '⑼'], [null, '⑽', null],
        ['⑾', '⑿', '⒀'], ['⒁', '⒂', '⒃'], ['⒄', '⒅', '⒆'], [null, '⒇', null],
      ], { layout: 'number-pad', columns: 3 }),
      grid('roman-uppercase', '罗马数字 · 大写', [
        ['Ⅰ', 'Ⅱ', 'Ⅲ'], ['Ⅳ', 'Ⅴ', 'Ⅵ'], ['Ⅶ', 'Ⅷ', 'Ⅸ'], ['Ⅹ', 'Ⅺ', 'Ⅻ'],
      ], { layout: 'number-pad', columns: 3 }),
      grid('roman-lowercase', '罗马数字 · 小写', [
        ['ⅰ', 'ⅱ', 'ⅲ'], ['ⅳ', 'ⅴ', 'ⅵ'], ['ⅶ', 'ⅷ', 'ⅸ'], ['ⅹ', 'ⅺ', 'ⅻ'],
      ], { layout: 'number-pad', columns: 3 }),
      grid('chinese-numbers', '中文序号', [
        ['㈠', '㈡', '㈢', '㈣', '㈤'],
        ['㈥', '㈦', '㈧', '㈨', '㈩'],
      ], { columns: 5 }),
    ],
  },
  {
    id: 'brackets',
    label: '括号',
    groups: [
      grid('bracket-pairs', '成对括号', [
        ['【', '】'], ['〔', '〕'], ['「', '」'], ['『', '』'], ['〈', '〉'],
        ['《', '》'], ['（', '）'], ['［', '］'], ['｛', '｝'],
      ], { layout: 'pairs', columns: 2 }),
    ],
  },
  {
    id: 'cjk',
    label: '汉字结构',
    groups: [
      grid('ideographic-basic', '基本结构', [
        ['⿰', '⿱'], ['⿲', '⿳'], ['⿴', '⿻'],
      ], {
        layout: 'labeled',
        columns: 2,
        labels: {
          '⿰': '左右', '⿱': '上下', '⿲': '左中右', '⿳': '上中下',
          '⿴': '全包围', '⿻': '重叠',
        },
      }),
      grid('ideographic-surround', '包围结构', [
        [null, '⿵', null],
        ['⿷', '⿴', '⿹'],
        ['⿸', '⿻', '⿺'],
        [null, '⿶', null],
      ], {
        layout: 'spatial-labeled',
        columns: 3,
        labels: {
          '⿵': '上包围', '⿶': '下包围', '⿷': '左包围', '⿸': '左上包围',
          '⿹': '右上包围', '⿺': '左下包围', '⿴': '全包围', '⿻': '重叠',
        },
      }),
      grid('ideographic-extra', '其他结构', [
        ['⿼', '⿽'], ['⿾', '⿿'], ['〿', '㊣'],
      ], { layout: 'pairs', columns: 2 }),
    ],
  },
  {
    id: 'math',
    label: '数学',
    groups: [
      grid('math-common', '常用数学', [
        ['±', '×', '÷', '≠', '≈'],
        ['≤', '≥', '∞', '∑', '√'],
        ['∅', 'Δ', 'μ', 'Ω', '°'],
        ['℃', '％', '‰', '©', '®'],
        ['™', '✓', '✕', '•', '·'],
      ], { columns: 5 }),
    ],
  },
] as const;

export function searchSymbols(query: string, sectionId = ''): SymbolGroup[] {
  const normalized = query.trim().toLocaleLowerCase();
  return SYMBOL_SECTIONS
    .filter((section) => !sectionId || section.id === sectionId)
    .flatMap((section) => section.groups)
    .map((item) => {
      if (!normalized) return item;
      const groupMatches = [item.label, ...(item.aliases ?? [])]
        .some((value) => value.toLocaleLowerCase().includes(normalized));
      const cells = item.cells.map((symbol) => {
        if (!symbol || groupMatches) return symbol;
        const label = item.labels?.[symbol] ?? '';
        return symbol.toLocaleLowerCase().includes(normalized)
          || label.toLocaleLowerCase().includes(normalized)
          ? symbol
          : null;
      });
      return {
        ...item,
        cells,
        symbols: cells.filter((symbol): symbol is string => Boolean(symbol)),
      };
    })
    .filter((item) => item.symbols.length > 0);
}
