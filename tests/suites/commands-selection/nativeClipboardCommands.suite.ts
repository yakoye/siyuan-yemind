import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../../../src/core/commands';
import {
  YEMIND_NODE_CLIPBOARD_MIME,
  bindCanvasNodeClipboard,
  clearNodeClipboard,
  createNodeClipboardPayload,
  nodeClipboardToOutline,
  prepareNodeClipboardForDestination,
  publishNodeClipboard,
  readNodeClipboard,
} from '../../../src/editor/nodeClipboard';

afterEach(() => vi.unstubAllGlobals());

function fakeMindMap() {
  const map: any = {
    opt: { disabledClipboard: true },
    execCommand: vi.fn(),
    view: {
      fit: vi.fn(),
      reset: vi.fn(),
      enlarge: vi.fn(),
      narrow: vi.fn(),
    },
    renderer: {
      activeNodeList: [{ isRoot: false }],
      toggleActiveExpand: vi.fn(),
      startTextEdit: vi.fn(),
      copy: vi.fn(),
      cut: vi.fn(),
      paste: vi.fn(async () => undefined),
      beingCopyData: [{ data: { text: 'copied' }, children: [] }],
    },
  };
  return map;
}

describe('native same-map clipboard commands', () => {
  it('delegates copy, cut, and paste directly to the native renderer', async () => {
    const map = fakeMindMap();
    const commands = createCommandAdapter(map);

    commands.copy();
    commands.cut();
    await commands.paste();

    expect(map.renderer.copy).toHaveBeenCalledOnce();
    expect(map.renderer.cut).toHaveBeenCalledOnce();
    expect(map.renderer.paste).toHaveBeenCalledOnce();
    expect(map.opt.disabledClipboard).toBe(true);
  });
});

