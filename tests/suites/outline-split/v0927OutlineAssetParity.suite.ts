import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { outlineAccessoriesFromData, outlineAccessoriesHtml } from '../../../src/editor/outlineAccessories';
import { createNodePrefixContent } from '../../../src/core/nodeDecorations';
import { buildHoverPreviewHtml } from '../../../src/ui/nodeHoverPreview';

const controller = readFileSync('src/editor/StructuredOutlineEditorController.ts', 'utf8');
const editor = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
const assetDialogs = readFileSync('src/ui/localAssetDialogs.ts', 'utf8');
const noteDialogs = readFileSync('src/ui/nodeContentDialogs.ts', 'utf8');
const imageAdjust = readFileSync('src/core/YeMindNodeImgAdjust.ts', 'utf8');
const styles = readFileSync('src/styles/index.css', 'utf8');

describe('v0.9.27 outline asset and dialog parity', () => {
  it('renders marker icons as actionable sprite buttons without duplicated SVG patterns', () => {
    const html = outlineAccessoriesHtml(outlineAccessoriesFromData({
      uid: 'n1', text: 'node', icon: ['yemarkerpriority_priority-03'],
    }), '/plugins/siyuan-yemind/');
    expect(html).toContain('data-outline-icon-action');
    expect(html).toContain('background-image:');
    expect(html).not.toContain('<pattern');
    expect(controller).toContain('onIconEdit?');
    expect(editor).toContain('onIconEdit:');
    expect(editor).toContain('refreshOutlineFromMap');
    expect(editor).toContain('onChange: () => this.refreshOutlineFromMap()');
  });

  it('keeps image single-click selection actions, double-click lightbox preview, and content hover delegation', () => {
    expect(controller).toContain("root.addEventListener('pointerover', this.onPointerOver)");
    expect(controller).toContain("root.addEventListener('pointerout', this.onPointerOut)");
    expect(controller).toContain('onContentHover?');
    expect(controller).not.toContain('outlineImageClickTimer');
    expect(editor).toContain('showImageResourceActions');
    expect(editor).toContain('onContentHover:');
    expect(editor).toContain('this.imageLightbox?.show');
  });

  it('removes the extra outline todo frame and normalizes canvas todo geometry', () => {
    const html = outlineAccessoriesHtml(outlineAccessoriesFromData({
      uid: 'n1', text: 'node', yemindTodo: { checked: false, text: 'todo' },
    }));
    expect(html).toContain('ymz-outline-accessories__todo');
    expect(html).not.toContain('ymz-outline-accessories__status--todo');
    const prefix = createNodePrefixContent({
      getData: (key: string) => key === 'yemindTodo' ? { checked: false, text: 'todo' } : null,
      mindMap: { emit() {} },
    });
    expect(prefix?.width).toBe(18);
    expect(prefix?.height).toBe(18);
    expect(styles).toContain('.ymz-node-prefix{width:18px;height:18px');
  });

  it('builds hover previews for all projected accessory types', () => {
    expect(buildHoverPreviewHtml('todo', { checked: false, text: 'verify' })).toContain('verify');
    expect(buildHoverPreviewHtml('tags', ['PCIe', 'RAS'])).toContain('PCIe');
    expect(buildHoverPreviewHtml('link', 'https://example.com')).toContain('https://example.com');
    expect(buildHoverPreviewHtml('outer-frame', true)).toContain('外框');
    expect(buildHoverPreviewHtml('note', { html: '<p>note</p>', updatedAt: 1 })).toContain('note');
    expect(buildHoverPreviewHtml('comments', [{ id: 'c1', text: 'comment', createdAt: 1, updatedAt: 1 }])).toContain('comment');
  });

  it('refreshes accessories while preserving dirty focused outline text', () => {
    expect(controller).toContain('patchAccessoryProjection');
    expect(controller).toMatch(/this\.dirty\s*&&\s*this\.options\.root\.contains\(document\.activeElement\)[\s\S]*patchAccessoryProjection/);
  });

  it('uses compact anchored asset dialogs with explicit custom close buttons', () => {
    expect(assetDialogs).toContain('anchorRect?: DOMRect');
    expect(assetDialogs).toContain('ymz-local-asset-dialog__header');
    expect(assetDialogs).toContain('data-asset-dialog-action="close"');
    expect(assetDialogs).toContain('hideCloseIcon: true');
    expect(assetDialogs).toContain('positionAssetDialog');
    expect(assetDialogs).toContain("width: '600px'");
    expect(assetDialogs).toContain("width: '660px'");
  });

  it('autosaves note content on close and scrim while Cancel explicitly discards', () => {
    expect(noteDialogs).toContain('persistNoteAndClose');
    expect(noteDialogs).toContain('close-note-auto-save');
    expect(noteDialogs).toContain('b3-dialog__scrim');
    expect(noteDialogs).toContain('cancelled = true');
    expect(styles).toContain('.ymz-note-dialog__footer{justify-content:flex-end');
  });

  it('opens the clipart picker directly from canvas clipart clicks', () => {
    expect(imageAdjust).toContain("getData?.('yemindClipartId')");
    expect(imageAdjust).toContain('clipartClickTimer');
    expect(imageAdjust).toContain("emit('yemind_node_clipart_edit'");
    expect(imageAdjust).toContain('node, event, img');
    expect(editor).toContain('yemind_node_clipart_edit');
    expect(editor).toContain('imageElement?.getBoundingClientRect?.()');
  });
});
