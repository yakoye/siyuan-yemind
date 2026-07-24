import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const editor = fs.readFileSync(path.resolve('src/editor/YeMindEditor.ts'), 'utf8');

describe('v0.9.18 split opening reveals current canvas selection', () => {
  it('schedules a reveal after the outline pane becomes visible', () => {
    expect(editor).toContain('private revealCurrentOutlineSelection(): void');
    expect(editor).toContain('const active = renderer.activeNodeList[0]');
    expect(editor).toContain('this.activateOutlineUid(String(uid), true)');
    expect(editor).toContain('if (mode === "split" || mode === "outline")');
    expect(editor).toContain('window.requestAnimationFrame(() => this.revealCurrentOutlineSelection())');
  });

  it('does not transfer interaction ownership merely by opening split view', () => {
    const setViewMode = editor.slice(editor.indexOf('private setViewMode'), editor.indexOf('private scheduleSafeResize'));
    expect(setViewMode).not.toContain('claimOutlineInteraction');
    expect(setViewMode).not.toContain('commands.goToNode');
  });
});