describe('shared node clipboard transactions', () => {
  const nodes = () => ([
    {
      data: {
        uid: 'a',
        text: '<span style="color:#f00;background-color:#ff0;font-size:22px"><b>Alpha</b></span><span class="ql-formula" data-value="x^2">x²</span>',
        richText: true,
        fillColor: '#ff0000',
        borderColor: '#00ff00',
        customTextWidth: 240,
        yemindNote: { html: '<p>note</p>', createdAt: 1, updatedAt: 1 },
        image: 'data:image/png;base64,AAAA',
        imageTitle: '协议状态图',
        imageSize: { width: 96, height: 64, custom: true },
        yemindTodo: { checked: true, text: '完成验证' },
        tag: ['PCIe', '重点'],
        hyperlink: 'https://example.com/spec',
      },
      children: [{
        data: { uid: 'a1', text: 'Alpha child' },
        children: [],
      }],
    },
    {
      data: { uid: 'b', text: 'Beta', icon: ['priority_1'] },
      children: [],
    },
  ]);

  it.each([
    ['outline', 'outline'],
    ['canvas', 'canvas'],
    ['outline', 'canvas'],
    ['canvas', 'outline'],
  ] as const)('round-trips single, multiple and hierarchical nodes from %s to %s', (source, destination) => {
    const payload = createNodeClipboardPayload({
      sourceDocumentId: 'doc-a',
      sourceSurface: source,
      nodes: nodes(),
    });
    const prepared = prepareNodeClipboardForDestination(payload, 'doc-a', destination);
    const outline = nodeClipboardToOutline(prepared);

    expect(prepared.nodes).toHaveLength(2);
    expect(prepared.nodes[0].children[0].data.text).toBe('Alpha child');
    expect(outline.text).toBe('Alphax²\n    Alpha child\nBeta');
    expect(outline.lines.map((line) => [line.depth, line.text])).toEqual([
      [0, 'Alphax²'],
      [1, 'Alpha child'],
      [0, 'Beta'],
    ]);
  });

  it('preserves complete node formatting inside one file', () => {
    const payload = createNodeClipboardPayload({
      sourceDocumentId: 'doc-a',
      sourceSurface: 'canvas',
      nodes: nodes(),
    });
    const prepared = prepareNodeClipboardForDestination(payload, 'doc-a', 'outline');

    expect(prepared.nodes[0].data.text).toContain('font-size:22px');
    expect(prepared.nodes[0].data.fillColor).toBe('#ff0000');
    expect(prepared.nodes[0].data.customTextWidth).toBe(240);
    expect(prepared.nodes[0].data.yemindNote).toMatchObject({ html: '<p>note</p>' });
  });

  it('never exposes source node identities to any paste destination', () => {
    const payload = createNodeClipboardPayload({
      sourceDocumentId: 'doc-a',
      sourceSurface: 'outline',
      nodes: nodes(),
    });

    expect(payload.nodes[0].data).not.toHaveProperty('uid');
    expect(payload.nodes[0].children[0].data).not.toHaveProperty('uid');
  });

  it('drops presentation styling across files but keeps hierarchy, content and semantic formatting', () => {
    const payload = createNodeClipboardPayload({
      sourceDocumentId: 'doc-a',
      sourceSurface: 'outline',
      nodes: nodes(),
    });
    const prepared = prepareNodeClipboardForDestination(payload, 'doc-b', 'canvas');
    const first = prepared.nodes[0].data;

    expect(String(first.text)).toContain('<b>Alpha</b>');
    expect(String(first.text)).toContain('class="ql-formula"');
    expect(String(first.text)).toContain('data-value="x^2"');
    expect(String(first.text)).not.toMatch(/color|background|font-size/i);
    expect(first).not.toHaveProperty('fillColor');
    expect(first).not.toHaveProperty('borderColor');
    expect(first).not.toHaveProperty('customTextWidth');
    expect(first.yemindNote).toMatchObject({ html: '<p>note</p>' });
    expect(first.image).toBe('data:image/png;base64,AAAA');
    expect(first.imageTitle).toBe('协议状态图');
    expect(first.imageSize).toEqual({ width: 96, height: 64, custom: true });
    expect(first.yemindTodo).toEqual({ checked: true, text: '完成验证' });
    expect(first.tag).toEqual(['PCIe', '重点']);
    expect(first.hyperlink).toBe('https://example.com/spec');
    expect(prepared.nodes[0].children[0].data.text).toBe('Alpha child');
  });

  it('publishes one versioned payload that another open file can consume', () => {
    const store: Record<string, string> = {};
    const transfer = {
      setData: (type: string, value: string) => { store[type] = value; },
      getData: (type: string) => store[type] ?? '',
    };
    const payload = createNodeClipboardPayload({
      sourceDocumentId: 'doc-a',
      sourceSurface: 'outline',
      nodes: nodes(),
    });

    publishNodeClipboard(payload, transfer);
    const restored = readNodeClipboard(transfer);

    expect(store[YEMIND_NODE_CLIPBOARD_MIME]).toContain('"version":1');
    expect(restored).toMatchObject({
      version: 1,
      sourceDocumentId: 'doc-a',
      sourceSurface: 'outline',
    });
    expect(restored?.nodes).toHaveLength(2);
  });

  it('matches the shared node payload after the operating system normalizes line endings', () => {
    clearNodeClipboard();
    const payload = createNodeClipboardPayload({
      sourceDocumentId: 'doc-a',
      sourceSurface: 'canvas',
      nodes: nodes(),
    });
    publishNodeClipboard(payload);
    const windowsPlain = `${nodeClipboardToOutline(payload).text.replaceAll('\n', '\r\n')}\r\n`;

    const restored = readNodeClipboard({
      getData: (type: string) => type === 'text/plain' ? windowsPlain : '',
    });

    expect(restored?.nodes).toHaveLength(2);
    expect(restored?.sourceSurface).toBe('canvas');
  });

  it('matches an outline node payload when the browser preserves its absolute tree indentation', () => {
    clearNodeClipboard();
    const payload = createNodeClipboardPayload({
      sourceDocumentId: 'doc-a',
      sourceSurface: 'outline',
      nodes: nodes(),
    });
    publishNodeClipboard(payload);
    const absoluteOutlineText = nodeClipboardToOutline(payload).text
      .split('\n')
      .map((line) => `    ${line}`)
      .join('\n');

    const restored = readNodeClipboard({
      getData: (type: string) => type === 'text/plain' ? absoluteOutlineText : '',
    });

    expect(restored?.nodes).toHaveLength(2);
    expect(restored?.nodes[0].children[0].data.text).toBe('Alpha child');
  });

  it('moves copied canvas nodes between open files through the shared adapter', async () => {
    clearNodeClipboard();
    const source: any = {
      beingCopyData: nodes(),
      copy: vi.fn(),
      cut: vi.fn(),
      paste: vi.fn(),
    };
    const destination: any = {
      beingCopyData: null,
      copy: vi.fn(),
      cut: vi.fn(),
      paste: vi.fn(async () => undefined),
    };
    const unbindSource = bindCanvasNodeClipboard(source, () => 'doc-a');
    const unbindDestination = bindCanvasNodeClipboard(destination, () => 'doc-b');

    source.copy();
    await destination.paste();

    expect(destination.beingCopyData).toHaveLength(2);
    expect(destination.beingCopyData[0].data.text).toContain('<b>Alpha</b>');
    expect(destination.beingCopyData[0].data).not.toHaveProperty('fillColor');
    expect(destination.beingCopyData[0].children[0].data.text).toBe('Alpha child');
    unbindSource();
    unbindDestination();
  });

  it('lets a canvas destination consume nodes copied from an outline in another file', async () => {
    clearNodeClipboard();
    publishNodeClipboard(createNodeClipboardPayload({
      sourceDocumentId: 'outline-doc',
      sourceSurface: 'outline',
      nodes: nodes(),
    }));
    const destination: any = {
      beingCopyData: null,
      copy: vi.fn(),
      cut: vi.fn(),
      paste: vi.fn(async () => undefined),
    };
    const unbind = bindCanvasNodeClipboard(destination, () => 'canvas-doc');

    await destination.paste();

    expect(destination.beingCopyData).toHaveLength(2);
    expect(destination.beingCopyData[0].data).not.toHaveProperty('fillColor');
    expect(destination.beingCopyData[0].children[0].data.text).toBe('Alpha child');
    unbind();
  });

  it('pastes a matching shared tree through the native PASTE_NODE command instead of reparsing outline text', async () => {
    clearNodeClipboard();
    let systemText = '';
    vi.stubGlobal('navigator', {
      clipboard: {
        readText: vi.fn(async () => systemText),
        writeText: vi.fn(async (value: string) => { systemText = value; }),
      },
    });
    const source: any = {
      beingCopyData: nodes(),
      copy: vi.fn(),
    };
    const execCommand = vi.fn();
    const nativePaste = vi.fn(async () => undefined);
    const destination: any = {
      beingCopyData: null,
      mindMap: { execCommand },
      paste: nativePaste,
    };
    const unbindSource = bindCanvasNodeClipboard(source, () => 'doc-a');
    const unbindDestination = bindCanvasNodeClipboard(destination, () => 'doc-b');

    source.copy();
    await destination.paste();

    expect(execCommand).toHaveBeenCalledOnce();
    expect(execCommand.mock.calls[0][0]).toBe('PASTE_NODE');
    expect(execCommand.mock.calls[0][1]).toHaveLength(2);
    expect(execCommand.mock.calls[0][1][0].children[0].data.text).toBe('Alpha child');
    expect(nativePaste).not.toHaveBeenCalled();
    unbindSource();
    unbindDestination();
  });
});
