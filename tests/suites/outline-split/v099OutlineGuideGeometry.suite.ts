import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve('src/styles/index.css'), 'utf8');
const controller = fs.readFileSync(path.resolve('src/editor/StructuredOutlineEditorController.ts'), 'utf8');

function cssBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] ?? '';
}

describe('v0.9.9 outline guide geometry regression', () => {
  it('keeps indentation, drag gutter and marker columns on shared variables', () => {
    const tree = cssBlock('.ymz-outline-tree,\n.ymz-structured-outline');
    expect(tree).toContain('position:relative');
    expect(tree).toContain('--ymz-outline-indent:22px');
    expect(tree).toContain('--ymz-outline-row-start:6px');
    expect(tree).toContain('--ymz-outline-drag-width:22px');
    expect(tree).toContain('--ymz-outline-branch-width:16px');
  });

  it('uses one 1px guide element instead of overlapping row gradients', () => {
    const layer = cssBlock('.ymz-outline-guides');
    const guide = cssBlock('.ymz-outline-guide');
    expect(layer).toContain('position:absolute');
    expect(layer).toContain('pointer-events:none');
    expect(guide).toContain('width:1px');
    expect(guide).toContain('min-width:1px');
    expect(guide).toContain('max-width:1px');
    expect(css).not.toContain('.ymz-outline-row::before');
    expect(controller).toContain("line.dataset.outlineGuideParent = row.dataset.outlineUid ?? ''");
  });

  it('keeps drag and drop geometry tied to the same indentation variables', () => {
    const drag = cssBlock('.ymz-outline-row__drag');
    const branch = cssBlock('.ymz-outline-row__branch');
    const indicator = cssBlock('.ymz-outline-row__drop-indicator');
    expect(drag).toContain('width:var(--ymz-outline-drag-width)');
    expect(drag).toContain('flex:0 0 var(--ymz-outline-drag-width)');
    expect(branch).toContain('width:var(--ymz-outline-branch-width)');
    expect(indicator).toContain('var(--ymz-outline-drop-depth,var(--ymz-outline-depth))*var(--ymz-outline-indent)');
    expect(indicator).toContain('var(--ymz-outline-drag-width)');
  });
});
