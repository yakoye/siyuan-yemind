import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layoutSource = readFileSync(resolve(process.cwd(), 'src/ui/layoutGalleryPanel.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('v0.9.13 toolbar and panel interaction', () => {
  it('restores visible hover feedback for transparent Structure and Style toolbar buttons', () => {
    expect(css).toContain('.ymz-floating .ymz-project-button:hover');
    expect(css).toContain('background:var(--b3-list-hover)!important');
  });

  it('closes the Structure gallery when the pointer is pressed outside it', () => {
    expect(layoutSource).toContain("document.addEventListener('mousedown', this.onDocumentMouseDown)");
    expect(layoutSource).toContain("document.removeEventListener('mousedown', this.onDocumentMouseDown)");
    expect(layoutSource).toContain('if (!this.panel.contains(target)) this.hide()');
  });

  it('uses separate compact sizes and denser node-control columns', () => {
    expect(css).toMatch(/\.ymz-project-style-panel\{[^}]*width:min\(340px/s);
    expect(css).toMatch(/\.ymz-node-style-panel\{[^}]*width:min\(380px/s);
    expect(css).toContain('.ymz-node-style-panel section{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))');
    expect(css).not.toContain('height:min(440px,70vh)!important');
  });
});
