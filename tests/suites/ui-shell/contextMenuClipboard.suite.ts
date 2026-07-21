import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/ui/contextMenu.ts'), 'utf8');

describe('node clipboard menu', () => {
  it('exposes only the scoped same-map clipboard actions', () => {
    expect(source).toContain("label: '复制节点子树'");
    expect(source).toContain("label: '剪切节点子树'");
    expect(source).toContain("label: '粘贴节点子树'");
    expect(source).not.toContain("label: '跨导图粘贴'");
    expect(source).not.toContain("icon: 'iconCut'");
    expect(source).not.toContain("icon: 'iconPaste'");
  });
});
