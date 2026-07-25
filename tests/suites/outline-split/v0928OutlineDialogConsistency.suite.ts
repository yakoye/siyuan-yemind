import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { outlineAccessoriesFromData, outlineAccessoriesHtml } from '../../../src/editor/outlineAccessories';
import { markerCatalog } from '../../../src/core/localAssetCatalogs';
import { computeAssetDialogPlacement } from '../../../src/ui/anchoredPlacement';

const controller = readFileSync('src/editor/StructuredOutlineEditorController.ts', 'utf8');
const hover = readFileSync('src/ui/nodeHoverPreview.ts', 'utf8');
const adjust = readFileSync('src/core/YeMindNodeImgAdjust.ts', 'utf8');
const dialogChrome = readFileSync('src/ui/dialogChrome.ts', 'utf8');
const styles = readFileSync('src/styles/index.css', 'utf8');

function overlaps(a: { left: number; top: number; width: number; height: number }, b: { left: number; top: number; width: number; height: number }): boolean {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

describe('v0.9.28 outline and dialog consistency', () => {
  it('renders outline markers in a compact mathematically-scaled background viewport', () => {
    const html = outlineAccessoriesHtml(outlineAccessoriesFromData({
      uid: 'n1', text: 'node', icon: ['yemarkerpriority_priority-03'],
    }), '/plugins/siyuan-yemind');
    expect(html).toContain('ymz-outline-accessories__icon--marker');
    expect(html).toContain('background-size:244.2857px 313.7143px');
    expect(html).toContain('background-position:-55.2857px -9px');
    expect(html).not.toContain('<span class="ymz-marker-sprite"');
    expect(styles).not.toContain('transform:scale(.6428571429)');
    expect(markerCatalog.iconSize.width).toBe(28);
  });

  it('uses semantic note and comment icons without a numeric comment badge', () => {
    const html = outlineAccessoriesHtml(outlineAccessoriesFromData({
      uid: 'n1', text: 'node', yemindNote: { html: '<p>note</p>' },
      yemindComments: [{ id: 'c1', text: 'one', createdAt: 1, updatedAt: 1 }, { id: 'c2', text: 'two', createdAt: 2, updatedAt: 2 }],
    }));
    expect(html).toContain('href="#iconYeMindNote"');
    expect(html).toContain('href="#iconYeMindComment"');
    expect(html).toContain('aria-label="批注 2"');
    expect(html).not.toContain('>2</button>');
  });

  it('stabilizes hover previews after layout and content-size changes', () => {
    expect(hover).toContain('ResizeObserver');
    expect(hover).toContain('requestAnimationFrame');
    expect(hover).toContain("querySelectorAll<HTMLImageElement>('img')");
    expect(hover).toContain("this.element.style.visibility = 'hidden'");
  });

  it('uses a double-click-safe outline image arbitration window', () => {
    expect(controller).toContain('OUTLINE_IMAGE_SINGLE_CLICK_DELAY');
    expect(controller).toMatch(/OUTLINE_IMAGE_SINGLE_CLICK_DELAY\s*=\s*380/);
    expect(controller).toContain('event.detail > 1');
    expect(controller).toContain('onImagePreview?.(uid, kind)');
  });

  it('keeps clipart selected with eight handles and a delete control while opening its picker', () => {
    expect(adjust).toContain("const kind = isClipart ? 'clipart' : 'image'");
    expect(adjust).toContain('this.selectImage(node, img, kind)');
    expect(adjust).toContain("this.handleEl.dataset.assetKind = kind");
    expect(adjust).toContain('CLIPART_SINGLE_CLICK_DELAY');
    expect(adjust).not.toContain('this.closeImageSelection();\n      if (this.clipartClickTimer');
    expect(styles).toContain('.ymz-node-image-frame[data-asset-kind="clipart"] .ymz-node-image-toolbar{display:none}');
  });

  it('places large asset dialogs through eight viewport-safe candidates', () => {
    const viewport = { left: 0, top: 0, right: 1280, bottom: 760, width: 1280, height: 760 };
    const size = { width: 600, height: 620 };
    const anchors = [
      { left: 8, top: 8, right: 28, bottom: 28, width: 20, height: 20 },
      { left: 1252, top: 8, right: 1272, bottom: 28, width: 20, height: 20 },
      { left: 8, top: 732, right: 28, bottom: 752, width: 20, height: 20 },
      { left: 1252, top: 732, right: 1272, bottom: 752, width: 20, height: 20 },
    ];
    for (const anchor of anchors) {
      const placement = computeAssetDialogPlacement({ viewport, anchor, dialog: size, margin: 12, gap: 14 });
      expect(placement.left).toBeGreaterThanOrEqual(12);
      expect(placement.top).toBeGreaterThanOrEqual(12);
      expect(placement.left + placement.width).toBeLessThanOrEqual(1268);
      expect(placement.top + placement.height).toBeLessThanOrEqual(748);
      expect(placement.candidateCount).toBe(8);
      expect(overlaps(placement, anchor)).toBe(false);
    }
  });

  it('applies one dialog chrome contract across native and custom dialogs', () => {
    expect(dialogChrome).toContain("export const YEMIND_DIALOG_CLASS = 'ymz-dialog-shell'");
    expect(dialogChrome).toContain('applyDialogChrome');
    expect(styles).toContain('.ymz-dialog-shell .b3-dialog__header');
    expect(styles).toContain('.ymz-dialog-shell .b3-dialog__action');
    expect(styles).toContain('justify-content:flex-end');
    expect(styles).toContain('min-height:46px');
    expect(styles).toContain('font-weight:700');
  });
});
