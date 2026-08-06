import { describe, expect, it, vi } from 'vitest';
import {
  isEmptyRichTextDocument,
  resolveFocusRestoreRange,
} from '../../../src/editor/YeMindRichText';
import { remeasureWhenFontsReady } from '../../../src/core/firstPaintGeometry';
import { NODE_AUTO_WRAP_CHARACTERS, nodeAutoWrapWidth } from '../../../src/core/createMindMap';
import { resolveTextAutoWrapWidth } from 'simple-mind-map/src/core/render/node/nodeCreateContents';
import Render from 'simple-mind-map/src/core/render/Render';

describe('v1.9.9-rc.6 canvas edit focus recovery', () => {
  it('restores the first known selection instead of collapsing to the end of the text', () => {
    // The order matters: a live non-collapsed selection wins, then the paste
    // range, then whatever Quill still reports, then the last recorded range.
    expect(resolveFocusRestoreRange([{ index: 2, length: 5 }, null, null, null], 99))
      .toEqual({ index: 2, length: 5 });
    expect(resolveFocusRestoreRange([null, null, null, { index: 0, length: 3 }], 99))
      .toEqual({ index: 0, length: 3 });
  });

  it('keeps a freshly inserted node fully selected across a host focus steal', () => {
    // `range` holds only non-collapsed selections and is cleared on every
    // keystroke; `quill.getSelection()` is null while focus sits elsewhere. The
    // insertion's own select-all therefore survives only through the recorded
    // range -- without it the caret collapsed to the end and typing appended to
    // 新节点 instead of replacing it.
    expect(resolveFocusRestoreRange([null, null, null, { index: 0, length: 3 }], 3))
      .toEqual({ index: 0, length: 3 });
  });

  it('collapses to the end only when nothing at all is known', () => {
    expect(resolveFocusRestoreRange([null, undefined, null, null], 7))
      .toEqual({ index: 7, length: 0 });
    expect(resolveFocusRestoreRange([], 0)).toEqual({ index: 0, length: 0 });
  });

  it('treats a collapsed recorded caret as a real position, not as "nothing known"', () => {
    expect(resolveFocusRestoreRange([null, null, null, { index: 4, length: 0 }], 99))
      .toEqual({ index: 4, length: 0 });
  });
});


describe('v1.9.9-rc.7 first-paint geometry and cached editor text', () => {
  it('re-measures every node once the fonts it was rendered with have loaded', async () => {
    let resolveFonts: (() => void) | null = null;
    const fonts = { status: 'loading', ready: new Promise<void>((resolve) => { resolveFonts = resolve; }) };
    const mindMap: any = { render: vi.fn() };

    remeasureWhenFontsReady(mindMap, fonts);
    expect(mindMap.render).not.toHaveBeenCalled();

    resolveFonts?.();
    await fonts.ready;
    await Promise.resolve();
    // `changeTheme` is the one render source upstream treats as "geometry is
    // stale"; any other source only re-lays out the cached sizes.
    expect(mindMap.render).toHaveBeenCalledWith(null, 'changeTheme');
  });

  it('does nothing on a warm start where the fonts already resolved', () => {
    const mindMap: any = { render: vi.fn() };
    remeasureWhenFontsReady(mindMap, { status: 'loaded', ready: Promise.resolve() });
    expect(mindMap.render).not.toHaveBeenCalled();
    remeasureWhenFontsReady(mindMap, null);
    expect(mindMap.render).not.toHaveBeenCalled();
  });

  it('never re-measures under an open editor or after the map was torn down', async () => {
    const editing: any = { render: vi.fn(), richText: { showTextEdit: true } };
    const editingFonts = { status: 'loading', ready: Promise.resolve() };
    remeasureWhenFontsReady(editing, editingFonts);
    await editingFonts.ready;
    await Promise.resolve();
    expect(editing.render).not.toHaveBeenCalled();

    const torn: any = { render: vi.fn() };
    const tornFonts = { status: 'loading', ready: Promise.resolve() };
    remeasureWhenFontsReady(torn, tornFonts)();
    await tornFonts.ready;
    await Promise.resolve();
    expect(torn.render).not.toHaveBeenCalled();
  });

  it('treats a Quill empty document as no cached editor text', () => {
    // Upstream rebuilds a scaled editor from `cacheEditingText || nodeText`.
    // `<p><br></p>` is truthy, so without this an editor rebuilt before its
    // content mounted replaced a node's real text with a blank document.
    expect(isEmptyRichTextDocument('<p><br></p>')).toBe(true);
    expect(isEmptyRichTextDocument('<p></p><p>&nbsp;</p>')).toBe(true);
    expect(isEmptyRichTextDocument('')).toBe(true);
    expect(isEmptyRichTextDocument('<p>新节点</p>')).toBe(false);
    expect(isEmptyRichTextDocument('<p><img src="x"></p>')).toBe(false);
    expect(isEmptyRichTextDocument('<p><span class="ql-formula" data-value="x"></span></p>')).toBe(false);
  });
});

