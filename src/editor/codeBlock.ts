export interface QuillRangeLike {
  index: number;
  length: number;
}

export interface CodeBlockSnapshot {
  index: number;
  length: number;
  code: string;
  language: string;
}

interface QuillLineLike {
  offset(scroll: unknown): number;
  length(): number;
  formats(): Record<string, unknown>;
}

interface QuillCodeApi {
  scroll?: unknown;
  getLines(index?: number, length?: number): QuillLineLike[];
  getText(index: number, length: number): string;
  deleteText(index: number, length: number, source?: string): void;
  insertText(index: number, text: string, source?: string): void;
  formatLine(index: number, length: number, name: string, value: unknown, source?: string): void;
  setSelection(index: number, length: number, source?: string): void;
}

function codeLanguage(line: QuillLineLike): string | null {
  const value = line.formats()?.['code-block'];
  if (!value) return null;
  return typeof value === 'string' ? value : 'plain';
}

export function findCurrentCodeBlock(quill: QuillCodeApi, range: QuillRangeLike | null | undefined): CodeBlockSnapshot | null {
  if (!range) return null;
  const lines = quill.getLines();
  if (!Array.isArray(lines) || lines.length === 0) return null;
  const selectionStart = range.index;
  const selectionEnd = range.index + Math.max(range.length, 1);
  const selectedIndex = lines.findIndex((line) => {
    const start = line.offset(quill.scroll);
    const end = start + line.length();
    return selectionStart < end && selectionEnd > start;
  });
  if (selectedIndex < 0 || !codeLanguage(lines[selectedIndex])) return null;

  let first = selectedIndex;
  let last = selectedIndex;
  while (first > 0 && codeLanguage(lines[first - 1])) first -= 1;
  while (last < lines.length - 1 && codeLanguage(lines[last + 1])) last += 1;

  const index = lines[first].offset(quill.scroll);
  const length = lines.slice(first, last + 1).reduce((sum, line) => sum + line.length(), 0);
  const language = codeLanguage(lines[selectedIndex]) ?? 'plain';
  return {
    index,
    length,
    code: quill.getText(index, length).replace(/\n$/, ''),
    language,
  };
}

export function replaceCodeBlock(
  quill: Pick<QuillCodeApi, 'deleteText' | 'insertText' | 'formatLine' | 'setSelection'>,
  target: QuillRangeLike,
  code: string,
  language = 'plain',
): void {
  const normalized = code.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  if (target.length > 0) quill.deleteText(target.index, target.length, 'user');
  const inserted = `${normalized}\n`;
  quill.insertText(target.index, inserted, 'user');
  quill.formatLine(target.index, inserted.length, 'code-block', language || 'plain', 'user');
  quill.setSelection(target.index + inserted.length, 0, 'silent');
}

export function removeCodeBlockFormat(
  quill: Pick<QuillCodeApi, 'formatLine'>,
  block: CodeBlockSnapshot,
): void {
  quill.formatLine(block.index, block.length, 'code-block', false, 'user');
}

export function deleteCodeBlock(
  quill: Pick<QuillCodeApi, 'deleteText' | 'setSelection'>,
  block: CodeBlockSnapshot,
): void {
  quill.deleteText(block.index, block.length, 'user');
  quill.setSelection(block.index, 0, 'silent');
}
