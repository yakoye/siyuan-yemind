import { describe, expect, it, vi } from 'vitest';
import {
  LiveNodeTextGeometryController,
  createMeasuredTextData,
  textSizeChanged,
  type LiveTextGeometryTimers,
} from '../../../src/editor/liveNodeTextGeometry';
import {
  isEmptyRichTextDocument,
  resolveFocusRestoreRange,
} from '../../../src/editor/YeMindRichText';
import { remeasureWhenFontsReady } from '../../../src/core/firstPaintGeometry';
import { NODE_AUTO_WRAP_CHARACTERS, nodeAutoWrapWidth } from '../../../src/core/createMindMap';
import { resolveTextAutoWrapWidth } from 'simple-mind-map/src/core/render/node/nodeCreateContents';
import {
  EDITING_NODE_CLASS,
  EditingNodeTextSuppression,
} from '../../../src/editor/editingNodeTextSuppression';

interface Harness {
  mindMap: any;
  node: any;
  order: string[];
  created: any[];
  timers: LiveTextGeometryTimers & { run(): void; pending(): number };
  listeners: Record<string, Array<() => void>>;
}

function createHarness(options: {
  measured?: Array<{ width: number; height: number }>;
  currentWidth?: number;
  currentHeight?: number;
} = {}): Harness {
  const order: string[] = [];
  const created: any[] = [];
  const listeners: Record<string, Array<() => void>> = {};
  const sizes = options.measured ?? [{ width: 300, height: 24 }];
  let sizeIndex = 0;

  const node: any = {
    nodeData: { data: { uid: 'n1', text: '<p>旧文本</p>', richText: true } },
    children: [],
    getData: (key?: string) => (key ? node.nodeData.data[key] : node.nodeData.data),
    _textData: {
      node: { attr: vi.fn() },
      width: options.currentWidth ?? 90,
      height: options.currentHeight ?? 24,
    },
    createTextNode: vi.fn((html: string) => {
      const size = sizes[Math.min(sizeIndex, sizes.length - 1)];
      sizeIndex += 1;
      const value = { node: { attr: vi.fn() }, width: size.width, height: size.height, measuredFrom: html };
      created.push(value);
      order.push('createTextNode');
      return value;
    }),
    reRender: vi.fn(() => order.push('reRender')),
  };

  const mindMap: any = {
    richText: {
      showTextEdit: true,
      node,
      getEditText: () => '<p>正在输入的内容</p>',
      updateTextEditNode: vi.fn(() => order.push('updateTextEditNode')),
    },
    on: (name: string, handler: () => void) => {
      (listeners[name] ??= []).push(handler);
    },
    off: (name: string, handler: () => void) => {
      listeners[name] = (listeners[name] ?? []).filter((item) => item !== handler);
    },
    render: vi.fn((done?: () => void) => {
      order.push('render');
      done?.();
    }),
  };

  let queued: Array<() => void> = [];
  const timers = {
    set: (callback: () => void) => {
      queued.push(callback);
      return queued.length;
    },
    clear: () => { queued = []; },
    run: () => {
      const pending = queued;
      queued = [];
      pending.forEach((callback) => callback());
    },
    pending: () => queued.length,
  };

  return { mindMap, node, order, created, timers, listeners };
}

