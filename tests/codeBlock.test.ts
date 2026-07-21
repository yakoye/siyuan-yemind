import { describe, expect, it, vi } from 'vitest';
import {
  deleteCodeBlock,
  findCurrentCodeBlock,
  removeCodeBlockFormat,
  replaceCodeBlock,
} from '../src/editor/codeBlock';

function line(index: number, text: string, language: string | false = false) {
  return {
    offset: vi.fn(() => index),
    length: vi.fn(() => text.length + 1),
    formats: vi.fn(() => language ? { 'code-block': language } : {}),
  };
}

describe('code block helpers', () => {
  it('finds contiguous code-block lines around the current selection', () => {
    const lines = [line(0, 'before'), line(7, 'const a = 1', 'typescript'), line(19, 'return a', 'typescript'), line(28, 'after')];
    const quill = {
      scroll: {},
      getLines: vi.fn(() => lines),
      getText: vi.fn((index: number, length: number) => index === 7 && length === 21 ? 'const a = 1\nreturn a\n' : ''),
    };

    expect(findCurrentCodeBlock(quill as never, { index: 12, length: 2 })).toEqual({
      index: 7,
      length: 21,
      code: 'const a = 1\nreturn a',
      language: 'typescript',
    });
  });

  it('replaces a selection with a language-aware code block', () => {
    const quill = {
      deleteText: vi.fn(),
      insertText: vi.fn(),
      formatLine: vi.fn(),
      setSelection: vi.fn(),
    };

    replaceCodeBlock(quill as never, { index: 4, length: 3 }, 'const x = 1;', 'javascript');

    expect(quill.deleteText).toHaveBeenCalledWith(4, 3, 'user');
    expect(quill.insertText).toHaveBeenCalledWith(4, 'const x = 1;\n', 'user');
    expect(quill.formatLine).toHaveBeenCalledWith(4, 13, 'code-block', 'javascript', 'user');
    expect(quill.setSelection).toHaveBeenCalledWith(17, 0, 'silent');
  });

  it('can remove only the code-block format or delete the whole code block', () => {
    const quill = { formatLine: vi.fn(), deleteText: vi.fn(), setSelection: vi.fn() };
    const block = { index: 2, length: 8, code: 'code', language: 'plain' };

    removeCodeBlockFormat(quill as never, block);
    deleteCodeBlock(quill as never, block);

    expect(quill.formatLine).toHaveBeenCalledWith(2, 8, 'code-block', false, 'user');
    expect(quill.deleteText).toHaveBeenCalledWith(2, 8, 'user');
    expect(quill.setSelection).toHaveBeenCalledWith(2, 0, 'silent');
  });
});
