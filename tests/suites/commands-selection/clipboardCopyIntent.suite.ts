import { describe, expect, it, vi } from 'vitest';
import {
  readImageResourceFromTransfer,
  resolveClipboardCopyIntent,
  writeImageResourceToClipboard,
  writeImageResourceToTransfer,
  type ClipboardImageResource,
} from '../../../src/editor/clipboardCopyIntent';

const resource = (kind: 'image' | 'clipart' = 'image'): ClipboardImageResource => ({
  kind,
  source: 'data:image/png;base64,AAAA',
  title: kind === 'clipart' ? '流程剪贴图' : '流程图片',
});

describe('clipboard copy intent', () => {
  it('lets a directly right-clicked resource override stale text and node selections', () => {
    const direct = resource('clipart');

    expect(resolveClipboardCopyIntent({
      trigger: 'context-menu',
      hasTextSelection: true,
      directResource: direct,
      selectedResource: resource(),
      hasNodeSelection: true,
    })).toEqual({ kind: 'resource', resource: direct });
  });

  it('copies a live text selection before a keyboard-selected resource or node', () => {
    expect(resolveClipboardCopyIntent({
      trigger: 'keyboard',
      hasTextSelection: true,
      directResource: null,
      selectedResource: resource(),
      hasNodeSelection: true,
    })).toEqual({ kind: 'text' });
  });

  it('copies the selected resource before a non-editing node', () => {
    const selected = resource();

    expect(resolveClipboardCopyIntent({
      trigger: 'keyboard',
      hasTextSelection: false,
      directResource: null,
      selectedResource: selected,
      hasNodeSelection: true,
    })).toEqual({ kind: 'resource', resource: selected });
  });

  it('copies nodes only when no text or resource selection owns the operation', () => {
    expect(resolveClipboardCopyIntent({
      trigger: 'keyboard',
      hasTextSelection: false,
      directResource: null,
      selectedResource: null,
      hasNodeSelection: true,
    })).toEqual({ kind: 'nodes' });
  });

  it('does not steal copy when no YeMind selection exists', () => {
    expect(resolveClipboardCopyIntent({
      trigger: 'keyboard',
      hasTextSelection: false,
      directResource: null,
      selectedResource: null,
      hasNodeSelection: false,
    })).toEqual({ kind: 'none' });
  });
});

describe('clipboard image resource payloads', () => {
  it('writes safe HTML and a useful plain-text fallback to an event transfer', () => {
    const values: Record<string, string> = {};

    writeImageResourceToTransfer(resource(), {
      setData(type, value) {
        values[type] = value;
      },
    });

    expect(values['text/plain']).toBe('流程图片');
    expect(values['text/html']).toContain('<img');
    expect(values['text/html']).toContain('src="data:image/png;base64,AAAA"');
    expect(values['text/html']).toContain('alt="流程图片"');
  });

  it('writes binary image data together with HTML and text when ClipboardItem is available', async () => {
    const write = vi.fn(async () => undefined);
    const fetchBlob = vi.fn(async () => new Blob(['png'], { type: 'image/png' }));
    class FakeClipboardItem {
      constructor(readonly data: Record<string, Blob>) {}
    }

    const result = await writeImageResourceToClipboard(resource(), {
      clipboard: { write },
      ClipboardItemCtor: FakeClipboardItem as unknown as typeof ClipboardItem,
      fetchBlob,
    });

    expect(result).toBe('binary');
    expect(fetchBlob).toHaveBeenCalledWith('data:image/png;base64,AAAA');
    expect(write).toHaveBeenCalledOnce();
    const item = write.mock.calls[0][0][0] as unknown as FakeClipboardItem;
    expect(Object.keys(item.data)).toEqual(expect.arrayContaining([
      'image/png',
      'text/html',
      'text/plain',
    ]));
  });

  it('falls back to text without turning the operation into node copy when image loading fails', async () => {
    const writeText = vi.fn(async () => undefined);

    const result = await writeImageResourceToClipboard(resource(), {
      clipboard: { writeText },
      fetchBlob: vi.fn(async () => {
        throw new Error('blocked');
      }),
    });

    expect(result).toBe('text');
    expect(writeText).toHaveBeenCalledWith('流程图片');
  });

  it('round-trips YeMind image metadata from HTML before a browser-reencoded file fallback', () => {
    expect(readImageResourceFromTransfer({
      getData: (type) => type === 'text/html'
        ? '<img src="data:image/png;base64,ORIGINAL" alt="流程图片" data-yemind-resource-kind="image">'
        : '',
    })).toEqual({
      kind: 'image',
      source: 'data:image/png;base64,ORIGINAL',
      title: '流程图片',
    });
  });

  it('accepts a third-party HTML image without trusting arbitrary resource kinds', () => {
    expect(readImageResourceFromTransfer({
      getData: (type) => type === 'text/html'
        ? '<p><img src="https://example.com/diagram.png" alt="第三方图" data-yemind-resource-kind="script"></p>'
        : '',
    })).toEqual({
      kind: 'image',
      source: 'https://example.com/diagram.png',
      title: '第三方图',
    });
  });

  it('rejects unsafe HTML image sources', () => {
    expect(readImageResourceFromTransfer({
      getData: (type) => type === 'text/html'
        ? '<img src="javascript:alert(1)" alt="危险">'
        : '',
    })).toBeNull();
  });
});