describe('v1.9.9-rc.8 per-node auto wrap width', () => {
  const styled = (fontSize: unknown) => ({ getStyle: (prop: string) => (prop === 'fontSize' ? fontSize : '') });

  it('caps auto width at 20 characters of the node own font size', () => {
    // A CJK glyph advances one em, so the limit in pixels is characters * fontSize.
    expect(NODE_AUTO_WRAP_CHARACTERS).toBe(20);
    expect(nodeAutoWrapWidth(styled(14))).toBe(280);
    expect(nodeAutoWrapWidth(styled(18))).toBe(360);
    expect(nodeAutoWrapWidth(styled(26))).toBe(520);
  });

  it('resolves per node instead of one global pixel constant', () => {
    // The whole reason for the vendor extension: one pixel number cannot mean
    // 20 characters for a 26px root and a 14px ordinary node at the same time.
    expect(nodeAutoWrapWidth(styled(26))).not.toBe(nodeAutoWrapWidth(styled(14)));
  });

  it('falls back to the ordinary node size when the style is missing or unusable', () => {
    expect(nodeAutoWrapWidth(null)).toBe(280);
    expect(nodeAutoWrapWidth(styled(''))).toBe(280);
    expect(nodeAutoWrapWidth(styled(0))).toBe(280);
    expect(nodeAutoWrapWidth(styled(Number.NaN))).toBe(280);
  });

  it('accepts a number, a function or nothing usable at the vendor resolver', () => {
    const node = { id: 'n1' };
    expect(resolveTextAutoWrapWidth({ opt: { textAutoWrapWidth: 500 } }, node)).toBe(500);
    expect(resolveTextAutoWrapWidth({ opt: { textAutoWrapWidth: (n: any) => (n === node ? 280 : 0) } }, node)).toBe(280);
    // Unusable values fall back to the documented upstream default.
    expect(resolveTextAutoWrapWidth({ opt: { textAutoWrapWidth: undefined } }, node)).toBe(500);
    expect(resolveTextAutoWrapWidth({ opt: { textAutoWrapWidth: () => -1 } }, node)).toBe(500);
  });
});

describe('v1.9.9-rc.9 upstream live node resizing', () => {
  function node(measured: Array<{ width: number; height: number }>, current = { width: 90, height: 24 }) {
    let index = 0;
    const layers: any[] = [];
    return {
      width: current.width + 24,
      height: current.height + 12,
      _textData: { id: 'original', width: current.width, height: current.height },
      nodeDataSnapshot: '{"text":"旧文本"}',
      getData: () => ({ text: '旧文本', uid: 'n1' }),
      layers,
      createTextNode: vi.fn(() => {
        const size = measured[Math.min(index, measured.length - 1)];
        index += 1;
        const layer = { id: `measured-${index}`, ...size };
        layers.push(layer);
        return layer;
      }),
      // Mirrors getNodeRect(): the node box is derived from _textData.
      getNodeRect(this: any) {
        return { width: this._textData.width + 24, height: this._textData.height + 12 };
      },
      layout: vi.fn(),
    };
  }

  function renderer() {
    const render = vi.fn((done?: () => void) => done?.());
    return {
      mindMap: { render },
      textEdit: { updateTextEditNode: vi.fn() },
      onNodeTextEditChange: Render.prototype.onNodeTextEditChange,
      render,
    };
  }

  it('resizes the node and repositions the editor when the measurement changed the box', () => {
    const host = renderer();
    const target = node([{ width: 300, height: 24 }]);
    host.onNodeTextEditChange.call(host, { node: target, text: '<p>更长的一段文字</p>' });

    expect(target._textData).toBe(target.layers[0]);
    expect(target.width).toBe(324);
    expect(target.layout).toHaveBeenCalledOnce();
    expect(host.render).toHaveBeenCalledOnce();
    expect(host.textEdit.updateTextEditNode).toHaveBeenCalledOnce();
    // Base#doLayout re-measures any node whose data changed since the last
    // render, and an edit session does mutate node data (the edited/pristine
    // marker). Without refreshing the snapshot the next render rebuilds this
    // node's text from the stale stored text and the live measurement is lost,
    // so the node never visibly resizes.
    expect(target.nodeDataSnapshot).toBe(JSON.stringify(target.getData()));
  });

  it('skips the tree relayout when typing did not change the node box', () => {
    // Most ticks of a typing burst grow the text within the line it already
    // occupies. Relaying out the tree anyway was the measured cost of the
    // pre-1.8.0 live-render pipeline.
    const host = renderer();
    const target = node([{ width: 90, height: 24 }]);
    host.onNodeTextEditChange.call(host, { node: target, text: '<p>同宽</p>' });

    expect(target.layout).not.toHaveBeenCalled();
    expect(host.render).not.toHaveBeenCalled();
    expect(host.textEdit.updateTextEditNode).not.toHaveBeenCalled();
    // Nothing was repainted, so the node must stay eligible for a real rebuild.
    expect(target.nodeDataSnapshot).toBe('{"text":"旧文本"}');
  });

  it('keeps the attached measured layer when it skips, so the editor still has a live rectangle', () => {
    const host = renderer();
    const target = node([{ width: 90, height: 24 }]);
    const attached = target._textData;
    host.onNodeTextEditChange.call(host, { node: target, text: '<p>同宽</p>' });
    // The freshly measured layer is detached; pointing _textData at it would
    // make the editor overlay follow a zero-sized rectangle.
    expect(target._textData).toBe(attached);
  });

  it('still resizes when only the height changed, so wrapping past the width limit grows downwards', () => {
    const host = renderer();
    const target = node([{ width: 90, height: 48 }]);
    host.onNodeTextEditChange.call(host, { node: target, text: '<p>换行了</p>' });

    expect(target.height).toBe(60);
    expect(target.layout).toHaveBeenCalledOnce();
    expect(host.render).toHaveBeenCalledOnce();
  });
});
