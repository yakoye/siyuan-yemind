import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('v0.5.9 diagnostics integration', () => {
  it('exposes diagnostics from the top menu and command palette', () => {
    const plugin = source('src/plugin/YeMindZenPlugin.ts');
    expect(plugin).toContain("label: '诊断与回归'");
    expect(plugin).toContain("langKey: 'openYeMindDiagnostics'");
    expect(plugin).toContain('openDiagnosticsDialog(this.diagnostics)');
  });

  it('records editor lifecycle, drag, save and view events without node text', () => {
    const editor = source('src/editor/YeMindEditor.ts');
    expect(editor).not.toContain("this.map.on('node_dragend'");
    expect(editor).toContain("'data-change'");
    expect(editor).toContain("'view-change'");
    expect(editor).toContain("'save', 'completed'");
    expect(editor).not.toContain("diagnostics.record('editor', 'data-change', this.current.id, { text:");
  });
});
