import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { RichTextToolbar } from '../../../src/editor/RichTextToolbar';

function commands(): any {
  return {
    isReadonly: () => false,
    formatText: vi.fn(),
    clearTextFormat: vi.fn(),
    setCloze: vi.fn(),
  };
}

describe('v0.5.18 formula and blur presentation', () => {
  it('renders a dedicated mathematical pi symbol instead of plain button text', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const toolbar = new RichTextToolbar(root, commands(), {});
    const button = root.querySelector<HTMLButtonElement>('[data-rich-action="formula"]')!;
    expect(button.querySelector('.ymz-formula-symbol')?.textContent).toBe('π');
    expect(button.getAttribute('aria-label')).toBe('插入公式');
    expect(button.textContent?.trim()).toBe('π');
    toolbar.destroy();
    root.remove();
  });

  it('uses Gaussian/glass blur in both canvas and outline instead of a solid color block', () => {
    const css = fs.readFileSync(path.resolve('src/styles/index.css'), 'utf8');
    expect(css).toMatch(/data-cloze-mode="blur"[^\{]*\.smm-richtext-node-wrap/);
    expect(css).toMatch(/data-cloze-mode="blur"[^\{]*\.ymz-outline-row__editor/);
    expect(css).toMatch(/filter:\s*blur\(/);
    expect(css).toMatch(/backdrop-filter:\s*blur\(/);
    expect(css).toMatch(/data-cloze-hover="true"[\s\S]*filter:\s*none/);
  });
});
