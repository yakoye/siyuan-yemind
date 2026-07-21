import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildCommentsListHtml } from '../src/ui/commentsPresentation';

const source = readFileSync('src/ui/nodeContentDialogs.ts', 'utf8');
const css = readFileSync('src/styles/index.css', 'utf8');

describe('v0.6.3 compact node content dialogs', () => {
  it('uses compact body and footer sections for notes', () => {
    expect(source).toContain('ymz-note-dialog__body');
    expect(source).toContain('ymz-note-dialog__footer');
    expect(source).toContain('data-dialog-action="save-note"');
    expect(source).toContain('data-dialog-action="cancel-note"');
  });

  it('renders comment cards with timestamp and actions in one bottom meta row', () => {
    const html = buildCommentsListHtml([{ id: '1', text: 'A', createdAt: 1, updatedAt: 1 }]);
    expect(html).toContain('ymz-comment__meta');
    expect(html).toContain('ymz-comment__time');
    expect(html).toContain('ymz-comment__actions');
  });

  it('uses compact sizing and keeps both custom close buttons inside the surfaces', () => {
    expect(css).toContain('.ymz-note-dialog__body');
    expect(css).toContain('.ymz-note-dialog__footer');
    expect(css).toContain('.ymz-comment__meta');
    expect(css).toMatch(/\.ymz-node-dialog__close[^}]*position\s*:\s*relative/);
    expect(source).toContain("width: compactDialogWidth(560)");
    expect(source).toContain("width: compactDialogWidth(500)");
  });
});
