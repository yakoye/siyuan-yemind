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

  it('keeps the app icon and version marker in the web asset copy contract', () => {
    expect(existsSync(path.join(root, 'icon.png'))).toBe(true);
    expect(readFileSync(path.join(root, 'web/VERSION'), 'utf8').trim()).toBe('1.5.0');
    const copyScript = readFileSync(path.join(root, 'scripts/copy-web-assets.mjs'), 'utf8');
    const viteConfig = readFileSync(path.join(root, 'vite.web.config.ts'), 'utf8');
    const webHtml = readFileSync(path.join(root, 'web/index.html'), 'utf8');
    expect(copyScript).toContain("path.join(root, 'assets')");
    expect(copyScript).toContain("path.join(root, 'icon.png')");
    expect(copyScript).toContain("path.join(root, 'web', 'VERSION')");
    expect(viteConfig).toContain("'/icon.png'");
    expect(viteConfig).toContain("resolve(__dirname, 'icon.png')");
    expect(webHtml).toContain('<link rel="icon" href="./icon.png"');
  });
});
