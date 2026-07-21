import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('v0.5.21 Root expand persistence', () => {
  it('does not rewrite persisted Root expand=false to true during editor startup', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
    expect(source).not.toContain('rootExpandChanged');
    expect(source).not.toContain('data: { ...runtimeData.data, expand: true }');
  });
});
