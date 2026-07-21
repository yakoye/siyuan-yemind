import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const createSource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('node hyperlink integration', () => {
  it('overrides the upstream blank-window jump and shares editor navigation rules', () => {
    expect(createSource).toContain('customHyperlinkJump: (href: string) => options.onHyperlink?.(href)');
    expect(editorSource).toContain('onHyperlink: (href) => this.openLink(href)');
    expect(editorSource).toContain('resolveLinkNavigation');
  });
});
