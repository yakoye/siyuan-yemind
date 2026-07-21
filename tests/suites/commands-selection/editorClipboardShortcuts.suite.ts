import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const createSource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');

describe('native clipboard shortcut ownership', () => {
  it('lets simple-mind-map own Ctrl/Cmd+C/X/V and forces its permission-free same-map clipboard path', () => {
    expect(createSource).toContain('disabledClipboard: true');
    expect(editorSource).not.toContain("['copy', () => this.commands?.copy()]");
    expect(editorSource).not.toContain("['cut', () => this.commands?.cut()]");
    expect(editorSource).not.toContain("['paste', () => { void this.commands?.paste(); }]");
  });
});
