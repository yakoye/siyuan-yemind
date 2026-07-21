import { describe, expect, it } from 'vitest';
import { extractImageFile, findRenderedNodeAtClientPoint, hasImageFile } from '../src/ui/nodeImageInput';

function imageFile(name = 'diagram.png') {
  return new File(['png'], name, { type: 'image/png' });
}

describe('node image paste and drop input', () => {
  it('extracts the first image file from DataTransfer items or files', () => {
    const image = imageFile();
    const text = new File(['x'], 'notes.txt', { type: 'text/plain' });
    expect(extractImageFile({ items: [{ kind: 'file', type: text.type, getAsFile: () => text }, { kind: 'file', type: image.type, getAsFile: () => image }], files: [] } as any)).toBe(image);
    expect(extractImageFile({ items: [], files: [text, image] } as any)).toBe(image);
    expect(hasImageFile({ items: [{ kind: 'file', type: image.type, getAsFile: () => null }], files: [] } as any)).toBe(true);
    expect(hasImageFile({ items: [{ kind: 'file', type: text.type, getAsFile: () => text }], files: [text] } as any)).toBe(false);
  });

  it('finds the rendered node under a client point after inverse view transform', () => {
    const child = { left: 120, top: 50, width: 100, height: 60, children: [] };
    const root = { left: 0, top: 0, width: 80, height: 40, children: [child] };
    const map = {
      toPos: (x: number, y: number) => ({ x, y }),
      draw: { transform: () => ({ scaleX: 2, scaleY: 2, translateX: 10, translateY: 20 }) },
      renderer: { root },
    };
    expect(findRenderedNodeAtClientPoint(map as any, 270, 140)).toBe(child);
    expect(findRenderedNodeAtClientPoint(map as any, 500, 500)).toBeNull();
  });
});
