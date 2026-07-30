import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stabilizeMindMapMeasurementHost } from '../../../src/core/measurementHost';
import YeMindRichText from '../../../src/editor/YeMindRichText';
import { shouldStabilizeOpeningPlacement } from '../../../src/editor/YeMindRichText';
import { editorHorizontalMargin } from '../../../src/editor/richTextGeometry';

describe('v0.9.14 stable node measurement geometry', () => {
  afterEach(() => {
    document.querySelectorAll('[data-yemind-measurement-host]').forEach((node) => node.remove());
    vi.restoreAllMocks();
  });

  it('moves caches into a visible off-screen editor context and performs one full repair render', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
    const editor = document.createElement('div');
    editor.className = 'ymz-editor custom-theme';
    editor.style.setProperty('--ymz-test-color', '#123456');
    const canvas = document.createElement('div');
    canvas.style.display = 'none';
    const rich = document.createElement('div');
    const custom = document.createElement('div');
    canvas.append(rich, custom);
    editor.append(canvas);
    document.body.append(editor);
    const render = vi.fn();
    const reRender = vi.fn();
    let beforeDestroy: (() => void) | null = null;
    const map = {
      commonCaches: { measureRichtextNodeTextSizeEl: rich, measureCustomNodeContentSizeEl: custom },
      render,
      reRender,
      on: vi.fn((name: string, callback: () => void) => { if (name === 'beforeDestroy') beforeDestroy = callback; }),
    };

    expect(stabilizeMindMapMeasurementHost(map, editor)).toBe(true);
    const host = rich.parentElement as HTMLElement;
    expect(host).toBe(custom.parentElement);
    expect(host.dataset.yemindMeasurementHost).toBe('true');
    expect(host.classList.contains('ymz-editor')).toBe(true);
    expect(host.style.visibility).toBe('hidden');
    expect(rich.style.position).toBe('relative');
    expect(rich.style.left).toBe('0px');
    expect(rich.style.width).toBe('max-content');
    expect(custom.style.position).toBe('relative');
    expect(custom.style.left).toBe('0px');
    expect(reRender).toHaveBeenCalledWith(null, 'yemind-measurement-host');
    expect(render).not.toHaveBeenCalled();
    beforeDestroy?.();
    expect(host.isConnected).toBe(false);
    editor.remove();
  });

  it('does not trigger another render when caches are already in the stable host', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
    const editor = document.createElement('div');
    editor.className = 'ymz-editor';
    document.body.append(editor);
    const rich = document.createElement('div');
    editor.append(rich);
    const map = {
      commonCaches: { measureRichtextNodeTextSizeEl: rich },
      render: vi.fn(),
      reRender: vi.fn(),
      on: vi.fn(),
    };
    expect(stabilizeMindMapMeasurementHost(map, editor)).toBe(true);
    map.render.mockClear();
    map.reRender.mockClear();
    expect(stabilizeMindMapMeasurementHost(map, editor)).toBe(false);
    expect(map.render).not.toHaveBeenCalled();
    expect(map.reRender).not.toHaveBeenCalled();
    editor.remove();
  });

  it('passes the editor root both after creation and before visible-canvas resize', () => {
    const factorySource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');
    const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
    expect(factorySource).toContain('stabilizeMindMapMeasurementHost(mindMap as any, editorRoot)');
    expect(editorSource).toContain('stabilizeMindMapMeasurementHost(this.map as any, this.rootEl)');
    expect(editorSource.indexOf('stabilizeMindMapMeasurementHost(this.map as any, this.rootEl)'))
      .toBeLessThan(editorSource.indexOf('this.map.resize()', editorSource.indexOf('stabilizeMindMapMeasurementHost(this.map as any, this.rootEl)')));
  });

  it('repositions a newly opened editor after the browser flushes the final SVG transform', () => {
    let frame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frame = callback;
      return 77;
    });
    const updateTextEditNode = vi.fn();
    const richText = Object.create(YeMindRichText.prototype) as any;
    richText.placementFrame = null;
    richText.editingUid = 'new-node';
    richText.showTextEdit = true;
    richText.updateTextEditNode = updateTextEditNode;

    richText.schedulePlacementStabilization();
    expect(updateTextEditNode).not.toHaveBeenCalled();
    frame?.(0);
    expect(updateTextEditNode).toHaveBeenCalledOnce();
    expect(richText.placementFrame).toBeNull();
  });

  it('keeps one opening-frame correction only for a newly inserted node', () => {
    expect(shouldStabilizeOpeningPlacement(true)).toBe(true);
    expect(shouldStabilizeOpeningPlacement(false)).toBe(false);
    expect(shouldStabilizeOpeningPlacement(undefined)).toBe(false);
    const source = readFileSync(resolve(process.cwd(), 'src/editor/YeMindRichText.ts'), 'utf8');
    const capture = source.indexOf('const stabilizeOpening = shouldStabilizeOpeningPlacement(params?.isInserting);');
    const upstreamShow = source.indexOf('super.showEditText({', capture);
    const schedule = source.indexOf('if (stabilizeOpening)', upstreamShow);
    expect(capture).toBeGreaterThanOrEqual(0);
    expect(capture).toBeLessThan(upstreamShow);
    expect(schedule).toBeGreaterThan(upstreamShow);
  });

  it('drops a stale placement frame after editing moved to another node', () => {
    let frame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frame = callback;
      return 78;
    });
    const updateTextEditNode = vi.fn();
    const richText = Object.create(YeMindRichText.prototype) as any;
    richText.placementFrame = null;
    richText.editingUid = 'first-node';
    richText.showTextEdit = true;
    richText.updateTextEditNode = updateTextEditNode;

    richText.schedulePlacementStabilization();
    richText.editingUid = 'second-node';
    frame?.(0);
    expect(updateTextEditNode).not.toHaveBeenCalled();
  });

  it('tracks canvas resize and view transforms while the HTML editor is open', () => {
    let frame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frame = callback;
      return 79;
    });
    const listeners = new Map<string, () => void>();
    const updateTextEditNode = vi.fn();
    const richText = Object.create(YeMindRichText.prototype) as any;
    richText.placementFrame = null;
    richText.placementMonitorFrame = null;
    richText.placementTracking = false;
    richText.placementResizeObserver = null;
    richText.editingUid = 'resizing-node';
    richText.showTextEdit = true;
    richText.updateTextEditNode = updateTextEditNode;
    richText.handlePlacementInvalidation = () => richText.schedulePlacementStabilization();
    richText.mindMap = {
      opt: {},
      on: vi.fn((name: string, callback: () => void) => listeners.set(name, callback)),
      off: vi.fn((name: string) => listeners.delete(name)),
    };

    richText.bindPlacementTracking();
    expect([...listeners.keys()]).toEqual(expect.arrayContaining(['resize', 'scale', 'translate']));
    expect(richText.placementMonitorFrame).toBeNull();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    listeners.get('resize')?.();
    expect(updateTextEditNode).not.toHaveBeenCalled();
    frame?.(0);
    expect(updateTextEditNode).toHaveBeenCalledOnce();

    richText.unbindPlacementTracking();
    expect(listeners.size).toBe(0);
  });

  it('stops view tracking when editing closes', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/editor/YeMindRichText.ts'), 'utf8');
    expect(source).toContain('this.bindPlacementTracking();');
    expect(source.match(/this\.unbindPlacementTracking\(\);/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it.each(['Delete', 'Backspace'])('removes a multiline Quill selection with one %s press', (key) => {
    const root = document.createElement('div');
    const deleteText = vi.fn();
    const setSelection = vi.fn();
    const richText = Object.create(YeMindRichText.prototype) as any;
    richText.quill = {
      root,
      getSelection: () => ({ index: 0, length: 12 }),
      deleteText,
      setSelection,
    };
    richText.showTextEdit = true;
    richText.range = { index: 0, length: 12 };
    richText.pasteUseRange = richText.range;
    richText.emitEditingDiagnostic = vi.fn();

    richText.bindTextEditingKeyboard();
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });
    root.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(deleteText).toHaveBeenCalledOnce();
    expect(deleteText).toHaveBeenCalledWith(0, 12, 'user');
    expect(setSelection).toHaveBeenCalledWith(0, 0, 'silent');
  });

  it('never lets text-editor padding overlap a todo or icon prefix', () => {
    expect(editorHorizontalMargin({ _prefixData: { width: 18 } }, 6, 5, 1)).toBe(-5);
    expect(editorHorizontalMargin({ _iconData: [{ width: 18 }] }, 6, 5, 1)).toBe(-5);
    expect(editorHorizontalMargin({}, 6, 5, 1)).toBe(-6);
  });

  it('reserves a symmetric glyph safety gutter so bold root text is never clipped', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(css).toMatch(/\.ymz-editor \.smm-richtext-node-wrap\{[^}]*box-sizing:border-box;[^}]*padding-inline:1px;/s);
  });

  it('measures rich HTML from its intrinsic content width unless the user set a width', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(css).toMatch(
      /\.ymz-editor \.smm-richtext-node-wrap\{[^}]*display:inline-block;[^}]*width:max-content;/s,
    );
  });
});
