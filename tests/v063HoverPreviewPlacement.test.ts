import { describe, expect, it } from 'vitest';
import * as hoverPreview from '../src/ui/nodeHoverPreview';

interface Rect { left:number; top:number; right:number; bottom:number; width:number; height:number }
const rect = (left:number, top:number, width:number, height:number): Rect => ({ left, top, width, height, right:left+width, bottom:top+height });
const intersects = (a: Rect, b: Rect): boolean => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

describe('v0.6.3 hover preview placement', () => {
  it('chooses the left side when the right side cannot fit', () => {
    const compute = (hoverPreview as any).computeHoverPreviewPlacement;
    expect(compute).toBeTypeOf('function');
    const placement = compute({ root: rect(0, 0, 420, 300), anchor: rect(382, 120, 22, 22), preview: { width: 260, height: 120 }, gap: 8 });
    expect(placement.placement).toMatch(/^left/);
    expect(intersects(rect(placement.left, placement.top, placement.width, placement.height), rect(382, 120, 22, 22))).toBe(false);
  });

  it('chooses an upper placement when the lower side cannot fit', () => {
    const compute = (hoverPreview as any).computeHoverPreviewPlacement;
    expect(compute).toBeTypeOf('function');
    const placement = compute({ root: rect(0, 0, 500, 260), anchor: rect(210, 226, 22, 22), preview: { width: 220, height: 150 }, gap: 8 });
    expect(placement.placement).toContain('top');
    expect(intersects(rect(placement.left, placement.top, placement.width, placement.height), rect(210, 226, 22, 22))).toBe(false);
  });

  it('keeps the preview inside the editor and never covers the badge', () => {
    const compute = (hoverPreview as any).computeHoverPreviewPlacement;
    expect(compute).toBeTypeOf('function');
    const root = rect(0, 0, 280, 190);
    const anchor = rect(126, 84, 22, 22);
    const placement = compute({ root, anchor, preview: { width: 230, height: 130 }, gap: 8 });
    const output = rect(placement.left, placement.top, placement.width, placement.height);
    expect(output.left).toBeGreaterThanOrEqual(root.left + 8);
    expect(output.top).toBeGreaterThanOrEqual(root.top + 8);
    expect(output.right).toBeLessThanOrEqual(root.right - 8);
    expect(output.bottom).toBeLessThanOrEqual(root.bottom - 8);
    expect(intersects(output, anchor)).toBe(false);
  });

  it('shows a compact right-aligned timestamp for every comment preview item', () => {
    const html = hoverPreview.buildHoverPreviewHtml('comments', [{ id: '1', text: 'Hello', createdAt: new Date(2026, 6, 20, 19, 47, 48).getTime(), updatedAt: 1 }]);
    expect(html).toContain('ymz-node-hover-preview__comment-time');
    expect(html).toContain('2026/7/20 19:47:48');
  });
});
