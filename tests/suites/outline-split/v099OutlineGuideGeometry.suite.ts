import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve('src/styles/index.css'), 'utf8');

function cssBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] ?? '';
}

describe('v0.9.9 outline guide geometry', () => {
  it('uses one shared geometry model for indentation, drag gutter, markers and guides', () => {
    const tree = cssBlock('.ymz-outline-tree,\n.ymz-structured-outline');
    expect(tree).toContain('--ymz-outline-indent:22px');
    expect(tree).toContain('--ymz-outline-row-start:6px');
    expect(tree).toContain('--ymz-outline-drag-width:22px');
    expect(tree).toContain('--ymz-outline-branch-width:16px');
    expect(tree).toContain('--ymz-outline-branch-half:8px');
    expect(tree).toContain('--ymz-outline-indent-half:11px');
    expect(tree).toContain('--ymz-outline-guide-start:calc(');
  });

  it('places each guide halfway between its parent and child marker columns', () => {
    const row = cssBlock('.ymz-outline-row');
    const guide = cssBlock('.ymz-outline-row::before');
    expect(row).toContain('var(--ymz-outline-depth,0)*var(--ymz-outline-indent)');
    expect(guide).toContain('left:var(--ymz-outline-guide-start)');
    expect(guide).toContain('var(--ymz-outline-depth,0)*var(--ymz-outline-indent)');
    expect(guide).toContain('var(--ymz-outline-indent) - 1px');
    expect(guide).toContain('var(--ymz-outline-guide-1) 0 1px');
    expect(guide).toContain('var(--ymz-outline-guide-2) 22px 23px');
    expect(guide).toContain('var(--ymz-outline-guide-3) 44px 45px');
    expect(guide).toContain('var(--ymz-outline-guide-4) 66px 67px');
  });

  it('never draws a guide to the left of the root marker', () => {
    expect(css).toContain('.ymz-outline-row[data-outline-root="true"]::before{content:none}');
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
