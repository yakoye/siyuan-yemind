import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve('src/styles/index.css'), 'utf8');
const controller = fs.readFileSync(path.resolve('src/editor/StructuredOutlineEditorController.ts'), 'utf8');
const editor = fs.readFileSync(path.resolve('src/editor/YeMindEditor.ts'), 'utf8');

describe('v0.9.10 outline guides and bidirectional reveal', () => {
  it('anchors every guide directly below its expanded parent triangle', () => {
    expect(controller).toContain("row.querySelector<HTMLElement>('.ymz-outline-row__triangle,.ymz-outline-row__leaf-square')");
    expect(controller).toContain('markerRect.left + markerRect.width / 2');
    expect(controller).toContain('markerRect.bottom - rootRect.top + root.scrollTop');
    expect(controller).toContain('lastRect.top + lastRect.height / 2');
    expect(controller).toContain("`var(--ymz-outline-guide-${(depth % 4) + 1})`");
  });

  it('renders each parent guide once with uniform physical width', () => {
    expect(controller).toContain("this.guideLayer.replaceChildren(fragment)");
    expect(controller).toContain("line.dataset.outlineGuideParent");
    expect(css).toContain('.ymz-outline-guide{');
    expect(css).toContain('width:1px');
    expect(css).toContain('box-sizing:border-box');
    expect(css).not.toContain('.ymz-outline-row::before');
  });

  it('reveals canvas selections in the outline and outline selections on canvas', () => {
    expect(controller).toContain('if (scroll && row) this.revealRow(row)');
    expect(controller).toContain('root.scrollTop = Math.max(0, target)');
    expect(editor).toContain('this.activateOutlineUid(uid ? String(uid) : "", true)');
    expect(editor).toContain('this.commands.goToNode(uid)');
    expect(editor).toContain('this.activateOutlineUid(uid, true)');
    expect(editor).toContain('scroll && outlineVisible');
  });
});
