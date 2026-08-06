import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import BaseRichText from 'simple-mind-map/src/plugins/RichText';
import YeMindRichText from '../../../src/editor/YeMindRichText';

describe('v1.9.0 upstream rich-text lifecycle ownership', () => {
  it('does not override upstream editor opening, placement, focus or teardown', () => {
    const upstream = BaseRichText.prototype as Record<string, unknown>;
    const yemind = YeMindRichText.prototype as Record<string, unknown>;
    [
      'showEditText',
      'updateTextEditNode',
      'hideEditText',
      'removeTextEditEl',
      'setQuillContainerMinHeight',
      'focus',
    ].forEach((method) => {
      expect(yemind[method], `${method} must be inherited from upstream`).toBe(upstream[method]);
    });
  });

  it('lets the upstream non-silent selection transaction focus and select a newly inserted node', () => {
    const setSelection = vi.fn();
    const richText = Object.create(BaseRichText.prototype) as {
      quill: { getLength(): number; setSelection(index: number, length: number): void };
      focus(start?: number): void;
    };
    richText.quill = {
      getLength: () => 4,
      setSelection,
    };

    richText.focus(0);

    expect(setSelection).toHaveBeenCalledOnce();
    expect(setSelection).toHaveBeenCalledWith(0, 4);
  });

  it('removes YeMind lifecycle coordinators instead of leaving dormant patch paths', () => {
    const removed = [
      'src/editor/canvasRichTextVisibility.ts',
      'src/editor/CanvasEditSessionCoordinator.ts',
      'src/editor/RenderedTextGeometryRepair.ts',
      'src/editor/InsertedNodeEditCoordinator.ts',
      'src/editor/richTextGeometry.ts',
      'src/core/measurementHost.ts',
      'src/editor/liveNodeWidthLayout.ts',
      // v1.9.9-rc.9: both re-implemented capabilities upstream already owns
      // behind openRealtimeRenderOnNodeTextEdit -- live node resizing during
      // an edit, and hiding the edited node's glyphs so the editor is the only
      // text layer.
      'src/editor/liveNodeTextGeometry.ts',
      'src/editor/editingNodeTextSuppression.ts',
    ];
    removed.forEach((file) => expect(existsSync(resolve(process.cwd(), file)), file).toBe(false));

    const production = [
      'src/core/createMindMap.ts',
      'src/editor/YeMindEditor.ts',
      'src/editor/YeMindRichText.ts',
      'src/editor/RichTextToolbar.ts',
    ].map((file) => readFileSync(resolve(process.cwd(), file), 'utf8')).join('\n');
    expect(production).not.toContain('canvasRichTextVisibility');
    expect(production).not.toContain('CanvasEditSessionCoordinator');
    expect(production).not.toContain('RenderedTextGeometryRepair');
    expect(production).not.toContain('LiveNodeTextGeometryController');
    expect(production).not.toContain('EditingNodeTextSuppression');
  });

  it('does not let the outer editor steal focus or gate the upstream editor', () => {
    const editor = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
    const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(editor).not.toMatch(/this\.map\.on\(["']node_click["'][\s\S]{0,160}this\.canvasEl\.focus/);
    expect(css).not.toContain('data-yemind-geometry-ready');
  });

  it('installs the static rich-text measurement contract before constructing the upstream map', () => {
    const createSource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');
    const createBody = createSource.slice(createSource.indexOf('export function createMindMap'));
    expect(createBody.indexOf('installMindMapMeasurementContract()'))
      .toBeLessThan(createBody.indexOf('new MindMap('));
    expect(createSource).toContain('data-yemind-mind-map-measurement-contract');
    expect(createSource).toContain('margin-block-start:0');
    expect(createSource).toContain('margin-block-end:0');
  });

  it('transfers document focus ownership to the latest editor when multiple map tabs stay mounted', () => {
    const createEditor = () => {
      const root = document.createElement('div');
      const focus = vi.fn();
      root.focus = focus;
      document.body.appendChild(root);
      const editor = Object.create(YeMindRichText.prototype) as any;
      editor.showTextEdit = true;
      editor.quill = {
        root,
        getLength: () => 8,
        getSelection: () => ({ index: 2, length: 3 }),
        setSelection: vi.fn(),
      };
      editor.range = { index: 2, length: 3 };
      editor.pasteUseRange = null;
      editor.hideEditText = vi.fn(() => {
        editor.showTextEdit = false;
        editor.releaseEditFocusOwnership();
      });
      return { editor, focus, root };
    };
    const first = createEditor();
    const second = createEditor();
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    first.editor.beginEditFocusOwnership();
    first.editor.handleFocusOwnershipPointerDown({ target: outside } as PointerEvent);
    second.editor.beginEditFocusOwnership();
    first.editor.handleHostFocusIn({ target: outside } as FocusEvent);
    second.editor.handleHostFocusIn({ target: outside } as FocusEvent);

    expect(first.editor.hideEditText).toHaveBeenCalledOnce();
    expect(first.editor.showTextEdit).toBe(false);
    expect(first.focus).not.toHaveBeenCalled();
    expect(second.focus).toHaveBeenCalledOnce();
    expect(second.editor.quill.setSelection).toHaveBeenCalledWith(2, 3, expect.anything());

    second.editor.hideEditText();
    first.root.remove();
    second.root.remove();
    outside.remove();
  });
});
