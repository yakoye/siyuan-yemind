import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface UpstreamRuntimeBaseline {
  upstream: {
    repository: string;
    commit: string;
    packageVersion: string;
  };
  sourceHashes: Record<string, string>;
  allowedModifiedFiles: string[];
  allowedAddedFiles: string[];
}

const runtimeRoot = resolve(process.cwd(), 'vendor/simple-mind-map-runtime');
const baselinePath = join(runtimeRoot, 'UPSTREAM_BASELINE.json');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(absolute) : [absolute];
    })
    .filter((file) => file.endsWith('.js'))
    .sort();
}

function normalizedSha256(file: string): string {
  const normalized = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized).digest('hex');
}

describe('vendored simple-mind-map upstream baseline', () => {
  it('records the exact official revision used by the runtime', () => {
    expect(existsSync(baselinePath), `${baselinePath} must exist`).toBe(true);
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as UpstreamRuntimeBaseline;
    const packageJson = JSON.parse(readFileSync(join(runtimeRoot, 'package.json'), 'utf8')) as { version: string };

    expect(baseline.upstream).toEqual({
      repository: 'https://github.com/wanglin2/mind-map',
      commit: 'e8e5ef9c41bc13ca7b13084e078123adff002242',
      packageVersion: '0.14.0-fix.3',
    });
    expect(packageJson.version).toBe(baseline.upstream.packageVersion);
  });

  it('keeps every unlisted runtime source byte-equivalent to upstream', () => {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as UpstreamRuntimeBaseline;
    const current = sourceFiles(join(runtimeRoot, 'src'))
      .map((file) => relative(runtimeRoot, file).replace(/\\/g, '/'));
    const upstreamFiles = Object.keys(baseline.sourceHashes).sort();
    const allowedModified = new Set(baseline.allowedModifiedFiles);
    const allowedAdded = new Set(baseline.allowedAddedFiles);

    expect(current.filter((file) => !upstreamFiles.includes(file)).sort())
      .toEqual([...allowedAdded].sort());

    upstreamFiles.forEach((file) => {
      expect(current, `${file} must remain present`).toContain(file);
      if (allowedModified.has(file)) return;
      expect(normalizedSha256(join(runtimeRoot, file)), `${file} diverged from upstream`)
        .toBe(baseline.sourceHashes[file]);
    });
  });

  it('limits the runtime fork to the trace-proven editing, insertion and width-drag files', () => {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as UpstreamRuntimeBaseline;
    const renderPath = 'src/core/render/Render.js';
    const nodePath = 'src/core/render/node/MindMapNode.js';
    const textEditPath = 'src/core/render/TextEdit.js';
    const modifyWidthPath = 'src/core/render/node/nodeModifyWidth.js';
    const richTextPath = 'src/plugins/RichText.js';

    expect(baseline.allowedModifiedFiles).toEqual([
      'src/core/command/KeyCommand.js',
      renderPath,
      nodePath,
      modifyWidthPath,
      richTextPath,
    ]);
    expect(normalizedSha256(join(runtimeRoot, textEditPath)))
      .toBe(baseline.sourceHashes[textEditPath]);
    expect(normalizedSha256(join(runtimeRoot, renderPath)))
      .not.toBe(baseline.sourceHashes[renderPath]);
    expect(normalizedSha256(join(runtimeRoot, nodePath)))
      .not.toBe(baseline.sourceHashes[nodePath]);
    expect(normalizedSha256(join(runtimeRoot, modifyWidthPath)))
      .not.toBe(baseline.sourceHashes[modifyWidthPath]);
    expect(normalizedSha256(join(runtimeRoot, richTextPath)))
      .not.toBe(baseline.sourceHashes[richTextPath]);
  });
});
