import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createEditorTemplate } from '../src/editor/editorTemplate';

function source(file: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
}

describe('editor checkpoint integration', () => {
  it('exposes a single compact checkpoint menu entry', () => {
    const html = createEditorTemplate('Demo');
    expect(html).toContain('data-action="checkpoints"');
    expect(html.match(/data-action="checkpoints"/g)).toHaveLength(1);
  });

  it('flushes current data before checkpoint creation or restore and suppresses save events during reload', () => {
    const editor = source('src/editor/YeMindEditor.ts');
    expect(editor).toContain('await this.saveNow()');
    expect(editor).toContain('this.applyingCheckpoint = true');
    expect(editor).toContain('this.map.setFullData({');
    expect(editor).toContain('if (this.applyingCheckpoint) return;');
  });
});
