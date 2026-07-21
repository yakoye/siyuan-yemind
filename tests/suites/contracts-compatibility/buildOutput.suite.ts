import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('installable runtime', () => {
  it('is generated from the new YeMind source and contains no transitional kmzs runtime', () => {
    const sourceEntry = readFileSync(resolve(process.cwd(), 'src/index.ts'), 'utf8');
    const runtime = readFileSync(resolve(process.cwd(), 'index.js'), 'utf8');
    expect(sourceEntry).not.toContain('fallback');
    expect(runtime).toContain('ymz-editor');
    expect(runtime).not.toContain('kmzs-app');
  });
});
