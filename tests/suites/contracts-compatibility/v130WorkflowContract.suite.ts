import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = (name: string) =>
  readFile(path.resolve('.github/workflows', name), 'utf8');

describe('v1.3.0 GitHub workflow contract', () => {
  it('validates both hosts and real browser flows on pushes and pull requests', async () => {
    const source = await workflow('ci.yml');
    expect(source).toMatch(/pull_request:/);
    expect(source).toMatch(/branches:\s*\[main\]/);
    expect(source).toContain('node-version: 22');
    expect(source).toContain('cache: npm');
    for (const command of [
      'npm ci',
      'npm run check:version',
      'npm run test:structure',
      'npm run test:syntax',
      'npm run check',
      'npm test',
      'npm run test:web',
      'npm run build:all',
      'playwright install --with-deps chromium',
      'npm run test:e2e',
    ]) {
      expect(source).toContain(command);
    }
  });

  it('deploys the validated standalone build as the Pages artifact', async () => {
    const source = await workflow('pages.yml');
    expect(source).toContain('actions/configure-pages@v5');
    expect(source).toContain('actions/upload-pages-artifact@v3');
    expect(source).toContain('actions/deploy-pages@v4');
    expect(source).toMatch(/path:\s*web-dist/);
    expect(source).toContain('npm run build:web');
  });

  it('builds, verifies and publishes both release ZIPs from version tags', async () => {
    const source = await workflow('release.yml');
    expect(source).toMatch(/tags:\s*\['v\*'\]/);
    expect(source).toContain('npm run release:build');
    expect(source).toContain('npm run release:verify');
    expect(source).toContain('softprops/action-gh-release@v2');
    for (const file of [
      'siyuan-yemind-v${VERSION}.zip',
      'yemind-web-v${VERSION}.zip',
      'release-manifest.json',
      'SHA256SUMS',
    ]) {
      expect(source).toContain(file);
    }
  });
});
