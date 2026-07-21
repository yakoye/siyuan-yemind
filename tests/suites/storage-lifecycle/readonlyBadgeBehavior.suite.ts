import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const dialogSource = readFileSync(resolve(process.cwd(), 'src/ui/nodeContentDialogs.ts'), 'utf8');

describe('readonly node badge behavior', () => {
  it('opens comments in view-only mode and prevents todo toggles', () => {
    expect(editorSource).toMatch(/openCommentsDialog\(this\.commands,\s*\{[\s\S]*?readonly:\s*this\.commands\.isReadonly\(\)/);
    expect(editorSource).toContain("if (this.commands.isReadonly())");
    expect(editorSource).toContain('只读模式下不能修改待办');
    expect(dialogSource).toContain('options: { readonly?: boolean } = {}');
    expect(dialogSource).toContain('const readonly = Boolean(options.readonly)');
    expect(dialogSource).toContain('footer.hidden = readonly');
  });
});
