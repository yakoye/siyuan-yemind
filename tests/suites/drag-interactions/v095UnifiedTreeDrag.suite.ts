import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  emptyOfficialDragCandidate,
  resolveOfficialDragCandidate,
} from '../../../src/core/officialDragIntent';
import {
  resolveOutlinePointerDropIntent,
  shouldStartOutlinePointerDrag,
} from '../../../src/editor/outlineDrag';

function node(uid: string, rect: { x: number; y: number; width: number; height: number }, parent: any = null) {
  return {
    uid,
    rect,
    parent,
    children: [] as any[],
    layerIndex: parent ? Number(parent.layerIndex ?? 0) + 1 : 0,
    dir: 'right',
    getData(key: string) { return key === 'uid' ? uid : undefined; },
  };
}

describe('v0.9.5 unified tree drag contract', () => {
  it('excludes the dragged subtree from pointer hit testing', () => {
    const root = node('root', { x: 20, y: 100, width: 80, height: 40 });
    const source = node('source', { x: 160, y: 80, width: 100, height: 36 }, root);
    const descendant = node('descendant', { x: 300, y: 80, width: 100, height: 36 }, source);
    source.children = [descendant];
    root.children = [source];
    const result = resolveOfficialDragCandidate({
      layout: 'logicalStructure',
      pointer: { x: 350, y: 98 },
      nodes: [root, source, descendant],
      excludedNodes: [source, descendant],
      current: emptyOfficialDragCandidate(),
      getRect: (value) => value.rect,
    });
    expect(result.kind).toBe('none');
  });

  it('keeps the outline row stable and starts only after a five-pixel gutter gesture', () => {
    const base = {
      sourceUid: 'source', targetUid: 'target', clientX: 100, clientY: 120,
      rect: { top: 100, height: 40 }, targetTextLeft: 120, targetDepth: 2,
      indentWidth: 22, targetAncestors: [{ uid: 'root', depth: 0 }, { uid: 'parent', depth: 1 }, { uid: 'target', depth: 2 }],
    };
    expect(resolveOutlinePointerDropIntent(base)?.kind).toBe("after");
    expect(shouldStartOutlinePointerDrag({ interactive: false, fromEditor: false, elapsedMs: 0, distancePx: 4.9 })).toBe(false);
    expect(shouldStartOutlinePointerDrag({ interactive: false, fromEditor: false, elapsedMs: 0, distancePx: 5 })).toBe(true);
  });

  it('uses an invisible move gutter, five-pixel leaf square and green depth-aligned insertion marker', () => {
    const css = readFileSync('src/styles/index.css', 'utf8');
    expect(css).toContain('.ymz-outline-row__drag{');
    expect(css).toContain('width:22px');
    expect(css).toContain('cursor:move');
    expect(css).toContain('.ymz-outline-row__leaf-square{width:5px;height:5px');
    expect(css).toContain('background:var(--ymz-accent)');
    expect(css).toContain('box-shadow:none!important');
  });

  it('keeps image actions out of the canvas structural drag session', () => {
    const source = readFileSync('src/core/YeMindDrag.ts', 'utf8');
    expect(source).toContain('.node-image-remove,.ymz-node-image-preview,.node-image-resize');
    expect(source).toContain('excludedNodes: collectDragExcludedNodes');
    expect(source).toContain("event.key !== 'Escape'");
  });
});
