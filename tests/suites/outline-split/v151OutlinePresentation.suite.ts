import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { outlineBranchColorIndexes } from '../../../src/editor/outlinePresentation';
import type { StructuredOutlineBlock } from '../../../src/editor/structuredOutlineDocument';

const css = readFileSync('src/styles/index.css', 'utf8').replace(/\r\n?/g, '\n');
const controller = readFileSync('src/editor/StructuredOutlineEditorController.ts', 'utf8');

function block(uid: string, depth: number, parentUid: string | null): StructuredOutlineBlock {
  return {
    uid,
    depth,
    parentUid,
    html: uid,
    text: uid,
    kind: 'node',
    hidden: false,
    expanded: true,
    hasChildren: false,
    isRoot: depth === 0,
    pristine: false,
    accessories: {
      icons: [],
      image: null,
      todo: null,
      tags: [],
      link: '',
      hasNote: false,
      commentCount: 0,
      hasOuterFrame: false,
    },
  };
}

describe('v1.5.1 Version47 outline presentation', () => {
  it('V151-12/V151-18 gives each root branch one stable color inherited by descendants', () => {
    const indexes = outlineBranchColorIndexes([
      block('root', 0, null),
      block('a', 1, 'root'),
      block('a1', 2, 'a'),
      block('a2', 3, 'a1'),
      block('b', 1, 'root'),
      block('b1', 2, 'b'),
    ]);
    expect(indexes.get('root')).toBe(0);
    expect(indexes.get('a')).toBe(1);
    expect(indexes.get('a1')).toBe(1);
    expect(indexes.get('a2')).toBe(1);
    expect(indexes.get('b')).toBe(2);
    expect(indexes.get('b1')).toBe(2);
  });

  it('V151-13 aligns the one-pixel guide body with the exact marker center and uses the row branch color', () => {
    expect(controller).toContain('const x = Math.round(markerRect.left + markerRect.width / 2 - rootRect.left + root.scrollLeft - 0.5);');
    expect(controller).toContain("line.style.setProperty('--ymz-outline-guide-color', row.style.getPropertyValue('--ymz-outline-branch-color'))");
  });

  it('V151-08/V151-11 keeps active rows and selected text readable in both appearances', () => {
    expect(css).toContain('--ymz-outline-selection-bg:');
    expect(css).toMatch(/\.ymz-outline-row\.is-active,\n\.ymz-outline-row\.is-active:hover\{[^}]*background:var\(--ymz-outline-selection-bg\)[^}]*color:var\(--ymz-text-100\)/s);
    expect(css).toMatch(/\.ymz-outline-row__editor::selection,\n\.ymz-outline-row__editor \*::selection\{[^}]*background:var\(--ymz-text-selection-bg\)[^}]*color:var\(--ymz-text-selection-fg\)/s);
  });

  it('V151-12/V151-18 colors triangles, leaf squares and segmented guides together', () => {
    expect(css).toContain('--ymz-outline-branch-1:#22c9a0');
    expect(css).toMatch(/\.ymz-outline-row__branch\{[^}]*color:var\(--ymz-outline-branch-color/s);
    expect(css).toMatch(/\.ymz-outline-guide\{[^}]*repeating-linear-gradient/s);
  });
});
