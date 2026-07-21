import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../src/core/commands';

function node(data: Record<string, unknown> = {}) {
  return { getData: vi.fn((key?: string) => key ? data[key] : data) };
}

function fakeMindMap() {
  const active = node({
    yemindTodo: undefined,
    yemindComments: [],
  });
  return {
    execCommand: vi.fn(),
    view: { fit: vi.fn(), reset: vi.fn(), enlarge: vi.fn(), narrow: vi.fn() },
    renderer: {
      startTextEdit: vi.fn(),
      activeNodeList: [active],
      toggleActiveExpand: vi.fn(),
    },
    richText: { formatText: vi.fn() },
    associativeLine: { createLineFromActiveNode: vi.fn() },
  };
}

describe('node content commands', () => {
  it('maps built-in node metadata to native simple-mind-map commands', () => {
    const map = fakeMindMap();
    const commands = createCommandAdapter(map as never);

    commands.setNote('note');
    commands.setTags(['PCIe', 'ATS']);
    commands.setIcons(['priority_1']);
    commands.setLink('https://example.com', 'Example');
    commands.setImage({ url: 'data:image/png;base64,a', width: 100, height: 60, title: 'diagram' });
    commands.insertFormula('e=mc^2');
    commands.addSummary();
    commands.startRelation();

    expect(map.execCommand.mock.calls).toEqual([
      ['SET_NODE_NOTE', map.renderer.activeNodeList[0], 'note'],
      ['SET_NODE_TAG', map.renderer.activeNodeList[0], ['PCIe', 'ATS']],
      ['SET_NODE_ICON', map.renderer.activeNodeList[0], ['priority_1']],
      ['SET_NODE_HYPERLINK', map.renderer.activeNodeList[0], 'https://example.com', 'Example'],
      ['SET_NODE_IMAGE', map.renderer.activeNodeList[0], { url: 'data:image/png;base64,a', width: 100, height: 60, title: 'diagram' }],
      ['INSERT_FORMULA', 'e=mc^2'],
      ['ADD_GENERALIZATION'],
    ]);
    expect(map.associativeLine.createLineFromActiveNode).toHaveBeenCalledOnce();
  });

  it('stores todo and comments on the selected node', () => {
    const map = fakeMindMap();
    const commands = createCommandAdapter(map as never);
    const comments = [{ id: 'c1', text: 'check this', createdAt: 1, updatedAt: 1 }];

    commands.toggleTodo();
    commands.setComments(comments);

    expect(map.execCommand).toHaveBeenNthCalledWith(1, 'SET_NODE_DATA', map.renderer.activeNodeList[0], {
      yemindTodo: { checked: false },
    });
    expect(map.execCommand).toHaveBeenNthCalledWith(2, 'SET_NODE_DATA', map.renderer.activeNodeList[0], {
      yemindComments: comments,
    });
  });

  it('uses the engine rich-text formatter including reversible cloze styling', () => {
    const map = fakeMindMap();
    const commands = createCommandAdapter(map as never);

    commands.formatText({ bold: true });
    commands.setCloze(true);
    commands.setCloze(false);

    expect(map.richText.formatText.mock.calls).toEqual([
      [{ bold: true }],
      [{ background: '#f5dfa0', color: 'transparent' }],
      [{ background: false, color: false }],
    ]);
  });

  it('replaces the active rich-text selection with a native formula embed', () => {
    const map = fakeMindMap() as any;
    map.richText = {
      range: { index: 3, length: 4 },
      lastRange: null,
      quill: {
        deleteText: vi.fn(),
        insertEmbed: vi.fn(),
        setSelection: vi.fn(),
      },
      formatText: vi.fn(),
    };
    const commands = createCommandAdapter(map as never);

    commands.insertFormula('e=mc^2');

    expect(map.richText.quill.deleteText).toHaveBeenCalledWith(3, 4);
    expect(map.richText.quill.insertEmbed).toHaveBeenCalledWith(3, 'formula', 'e=mc^2', 'user');
    expect(map.richText.quill.setSelection).toHaveBeenCalledWith(4, 0, 'silent');
    expect(map.execCommand).not.toHaveBeenCalledWith('INSERT_FORMULA', 'e=mc^2');
  });

  it('places a block formula on its own rich-text line', () => {
    const map = fakeMindMap() as any;
    map.richText = {
      range: { index: 2, length: 0 },
      lastRange: null,
      quill: {
        deleteText: vi.fn(),
        insertText: vi.fn(),
        insertEmbed: vi.fn(),
        setSelection: vi.fn(),
      },
      formatText: vi.fn(),
    };
    const commands = createCommandAdapter(map as never);

    commands.insertFormula('x^2', 'block');

    expect(map.richText.quill.insertText).toHaveBeenNthCalledWith(1, 2, '\n', 'user');
    expect(map.richText.quill.insertEmbed).toHaveBeenCalledWith(3, 'formula', '\\displaystyle{x^2}', 'user');
    expect(map.richText.quill.insertText).toHaveBeenNthCalledWith(2, 4, '\n', 'user');
  });

});
