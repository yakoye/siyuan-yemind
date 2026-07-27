import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const marker = JSON.parse(readFileSync(path.join(root, 'src/data/marker-catalog.json'), 'utf8')) as {
  image: string;
};
const clipart = JSON.parse(readFileSync(path.join(root, 'src/data/clipart-catalog.json'), 'utf8')) as {
  items: Array<{ relativePath: string }>;
};
const layouts = JSON.parse(readFileSync(path.join(root, 'src/data/layout-catalog.local.json'), 'utf8')) as {
  items: Array<{ relativePath: string }>;
};

describe('standalone web fixed assets', () => {
  it('keeps every catalog source file available', () => {
    const relativePaths = [
      marker.image,
      ...clipart.items.map((item) => item.relativePath),
      ...layouts.items.map((item) => item.relativePath),
    ];
    expect(relativePaths.length).toBeGreaterThan(100);
    relativePaths.forEach((relative) => {
      expect(existsSync(path.join(root, 'assets', relative)), relative).toBe(true);
    });
  });

  it('copies catalogs and the app icon into web-dist', () => {
    expect(existsSync(path.join(root, 'web-dist/icon.png'))).toBe(true);
    expect(existsSync(path.join(root, 'web-dist/assets', marker.image))).toBe(true);
    expect(existsSync(path.join(root, 'web-dist/assets', clipart.items[0].relativePath))).toBe(true);
    expect(existsSync(path.join(root, 'web-dist/assets', layouts.items[0].relativePath))).toBe(true);
  });
});
