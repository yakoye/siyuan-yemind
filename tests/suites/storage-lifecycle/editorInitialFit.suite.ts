import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const createSource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');

describe('initial fit lifecycle', () => {
  it('delegates initial fitting to the upstream fit option exactly once', () => {
    expect(createSource).toContain("fit: Boolean(settings?.autoFitOnOpen ?? true) && !viewData");
    expect(editorSource).not.toContain("window.setTimeout(() => this.commands?.fit(), 0)");
  });
});
