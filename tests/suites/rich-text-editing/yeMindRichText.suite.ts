import { describe, expect, it, vi } from 'vitest';
import {
  canvasTextPayloadMatchesNode,
  normalizeCanvasTextPayload,
  YEMIND_RICH_TEXT_FORMATS,
  writeQuillSelectionToClipboard,
} from '../../../src/editor/YeMindRichText';
import {
  clearNodeClipboard,
  createNodeClipboardPayload,
  publishNodeClipboard,
  readNodeClipboard,
} from '../../../src/editor/nodeClipboard';

describe('YeMindRichText', () => {
  it('enables the upstream rich formats plus inline links and code formats', () => {
    expect(YEMIND_RICH_TEXT_FORMATS).toEqual(expect.arrayContaining([
      'bold', 'italic', 'underline', 'strike', 'color', 'background',
      'font', 'size', 'formula', 'align', 'link', 'code', 'code-block',
    ]));
  });

  it('copies the Quill range even when the browser DOM selection is no longer available', () => {
    const values: Record<string, string> = {};
    const preventDefault = vi.fn();
    const event = {
      clipboardData: {
        setData: (format: string, value: string) => { values[format] = value; },
      },
      preventDefault,
    } as unknown as ClipboardEvent;
    const quill = {
      getSelection: () => null,
      getText: (index: number, length: number) => index === 2 && length === 4 ? '节点文字' : '',
      getSemanticHTML: (index: number, length: number) =>
        index === 2 && length === 4 ? '<strong>节点文字</strong>' : '',
    };

    expect(writeQuillSelectionToClipboard(quill, event, { index: 2, length: 4 })).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(values).toEqual({
      'text/plain': '节点文字',
      'text/html': '<strong>节点文字</strong>',
    });
  });

  it('keeps the saved non-collapsed range when Quill temporarily reports a collapsed caret', () => {
    const values: Record<string, string> = {};
    const preventDefault = vi.fn();
    const event = {
      clipboardData: {
        setData: (format: string, value: string) => { values[format] = value; },
      },
      preventDefault,
    } as unknown as ClipboardEvent;
    const quill = {
      getSelection: () => ({ index: 7, length: 0 }),
      getText: (index: number, length: number) =>
        index === 0 && length === 5 ? 'Event' : '',
      getSemanticHTML: (index: number, length: number) =>
        index === 0 && length === 5 ? '<p>Event</p>' : '',
    };

    expect(writeQuillSelectionToClipboard(
      quill,
      event,
      { index: 0, length: 5 },
    )).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(values['text/plain']).toBe('Event');
  });

  it('clears a previous node payload when copy comes from a real canvas text selection', () => {
    clearNodeClipboard();
    publishNodeClipboard(createNodeClipboardPayload({
      sourceDocumentId: 'source-map',
      sourceSurface: 'canvas',
      nodes: [{ data: { uid: 'old-node', text: '节点文字' }, children: [] }],
    }));
    const event = {
      clipboardData: { setData: vi.fn() },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;
    const quill = {
      getSelection: () => ({ index: 0, length: 4 }),
      getText: () => '节点文字',
      getSemanticHTML: () => '<p>节点文字</p>',
    };

    expect(writeQuillSelectionToClipboard(quill, event, null)).toBe(true);
    expect(readNodeClipboard()).toBeNull();
  });

  it('leaves native copy untouched when there is no real text range', () => {
    const preventDefault = vi.fn();
    const event = {
      clipboardData: { setData: vi.fn() },
      preventDefault,
    } as unknown as ClipboardEvent;
    const quill = {
      getSelection: () => ({ index: 0, length: 0 }),
      getText: vi.fn(),
    };

    expect(writeQuillSelectionToClipboard(quill, event, null)).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('keeps Quill paragraph wrappers on the plain-text measurement path', () => {
    expect(normalizeCanvasTextPayload('<p>访问、启动、建链、枚举、传输</p>')).toEqual({
      text: '访问、启动、建链、枚举、传输',
      richText: false,
    });
    expect(normalizeCanvasTextPayload('<p>第一行<br>第二行</p>')).toEqual({
      text: '第一行\n第二行',
      richText: false,
    });
    expect(normalizeCanvasTextPayload('<p>&nbsp; </p>')).toEqual({
      text: '',
      richText: false,
    });
    expect(normalizeCanvasTextPayload(
      '<p>Gen1/2/3/4/5 逐级升速；</p><p>Gen5 Equalization；</p><p><br></p>',
    )).toEqual({
      text: 'Gen1/2/3/4/5 逐级升速；\nGen5 Equalization；',
      richText: false,
    });
  });

  it('uses rich-text measurement only when a real format exists', () => {
    expect(normalizeCanvasTextPayload('<p><strong>pcie bringup</strong></p>')).toEqual({
      text: '<p><strong>pcie bringup</strong></p>',
      richText: true,
    });
  });

  it('removes empty boundary paragraphs from formatted text before node measurement', () => {
    expect(normalizeCanvasTextPayload(
      '<p><br></p><p><strong>1.1 Event Counter 事件计数器</strong></p><p><br></p>',
    )).toEqual({
      text: '<p><strong>1.1 Event Counter 事件计数器</strong></p>',
      richText: true,
    });
  });

  it('does not create a render transaction when an edit closes without changing canonical text', () => {
    expect(canvasTextPayloadMatchesNode(
      { text: '第一行\n第二行', richText: false },
      { text: '第一行\n第二行', richText: false },
    )).toBe(true);
    expect(canvasTextPayloadMatchesNode(
      { text: '<p><strong>节点</strong></p>', richText: true },
      { text: '<p><strong>节点</strong></p>', richText: true },
    )).toBe(true);
    expect(canvasTextPayloadMatchesNode(
      { text: '节点', richText: false },
      { text: '节点已修改', richText: false },
    )).toBe(false);
  });
});
