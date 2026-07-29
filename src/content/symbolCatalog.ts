export interface SymbolGroup {
  id: string;
  label: string;
  symbols: readonly string[];
}

export interface SymbolSection {
  id: string;
  label: string;
  groups: readonly SymbolGroup[];
}

const group = (id: string, label: string, symbols: readonly (string | null)[]): SymbolGroup => ({
  id,
  label,
  symbols: symbols.filter((symbol): symbol is string => Boolean(symbol)),
});

export const SYMBOL_SECTIONS: readonly SymbolSection[] = [
  {
    id: 'arrows',
    label: '箭头',
    groups: [
      group('basic-directions', '基础方向', ['↖', '↑', '↗', '←', null, '→', '↙', '↓', '↘']),
      group('curved-directions', '弯曲与长箭头', ['↜', '↟', '↝', '↞', '↔', '↠', '↚', '↡', '↛']),
      group('special-arrows', '双向与特殊', ['↢', '↣', '↨', '↭', '↮', '↯', '⇐', '⇔', '⇒']),
    ],
  },
  {
    id: 'shapes',
    label: '形状',
    groups: [
      group('solid-directions', '实心方向', ['▲', '◀', '▶', '▼']),
      group('outline-directions', '空心方向', ['△', '◁', '▷', '▽']),
      group('small-directions', '小型方向', ['▴', '◂', '▸', '▾']),
      group('thin-directions', '细型方向', ['▵', '◃', '▹', '▿']),
      group('shape-pairs', '形状成对', ['●', '○', '◆', '◇', '■', '□', '▰', '▱', '◪', '◩', '◻', '◼']),
    ],
  },
  {
    id: 'numbers',
    label: '数字',
    groups: [
      group('circled-numbers', '圆圈数字', ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']),
      group('dotted-numbers', '带点数字', ['⒈', '⒉', '⒊', '⒋', '⒌', '⒍', '⒎', '⒏', '⒐', '⒑', '⒒', '⒓', '⒔', '⒕', '⒖', '⒗', '⒘', '⒙', '⒚', '⒛']),
      group('parenthesized-numbers', '括号数字', ['⑴', '⑵', '⑶', '⑷', '⑸', '⑹', '⑺', '⑻', '⑼', '⑽', '⑾', '⑿', '⒀', '⒁', '⒂', '⒃', '⒄', '⒅', '⒆', '⒇']),
      group('roman-uppercase', '罗马数字 · 大写', ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ']),
      group('roman-lowercase', '罗马数字 · 小写', ['ⅰ', 'ⅱ', 'ⅲ', 'ⅳ', 'ⅴ', 'ⅵ', 'ⅶ', 'ⅷ', 'ⅸ', 'ⅹ', 'ⅺ', 'ⅻ']),
      group('chinese-numbers', '中文序号', ['㈠', '㈡', '㈢', '㈣', '㈤', '㈥', '㈦', '㈧', '㈨', '㈩']),
    ],
  },
  {
    id: 'brackets',
    label: '括号',
    groups: [
      group('bracket-pairs', '成对括号', ['【', '】', '〔', '〕', '「', '」', '『', '』', '〈', '〉', '《', '》', '（', '）', '［', '］', '｛', '｝']),
    ],
  },
  {
    id: 'cjk',
    label: '汉字结构',
    groups: [
      group('ideographic-basic', '基本结构', ['⿰', '⿱', '⿲', '⿳', '⿴', '⿻']),
      group('ideographic-surround', '包围结构', ['⿵', '⿷', '⿴', '⿹', '⿸', '⿻', '⿺', '⿶']),
      group('ideographic-extra', '其他结构', ['⿼', '⿽', '⿾', '⿿', '〿', '㊣']),
    ],
  },
  {
    id: 'math',
    label: '数学',
    groups: [
      group('math-common', '常用数学', ['±', '×', '÷', '≠', '≈', '≤', '≥', '∞', '∑', '√', '∅', 'Δ', 'μ', 'Ω', '°', '℃', '％', '‰', '©', '®', '™', '✓', '✕', '•', '·']),
    ],
  },
] as const;

export function searchSymbols(query: string, sectionId = ''): SymbolGroup[] {
  const normalized = query.trim().toLocaleLowerCase();
  return SYMBOL_SECTIONS
    .filter((section) => !sectionId || section.id === sectionId)
    .flatMap((section) => section.groups)
    .map((item) => ({
      ...item,
      symbols: normalized
        ? item.symbols.filter((symbol) => symbol.toLocaleLowerCase().includes(normalized))
        : item.symbols,
    }))
    .filter((item) => item.symbols.length > 0);
}
