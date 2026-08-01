import { describe, expect, it } from 'vitest';
import { createShiftedIncomingLineOverlays } from '../../../src/core/dragPreviewEdges';

function fakePath() {
  return {
    shown: false,
    removed: false,
    renderedTop: -1,
    visible() { return this.shown; },
    fill() { return this; },
    attr() { return this; },
    hide() { this.shown = false; return this; },
    show() { this.shown = true; return this; },
    remove() { this.removed = true; return this; },
  };
}

function originalLine(shown = true) {
  return {
    shown,
    visible() { return this.shown; },
    hide() { this.shown = false; },
    show() { this.shown = true; },
  };
}

describe('v0.9.8 drag edge continuity and flat canvas editing', () => {
  it('replaces only shifted incoming edges with correctly positioned preview overlays', () => {
    const created: ReturnType<typeof fakePath>[] = [];
    const a = { top: 10 } as any;
    const b = { top: 40 } as any;
    const c = { top: 70 } as any;
    const lines = [originalLine(), originalLine(), originalLine()];
    const parent: any = {
      children: [a, b, c],
      _lines: lines,
      lineDraw: { path: () => { const path = fakePath(); created.push(path); return path; } },
      renderer: {
        layout: {
          renderLine(node: any, overlays: ReturnType<typeof fakePath>[]) {
            node.children.forEach((child: any, index: number) => {
              overlays[index].renderedTop = child.top;
            });
          },
        },
      },
      style: { getStyle: () => 'curve' },
      styleLine() {},
    };
    [a, b, c].forEach((child) => { child.parent = parent; });

    const snapshots = createShiftedIncomingLineOverlays({ mindMap: {} }, [b, c], 55);

    expect(a.top).toBe(10);
    expect(b.top).toBe(40);
    expect(c.top).toBe(70);
    expect(created).toHaveLength(3);
    expect(created[0].removed).toBe(true);
    expect(created[1].renderedTop).toBe(95);
    expect(created[2].renderedTop).toBe(125);
    expect(lines[0].shown).toBe(true);
    expect(lines[1].shown).toBe(false);
    expect(lines[2].shown).toBe(false);
    expect(snapshots).toHaveLength(2);
    expect(snapshots.every((item) => item.overlay.shown)).toBe(true);
  });

});