describe('v1.9.9 live canvas node geometry', () => {
  it('resizes the edited node to the text being typed instead of waiting for the commit', () => {
    const harness = createHarness({ measured: [{ width: 300, height: 48 }] });
    const controller = new LiveNodeTextGeometryController(harness.mindMap, { timers: harness.timers });

    controller.schedule();
    harness.timers.run();

    expect(harness.node._textData.width).toBe(300);
    expect(harness.node._textData.height).toBe(48);
    expect(harness.node.reRender).toHaveBeenCalledWith([], { ignoreUpdateCustomTextWidth: true });
    expect(harness.mindMap.render).toHaveBeenCalledWith(
      expect.any(Function),
      'yemind-live-node-text-geometry',
    );
    // The host is resized in the same synchronous block as the node, then
    // again after the tree layout placed it. Waiting only for the asynchronous
    // render callback leaves painted frames where the node already has the new
    // size but the editor covering it still has the old one.
    expect(harness.order).toEqual([
      'createTextNode',
      'reRender',
      'updateTextEditNode',
      'render',
      'updateTextEditNode',
    ]);
    controller.destroy();
  });

  it('shrinks the node when text is deleted, so a short node stops rendering an oversized frame', () => {
    const harness = createHarness({ currentWidth: 480, measured: [{ width: 26, height: 24 }] });
    const controller = new LiveNodeTextGeometryController(harness.mindMap, { timers: harness.timers });

    controller.schedule();
    harness.timers.run();

    expect(harness.node._textData.width).toBe(26);
    controller.destroy();
  });

  it('replaces the text layer before the node relayouts it, so ink and declared geometry stay identical', () => {
    const harness = createHarness({ measured: [{ width: 300, height: 24 }] });
    const controller = new LiveNodeTextGeometryController(harness.mindMap, { timers: harness.timers });

    controller.schedule();
    harness.timers.run();

    expect(harness.order.indexOf('createTextNode')).toBeLessThan(harness.order.indexOf('reRender'));
    expect(harness.order.indexOf('reRender')).toBeLessThan(harness.order.indexOf('render'));
    expect(harness.node._textData).toBe(harness.created[0]);
    controller.destroy();
  });

  it('measures the live editor text, which is exactly what the close commits', () => {
    const harness = createHarness({ measured: [{ width: 300, height: 24 }] });
    const controller = new LiveNodeTextGeometryController(harness.mindMap, { timers: harness.timers });

    controller.reconcile();

    expect(harness.node.createTextNode).toHaveBeenCalledWith('<p>正在输入的内容</p>');
    controller.destroy();
  });

  it('does no layout work when the typed text does not change the measured size', () => {
    const harness = createHarness({ currentWidth: 90, currentHeight: 24, measured: [{ width: 90, height: 24 }] });
    const controller = new LiveNodeTextGeometryController(harness.mindMap, { timers: harness.timers });

    expect(controller.reconcile()).toBe(false);
    expect(harness.node.reRender).not.toHaveBeenCalled();
    expect(harness.mindMap.render).not.toHaveBeenCalled();
    controller.destroy();
  });

  it('coalesces a typing burst into one reconcile', () => {
    const harness = createHarness({ measured: [{ width: 300, height: 24 }] });
    const controller = new LiveNodeTextGeometryController(harness.mindMap, { timers: harness.timers });

    controller.schedule();
    controller.schedule();
    controller.schedule();
    expect(harness.timers.pending()).toBe(1);
    harness.timers.run();
    expect(harness.mindMap.render).toHaveBeenCalledOnce();
    controller.destroy();
  });

  it('follows the upstream node_text_edit_change event and unsubscribes on destroy', () => {
    const harness = createHarness({ measured: [{ width: 300, height: 24 }] });
    const controller = new LiveNodeTextGeometryController(harness.mindMap, { timers: harness.timers });

    expect(harness.listeners.node_text_edit_change).toHaveLength(1);
    harness.listeners.node_text_edit_change[0]();
    harness.timers.run();
    expect(harness.mindMap.render).toHaveBeenCalledOnce();

    controller.destroy();
    expect(harness.listeners.node_text_edit_change).toHaveLength(0);
  });

  it('stays out of the way of a width-handle drag and of a closed edit session', () => {
    const dragging = createHarness({ measured: [{ width: 300, height: 24 }] });
    dragging.node.isDragHandleMousedown = true;
    const draggingController = new LiveNodeTextGeometryController(dragging.mindMap, { timers: dragging.timers });
    expect(draggingController.reconcile()).toBe(false);
    draggingController.destroy();

    const closed = createHarness({ measured: [{ width: 300, height: 24 }] });
    closed.mindMap.richText.showTextEdit = false;
    const closedController = new LiveNodeTextGeometryController(closed.mindMap, { timers: closed.timers });
    expect(closedController.reconcile()).toBe(false);
    expect(closed.node.reRender).not.toHaveBeenCalled();
    closedController.destroy();
  });

  it('restores needUpdate, because createTextNode consumes it and a measurement must not', () => {
    const harness = createHarness({ measured: [{ width: 300, height: 24 }] });
    harness.node.nodeData.data.needUpdate = true;

    const measured = createMeasuredTextData(harness.node, '<p>任意</p>');

    expect(measured?.width).toBe(300);
    expect(harness.node.nodeData.data.needUpdate).toBe(true);
  });

  it('never measures while a resetRichText rewrite is pending, because that path mutates node text', () => {
    const harness = createHarness();
    harness.node.nodeData.data.resetRichText = true;
    expect(createMeasuredTextData(harness.node, '<p>任意</p>')).toBeNull();
    expect(harness.node.createTextNode).not.toHaveBeenCalled();
  });

  it('treats a sub-pixel measurement difference as unchanged', () => {
    expect(textSizeChanged({ width: 100, height: 20 }, { node: {}, width: 100.2, height: 20.1 })).toBe(false);
    expect(textSizeChanged({ width: 100, height: 20 }, { node: {}, width: 101, height: 20 })).toBe(true);
  });
});

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

