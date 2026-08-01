import { describe, expect, it } from 'vitest';
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

  it('removes YeMind lifecycle coordinators instead of leaving dormant patch paths', () => {
    const removed = [
      'src/editor/canvasRichTextVisibility.ts',
      'src/editor/CanvasEditSessionCoordinator.ts',
      'src/editor/RenderedTextGeometryRepair.ts',
      'src/editor/InsertedNodeEditCoordinator.ts',
      'src/editor/richTextGeometry.ts',
      'src/core/measurementHost.ts',
      'src/editor/liveNodeWidthLayout.ts',
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
  });

  it('does not let the outer editor steal focus or gate the upstream editor', () => {
    const editor = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
    const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(editor).not.toMatch(/this\.map\.on\(["']node_click["'][\s\S]{0,160}this\.canvasEl\.focus/);
    expect(css).not.toContain('data-yemind-geometry-ready');
  });
});
