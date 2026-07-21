import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { configureNodeDecorations, createNodePostfixContent } from '../src/core/nodeDecorations';

const settingsTemplate = readFileSync(resolve(process.cwd(), 'src/settings/settingsDialogTemplate.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('v0.5.16 node chrome', () => {
  it('shows one comment glyph without a numeric count or three-dot menu', () => {
    configureNodeDecorations({ showCommentBadge: true, showTodoBadge: true });
    const node = {
      getData: (key: string) => key === 'yemindComments'
        ? [{ id: '1' }, { id: '2' }, { id: '3' }]
        : key === 'isActive',
      mindMap: { emit: vi.fn() },
    };
    const postfix = createNodePostfixContent(node as any);
    expect(postfix?.el.querySelector('.ymz-node-comment-badge')).not.toBeNull();
    expect(postfix?.el.querySelector('.ymz-node-comment-count')).toBeNull();
    expect(postfix?.el.querySelector('.ymz-node-menu-button')).toBeNull();
    expect(postfix?.width).toBe(24);
  });

  it('removes the obsolete node menu preference and synthetic event', () => {
    expect(settingsTemplate).not.toContain('显示节点菜单按钮');
    expect(editorSource).not.toContain("this.map.on('yemind_node_menu'");
  });
});
