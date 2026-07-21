import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/ui/contextMenu.ts'), 'utf8');

describe('node context menu regression surface', () => {
  it('keeps every established node action reachable from the menu', () => {
    const labels = [
      '编辑节点', '添加子节点', '添加同级节点', '添加父节点',
      '复制节点子树', '剪切节点子树', '粘贴节点子树',
      '批注', '标签', '图标', '链接', '图片', '公式', '行内链接', '代码块',
      '关联线', '上移节点', '下移节点', '展开/折叠', '整理布局',
      '仅删除节点，保留子节点', '删除节点和子树',
    ];
    labels.forEach((label) => expect(source).toContain(`label: '${label}'`));
    expect(source).toContain('summaryAction.label');
    expect(source).toContain('todoAction.label');
  });

  it('routes node hyperlinks through the editor validation callback when supplied', () => {
    expect(source).toContain('onNodeLink?: () => void');
    expect(source).toContain('options.onNodeLink ? options.onNodeLink() : openLinkDialog(commands)');
  });
});


it('reports asynchronous paste failures instead of leaving an unhandled rejection', () => {
  expect(source).toContain("commands.paste().catch");
  expect(source).toContain("showMessage('节点粘贴失败，请重试'");
});
