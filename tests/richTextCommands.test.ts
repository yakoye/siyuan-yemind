import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../src/core/commands';

function fakeMindMap() {
  const quill = {
    getFormat: vi.fn(() => ({ link: 'https://example.com', code: true })),
    getLines: vi.fn(() => []),
    getText: vi.fn(() => 'selected'),
    deleteText: vi.fn(),
    insertText: vi.fn(),
    formatLine: vi.fn(),
    setSelection: vi.fn(),
  };
  return {
    execCommand: vi.fn(),
    view: { fit: vi.fn(), reset: vi.fn(), enlarge: vi.fn(), narrow: vi.fn() },
    renderer: { startTextEdit: vi.fn(), activeNodeList: [{}], toggleActiveExpand: vi.fn() },
    richText: {
      range: { index: 3, length: 8 },
      lastRange: null,
      quill,
      formatText: vi.fn(),
      removeFormat: vi.fn(),
    },
  };
}

describe('rich text command adapter', () => {
  it('reads, applies and removes the selected inline link', () => {
    const map = fakeMindMap();
    const commands = createCommandAdapter(map as never);

    expect(commands.getSelectedInlineLink()).toBe('https://example.com');
    commands.setInlineLink('https://openai.com');
    commands.setInlineLink(null);

    expect(map.richText.formatText.mock.calls).toEqual([
      [{ link: 'https://openai.com' }],
      [{ link: false }],
    ]);
  });

  it('toggles inline code from the current selection format', () => {
    const map = fakeMindMap();
    const commands = createCommandAdapter(map as never);

    commands.toggleInlineCode();

    expect(map.richText.formatText).toHaveBeenCalledWith({ code: false });
  });
});
