import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { outlineAccessoriesFromData, outlineAccessoriesHtml } from '../../../src/editor/outlineAccessories';

const menu = readFileSync('src/ui/contextMenu.ts', 'utf8');
const editor = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
const controller = readFileSync('src/editor/StructuredOutlineEditorController.ts', 'utf8');

describe('v0.9.26 outline content parity', () => {
  it('marks outline images for single-click selection/actions and double-click preview', () => {
    const accessories = outlineAccessoriesFromData({
      uid: 'n1', text: 'node', image: 'data:image/png;base64,AAAA', imageTitle: 'preview',
    });
    const html = outlineAccessoriesHtml(accessories);
    expect(html).toContain('data-outline-image-action');
    expect(html).toContain('data-outline-image-kind="image"');
    expect(controller).toContain("root.addEventListener('dblclick', this.onDoubleClick)");
    expect(controller).not.toContain('outlineImageClickTimer');
    expect(controller).toContain('this.selectOutlineMedia(uid, kind)');
    expect(editor).toContain('onImageEdit:');
    expect(editor).toContain('onImagePreview:');
  });

  it('projects node content status without copying node visual styling', () => {
    const accessories = outlineAccessoriesFromData({
      uid: 'n1', text: 'node',
      yemindTodo: { checked: false, text: 'todo' },
      tag: ['PCIe', '重点'], hyperlink: 'https://example.com',
      yemindNote: { html: '<p>note</p>' }, yemindComments: [{ id: '1', text: 'comment' }],
      outerFrame: { groupId: 'g1' }, fillColor: '#f00', borderColor: '#0f0',
    });
    const html = outlineAccessoriesHtml(accessories);
    expect(html).toContain('data-outline-content="todo"');
    expect(html).toContain('data-outline-content="tags"');
    expect(html).toContain('data-outline-content="link"');
    expect(html).toContain('data-outline-content="note"');
    expect(html).toContain('data-outline-content="comments"');
    expect(html).toContain('data-outline-content="outer-frame"');
    expect(html).not.toContain('#f00');
    expect(html).not.toContain('#0f0');
  });

  it('exposes the complete canvas-equivalent Add submenu in outline', () => {
    expect(menu).toContain('label: options.todoLabel');
    expect(menu).toContain('label: options.outerFrameLabel');
    for (const label of ['备注', '批注', '标签', '图标', '链接', '剪贴图', '图片', '代码块', '公式', '行内链接']) {
      expect(menu).toContain(`label: '${label}'`);
    }
    expect(editor).toContain('openNoteDialog');
    expect(editor).toContain('openCommentsDialog');
    expect(editor).toContain('openTagsDialog');
    expect(editor).toContain('openCodeBlockDialog(this.outlineRichText');
    expect(editor).toContain('openFormulaDialog(this.outlineRichText');
    expect(editor).toContain('openInlineLinkDialog(this.outlineRichText');
  });
});
