import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  emptyOfficialDragCandidate,
  resolveOfficialDragCandidate,
} from '../../../src/core/officialDragIntent';
import { resolveOutlinePointerDropIntent } from '../../../src/editor/outlineDrag';

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

describe('v0.9.6 outline editing and right-logical drag reference', () => {
  it('keeps every locked outline row actionable and snaps horizontal depth', () => {
    const base = {
      sourceUid: 'source', targetUid: 'target', clientX: 120, clientY: 119,
      rect: { top: 100, height: 40 }, targetTextLeft: 120, targetDepth: 2,
      indentWidth: 22,
      targetAncestors: [
        { uid: 'root', depth: 0 },
        { uid: 'parent', depth: 1 },
        { uid: 'target', depth: 2 },
      ],
    };
    expect(resolveOutlinePointerDropIntent(base)?.kind).toBe('before');
    expect(resolveOutlinePointerDropIntent({ ...base, clientY: 121 })?.kind).toBe('after');
    expect(resolveOutlinePointerDropIntent({ ...base, clientX: 154 })?.kind).toBe('child');
    expect(resolveOutlinePointerDropIntent({ ...base, clientX: 96, clientY: 121 })).toMatchObject({
      targetUid: 'parent', desiredDepth: 1, kind: 'after',
    });
  });

  it('uses a neutral corridor, row halves and an explicit tail in logicalStructure', () => {
    const parent = node('parent', { x: 20, y: 100, width: 80, height: 40 });
    const first = node('first', { x: 160, y: 70, width: 100, height: 36 }, parent);
    const second = node('second', { x: 160, y: 180, width: 100, height: 36 }, parent);
    parent.children = [first, second];
    const options = {
      layout: 'logicalStructure', nodes: [parent, first, second],
      current: emptyOfficialDragCandidate(), getRect: (value: any) => value.rect,
    };
    expect(resolveOfficialDragCandidate({ ...options, pointer: { x: 290, y: 142 } }).kind).toBe('none');
    expect(resolveOfficialDragCandidate({ ...options, pointer: { x: 210, y: 181 } })).toMatchObject({
      kind: 'before', parentNode: parent, nextNode: second,
    });
    expect(resolveOfficialDragCandidate({ ...options, pointer: { x: 210, y: 207 } })).toMatchObject({
      kind: 'after', parentNode: parent, prevNode: second,
    });
    expect(resolveOfficialDragCandidate({ ...options, pointer: { x: 280, y: 88 } })).toMatchObject({
      kind: 'child', parentNode: first,
    });
  });

  it('owns Enter, empty-node deletion and browser placeholder normalisation', () => {
    const source = readFileSync('src/editor/StructuredOutlineEditorController.ts', 'utf8');
    expect(source).toContain('this.splitSelectionToSibling()');
    expect(source).toContain("this.insertInlineHtml('<br>')");
    expect(source).toContain('editorIsSemanticallyEmpty(context.startEditor)');
    expect(source).toContain('emptyEditor.replaceChildren()');
    expect(source).toContain("this.replaceDomBlocks(normalizeStructuredOutlineDepths(next), 'remove-empty-node')");
    expect(source).toContain('editor.focus({ preventScroll: true })');
  });

  it('shows a visible default font instead of an empty native select', () => {
    const source = readFileSync('src/editor/RichTextToolbar.ts', 'utf8');
    expect(source).toContain('<option value="">默认字体</option>');
    expect(source).toContain('(YEMIND_FONT_VALUES as readonly string[]).includes(currentFont)');
  });

  it('removes logical canvas insertion/origin guides and makes destination room', () => {
    const source = readFileSync('src/core/YeMindDrag.ts', 'utf8');
    expect(source).toContain("if (layout === 'logicalStructure') {");
    expect(source).toContain('plugin.__ymzOriginGuideLine?.hide?.()');
    expect(source).toContain('plugin.__ymzInsertionGuideLine?.hide?.()');
    expect(source).toContain('this.updateLogicalRoomPreview(stable)');
    expect(source).toContain("setElementTransition(element, 'transform 130ms ease')");
    expect(source).toContain("const resolved = raw.kind === 'child'");
  });
});
