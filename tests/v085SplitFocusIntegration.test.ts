import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('v0.8.5 split focus ownership integration', () => {
  it('claims canvas ownership before canvas text editing and pointer interaction', () => {
    expect(source).toContain('this.claimCanvasInteraction("canvas-text-edit")');
    expect(source).toContain('this.canvasEl.addEventListener("pointerdown", this.onCanvasPointerDown, true)');
    expect(source).toContain('this.claimCanvasInteraction("canvas-node-active")');
  });

  it('only restores explicit outline focus tickets instead of inferring from a stale active row', () => {
    expect(source).toContain('const pendingTicket = this.editingSurface.pending');
    expect(source).toContain('pendingTicket ? "explicit-outline-focus" : "external-structure-change"');
    expect(source).not.toContain('this.pendingOutlineFocus');
    expect(source).not.toContain('getSelectionState(activeEditor)');
  });

  it('routes outline structural commands through the explicit focus queue', () => {
    expect(source).toContain('this.queueOutlineFocus({ uid: newUid, placement: "start" })');
    expect(source).toContain('this.editingSurface.take(ticket)');
  });
});
