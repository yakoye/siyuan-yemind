import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/index.css', 'utf8').replace(/\r\n?/g, '\n');
const controller = readFileSync('src/editor/StructuredOutlineEditorController.ts', 'utf8');

function finalCssBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'g'))];
  return matches.at(-1)?.[1] ?? '';
}

describe('v1.3.0 outline drag grip discovery', () => {
  it('removes the obsolete outline presentation gutter', () => {
    expect(css).toMatch(/data-view="outline"[^\{]*\.ymz-outline\{padding-inline:2px/);
    const tree = finalCssBlock('.ymz-outline-tree,\n.ymz-structured-outline');
    expect(tree).toContain('--ymz-outline-row-start:0px');
    expect(tree).toContain('--ymz-outline-drag-width:16px');
  });

  it('keeps the hit target stable while hiding the six dots at rest', () => {
    const handle = finalCssBlock('.ymz-outline-row__drag');
    const grip = finalCssBlock('.ymz-outline-drag-grip');
    expect(handle).toContain('width:var(--ymz-outline-drag-width)');
    expect(handle).toContain('min-width:var(--ymz-outline-drag-width)');
    expect(grip).toContain('opacity:0');
    expect(grip).toContain('transform:scale(.82)');
    expect(grip).toContain('pointer-events:none');
  });

  it('reveals only near the handle, during keyboard focus, or while dragging', () => {
    expect(css).toContain('.ymz-outline-row__drag:hover .ymz-outline-drag-grip');
    expect(css).toContain('.ymz-outline-row__drag:focus-visible .ymz-outline-drag-grip');
    expect(css).toContain('.ymz-outline-row.is-dragging .ymz-outline-drag-grip');
    expect(css).not.toContain('.ymz-outline-row:hover .ymz-outline-drag-grip');
    expect(css).not.toContain('.ymz-outline-row.is-active .ymz-outline-drag-grip');
    expect(controller).toContain('data-outline-drag-handle contenteditable="false" role="button" tabindex="${draggable ? \'0\' : \'-1\'}"');
  });

  it('provides a visible focus ring without changing row geometry', () => {
    expect(css).toContain('.ymz-outline-row__drag:focus-visible{');
    expect(css).toContain('outline:2px solid');
    expect(css).toContain('outline-offset:-3px');
  });
});
