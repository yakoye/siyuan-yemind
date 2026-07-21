import { describe, expect, it } from 'vitest';
import { renderOutlineHtml } from '../src/editor/outline';
import { isOutlinePointerInDragZone } from '../src/editor/outlineDrag';

describe('v0.6.4 outline leaf markers and drag zone', () => {
  it('renders a leaf dot for non-root leaf nodes', () => {
    const html = renderOutlineHtml({
      data: { uid: 'root', text: 'Root', expand: true },
      children: [{ data: { uid: 'leaf', text: 'Leaf', expand: true }, children: [] }],
    });
    expect(html).toContain('data-outline-leaf="true"');
    expect(html).toContain('ymz-outline-row__leaf-dot');
  });

  it('only permits row dragging from the blank area to the left of the text', () => {
    expect(isOutlinePointerInDragZone({ clientX: 90, textLeft: 100 })).toBe(true);
    expect(isOutlinePointerInDragZone({ clientX: 100, textLeft: 100 })).toBe(false);
    expect(isOutlinePointerInDragZone({ clientX: 140, textLeft: 100 })).toBe(false);
  });
});
