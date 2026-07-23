import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/ui/contextMenu.ts'), 'utf8');

const singleSource = source.slice(source.indexOf('const hasOuterFrame'));

function position(label: string): number {
  return singleSource.indexOf(`label: '${label}'`);
}

describe('node context menu regression surface', () => {
  it('keeps the requested single-node command order and dynamic outer-frame action', () => {
    const labels = [
      '编辑节点', '+ 插入同级节点', '+ 添加子节点', '+ 添加父节点',
      '关联线', '节点样式', '上移节点', '下移节点',
      '展开/折叠（下级节点）', '添加', '复制', '剪切', '粘贴',
      '粘贴（纯文本）', '删除当前和子节点', '仅删除当前',
    ];
    labels.forEach((label) => expect(position(label)).toBeGreaterThanOrEqual(0));
    for (let index = 1; index < labels.length; index += 1) {
      expect(position(labels[index])).toBeGreaterThan(position(labels[index - 1]));
    }
    expect(source).toContain("label: hasOuterFrame ? '删除外框' : '添加外框'");
    expect(source).toContain("accelerator: 'Ctrl+Alt+L'");
  });

  it('keeps the requested multi-selection and blank-canvas actions', () => {
    expect(source).toContain('if (activeNodes.length > 1)');
    expect(source).toContain("label: '{} 添加综合概要'");
    expect(source).toContain("label: '删除选中节点'");
    expect(source).toContain("label: '展开/折叠（所有节点）'");
  });

  it('routes node and inline hyperlinks through distinct editor callbacks', () => {
    expect(source).toContain('onNodeLink?: () => void');
    expect(source).toContain('onInlineLink?: () => void');
    expect(source).toContain('options.onNodeLink ? options.onNodeLink() : openLinkDialog(commands)');
    expect(source).toContain("label: '行内链接'");
  });

  it('reports asynchronous paste failures instead of leaving an unhandled rejection', () => {
    expect(source).toContain('commands.pastePlainText()');
    expect(source).toContain('commands.paste()');
    expect(source).toContain("showMessage('节点粘贴失败，请重试'");
  });
});
