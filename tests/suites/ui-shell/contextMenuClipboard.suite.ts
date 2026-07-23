import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/ui/contextMenu.ts'), 'utf8');

describe('node clipboard menu', () => {
  it('exposes direct copy, cut, paste and plain-text paste actions', () => {
    expect(source).toContain("label: '复制'");
    expect(source).toContain("accelerator: 'Ctrl+C'");
    expect(source).toContain("label: '剪切'");
    expect(source).toContain("accelerator: 'Ctrl+X'");
    expect(source).toContain("label: '粘贴'");
    expect(source).toContain("accelerator: 'Ctrl+V'");
    expect(source).toContain("label: '粘贴（纯文本）'");
    expect(source).toContain("accelerator: 'Ctrl+Shift+V'");
    expect(source).not.toContain("label: '跨导图粘贴'");
  });
});
