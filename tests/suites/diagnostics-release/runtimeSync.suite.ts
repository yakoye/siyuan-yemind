import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertRuntimeTarget,
  RUNTIME_DIRECTORIES,
  RUNTIME_ROOT_FILES,
  runtimeManifest,
  syncRuntime,
  syncRuntimeInPlace,
} from '../../../scripts/sync-runtime.mjs';

const temporaryRoots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'yemind-runtime-sync-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('v0.9.32 minimal runtime synchronization', () => {
  it('defines only deployable root files and runtime asset directories', () => {
    expect(RUNTIME_ROOT_FILES).toEqual([
      'plugin.json',
      'index.js',
      'index.css',
      'icon.png',
      'LICENSE',
      'README.md',
      'README_zh_CN.md',
    ]);
    expect(RUNTIME_ROOT_FILES).not.toContain('index.js.map');
    expect(RUNTIME_DIRECTORIES).toEqual(['assets', 'i18n']);
  });

  it('refuses a target other than the explicitly expected runtime', () => {
    const expected = path.resolve('D:/runtime/siyuan-yemind');
    expect(() => assertRuntimeTarget('D:/wrong/siyuan-yemind', expected)).toThrow(/refusing/i);
    expect(() => assertRuntimeTarget(expected, expected)).not.toThrow();
  });

  it('atomically replaces a dirty runtime with the whitelist while preserving data', async () => {
    const root = await temporaryRoot();
    const source = path.join(root, 'source');
    const target = path.join(root, 'siyuan-yemind');
    await Promise.all([mkdir(source), mkdir(target)]);
    for (const filename of RUNTIME_ROOT_FILES) {
      await writeFile(path.join(source, filename), filename);
    }
    for (const directory of RUNTIME_DIRECTORIES) {
      await mkdir(path.join(source, directory));
      await writeFile(path.join(source, directory, `${directory}.txt`), directory);
    }
    await mkdir(path.join(source, 'docs'));
    await writeFile(path.join(source, 'docs', 'not-runtime.txt'), 'no');
    await mkdir(path.join(target, 'src'));
    await writeFile(path.join(target, 'src', 'old.ts'), 'old');
    await writeFile(path.join(target, 'index.js.map'), '{}');
    await mkdir(path.join(target, 'data'));
    await writeFile(path.join(target, 'data', 'user.json'), '{"keep":true}');

    await syncRuntime({ source, target, expectedTarget: target });

    expect(await runtimeManifest(target)).toEqual([
      'LICENSE',
      'README.md',
      'README_zh_CN.md',
      'assets/assets.txt',
      'data/user.json',
      'i18n/i18n.txt',
      'icon.png',
      'index.css',
      'index.js',
      'plugin.json',
    ]);
    expect(await readFile(path.join(target, 'data', 'user.json'), 'utf8')).toBe('{"keep":true}');
  });

  it('can clean an in-use runtime in place while preserving data', async () => {
    const root = await temporaryRoot();
    const source = path.join(root, 'source');
    const target = path.join(root, 'siyuan-yemind');
    await Promise.all([mkdir(source), mkdir(target)]);
    for (const filename of RUNTIME_ROOT_FILES) {
      await writeFile(path.join(source, filename), `current:${filename}`);
    }
    for (const directory of RUNTIME_DIRECTORIES) {
      await mkdir(path.join(source, directory));
      await writeFile(path.join(source, directory, 'current.txt'), directory);
      await mkdir(path.join(target, directory));
      await writeFile(path.join(target, directory, 'stale.txt'), 'stale');
    }
    await mkdir(path.join(target, 'tests'));
    await writeFile(path.join(target, 'tests', 'old.ts'), 'old');
    await mkdir(path.join(target, 'data'));
    await writeFile(path.join(target, 'data', 'user.json'), '{"keep":true}');

    await syncRuntimeInPlace({ source, target, expectedTarget: target });

    expect(await runtimeManifest(target)).toEqual([
      'LICENSE',
      'README.md',
      'README_zh_CN.md',
      'assets/current.txt',
      'data/user.json',
      'i18n/current.txt',
      'icon.png',
      'index.css',
      'index.js',
      'plugin.json',
    ]);
    expect(await readFile(path.join(target, 'index.js'), 'utf8')).toBe('current:index.js');
    expect(await readFile(path.join(target, 'data', 'user.json'), 'utf8')).toBe('{"keep":true}');
  });
});
