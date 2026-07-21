import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/ui/nodeContentDialogs.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('v0.6.1 note and comment dialog close controls', () => {
  it('uses content-local close buttons and hides the host close icon', () => {
    expect(source).toContain('hideCloseIcon: true');
    expect(source).toContain('data-node-dialog-action="close-note"');
    expect(source).toContain('data-node-dialog-action="close-comments"');
    expect(source).toContain("classList.add('ymz-note-dialog-host')");
    expect(source).toContain("classList.add('ymz-comments-dialog-host')");
  });

  it('positions the custom header and close control inside the dialog surface', () => {
    expect(css).toContain('.ymz-node-dialog__header');
    expect(css).toContain('.ymz-node-dialog__close');
    expect(css).toMatch(/\.ymz-(?:note|comments)-dialog-host\s+\.b3-dialog__header[^}]*display\s*:\s*none/);
  });
});