describe('v1.9.9-rc.6 editing node glyph suppression', () => {
  function suppressionHarness() {
    const listeners: Record<string, Array<() => void>> = {};
    const classList = new Set<string>();
    const group = {
      classList: {
        add: (name: string) => classList.add(name),
        remove: (name: string) => classList.delete(name),
      },
    };
    let queued: Array<() => void> = [];
    const host = { style: { display: 'block' } };
    const mindMap: any = {
      richText: { showTextEdit: true, node: { group: { node: group } }, textEditNode: host },
      on: (name: string, handler: () => void) => { (listeners[name] ??= []).push(handler); },
      off: (name: string, handler: () => void) => {
        listeners[name] = (listeners[name] ?? []).filter((item) => item !== handler);
      },
      emit: (name: string) => [...(listeners[name] ?? [])].forEach((handler) => handler()),
    };
    const timers = {
      set: (callback: () => void) => { queued.push(callback); return queued.length; },
      clear: () => { queued = []; },
      run: () => { const pending = queued; queued = []; pending.forEach((item) => item()); },
      pending: () => queued.length,
    };
    const controller = new EditingNodeTextSuppression(mindMap, {
      timers,
      // Run the deferred read inline so the test observes the same frame.
      schedule: (callback) => callback(),
    });
    return { controller, mindMap, classList, timers, listeners, host };
  }

  it('hides the node glyphs for the whole session, so only the Quill overlay paints text', () => {
    const harness = suppressionHarness();
    harness.mindMap.emit('before_show_text_edit');
    expect(harness.classList.has(EDITING_NODE_CLASS)).toBe(true);
    harness.mindMap.emit('node_text_edit_change');
    expect(harness.classList.has(EDITING_NODE_CLASS)).toBe(true);
    harness.controller.destroy();
  });

  it('restores the glyphs the moment the opaque host stops covering the node', () => {
    const harness = suppressionHarness();
    harness.mindMap.emit('before_show_text_edit');
    // The commit render normally completes synchronously inside SET_NODE_TEXT,
    // so upstream has already dropped the host by the time hide_text_edit is
    // emitted. Waiting for a further render end waits for something that
    // already happened, and left the node painted empty for ~400ms.
    harness.mindMap.richText.showTextEdit = false;
    harness.host.style.display = 'none';
    harness.mindMap.emit('hide_text_edit');
    expect(harness.classList.has(EDITING_NODE_CLASS)).toBe(false);
    harness.controller.destroy();
  });

  it('keeps the glyphs hidden while the host still covers them, then reveals on the commit render', () => {
    const harness = suppressionHarness();
    harness.mindMap.emit('before_show_text_edit');
    harness.mindMap.richText.showTextEdit = false;
    harness.mindMap.emit('hide_text_edit');
    // Host still shown: revealing now would paint text at the node's
    // pre-layout local origin for one frame.
    expect(harness.classList.has(EDITING_NODE_CLASS)).toBe(true);
    harness.mindMap.emit('node_tree_render_end');
    expect(harness.classList.has(EDITING_NODE_CLASS)).toBe(false);
    harness.controller.destroy();
  });

  it('never leaves glyphs hidden if no render follows the close', () => {
    const harness = suppressionHarness();
    harness.mindMap.emit('before_show_text_edit');
    harness.mindMap.richText.showTextEdit = false;
    harness.mindMap.emit('hide_text_edit');
    harness.timers.run();
    expect(harness.classList.has(EDITING_NODE_CLASS)).toBe(false);
    harness.controller.destroy();
  });

  it('does nothing when no edit session is open, and cleans up on destroy', () => {
    const harness = suppressionHarness();
    harness.mindMap.richText.showTextEdit = false;
    expect(harness.controller.suppress()).toBe(false);
    expect(harness.classList.has(EDITING_NODE_CLASS)).toBe(false);

    harness.mindMap.richText.showTextEdit = true;
    harness.mindMap.emit('before_show_text_edit');
    harness.controller.destroy();
    expect(harness.classList.has(EDITING_NODE_CLASS)).toBe(false);
    expect(harness.listeners.before_show_text_edit).toHaveLength(0);
    expect(harness.listeners.node_text_edit_change).toHaveLength(0);
    expect(harness.listeners.hide_text_edit).toHaveLength(0);
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
