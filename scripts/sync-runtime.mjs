import {
  access,
  cp,
  mkdir,
  readdir,
  rename,
  rm,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const RUNTIME_ROOT_FILES = [
  'plugin.json',
  'index.js',
  'index.css',
  'icon.png',
  'LICENSE',
  'README.md',
  'README_zh_CN.md',
];

export const RUNTIME_DIRECTORIES = ['assets', 'i18n'];

const DEFAULT_RUNTIME_TARGET = 'D:\\myDatabase\\SiYuan\\data\\plugins\\siyuan-yemind';

const exists = async (value) => access(value).then(() => true, () => false);

export function assertRuntimeTarget(target, expected) {
  const actualPath = path.resolve(target);
  const expectedPath = path.resolve(expected);
  if (actualPath.toLowerCase() !== expectedPath.toLowerCase()) {
    throw new Error(`Refusing to sync unexpected runtime target: ${actualPath}`);
  }
  if (path.basename(actualPath).toLowerCase() !== 'siyuan-yemind') {
    throw new Error(`Refusing to sync target without siyuan-yemind basename: ${actualPath}`);
  }
}

export async function runtimeManifest(root) {
  const resolvedRoot = path.resolve(root);
  const result = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else result.push(path.relative(resolvedRoot, absolute).replaceAll('\\', '/'));
    }
  }
  await walk(resolvedRoot);
  return result.sort();
}

function assertSafeSibling(candidate, target, marker) {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedTarget = path.resolve(target);
  if (
    path.dirname(resolvedCandidate).toLowerCase() !== path.dirname(resolvedTarget).toLowerCase()
    || !path.basename(resolvedCandidate).startsWith(`${path.basename(resolvedTarget)}.${marker}-`)
  ) {
    throw new Error(`Unsafe ${marker} path: ${resolvedCandidate}`);
  }
}

async function assertSourceComplete(source) {
  for (const relative of [...RUNTIME_ROOT_FILES, ...RUNTIME_DIRECTORIES]) {
    if (!await exists(path.join(source, relative))) {
      throw new Error(`Missing runtime source item: ${relative}`);
    }
  }
}

function assertStagedManifest(files) {
  const roots = new Set([...RUNTIME_ROOT_FILES, ...RUNTIME_DIRECTORIES, 'data']);
  for (const file of files) {
    const root = file.split('/')[0];
    if (!roots.has(root)) throw new Error(`Unexpected staged runtime item: ${file}`);
  }
}

export async function syncRuntime({
  source,
  target,
  expectedTarget = DEFAULT_RUNTIME_TARGET,
}) {
  const sourcePath = path.resolve(source);
  const targetPath = path.resolve(target);
  assertRuntimeTarget(targetPath, expectedTarget);
  await assertSourceComplete(sourcePath);

  const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const stagePath = `${targetPath}.sync-${nonce}`;
  const backupPath = `${targetPath}.backup-${nonce}`;
  assertSafeSibling(stagePath, targetPath, 'sync');
  assertSafeSibling(backupPath, targetPath, 'backup');
  if (await exists(stagePath) || await exists(backupPath)) {
    throw new Error('Refusing to reuse an existing runtime staging path');
  }

  let movedOldRuntime = false;
  let installedNewRuntime = false;
  try {
    await mkdir(stagePath);
    for (const filename of RUNTIME_ROOT_FILES) {
      await cp(path.join(sourcePath, filename), path.join(stagePath, filename));
    }
    for (const directory of RUNTIME_DIRECTORIES) {
      await cp(path.join(sourcePath, directory), path.join(stagePath, directory), {
        recursive: true,
      });
    }
    const existingData = path.join(targetPath, 'data');
    if (await exists(existingData)) {
      await cp(existingData, path.join(stagePath, 'data'), { recursive: true });
    }

    const stagedFiles = await runtimeManifest(stagePath);
    assertStagedManifest(stagedFiles);

    if (await exists(targetPath)) {
      await rename(targetPath, backupPath);
      movedOldRuntime = true;
    }
    await rename(stagePath, targetPath);
    installedNewRuntime = true;
    await runtimeManifest(targetPath);
    if (movedOldRuntime) await rm(backupPath, { recursive: true, force: true });
    return { files: await runtimeManifest(targetPath), target: targetPath };
  } catch (error) {
    if (installedNewRuntime && await exists(targetPath)) {
      await rm(targetPath, { recursive: true, force: true });
    }
    if (movedOldRuntime && await exists(backupPath)) {
      await rename(backupPath, targetPath);
    }
    if (await exists(stagePath)) {
      await rm(stagePath, { recursive: true, force: true });
    }
    throw error;
  }
}

export async function syncRuntimeInPlace({
  source,
  target,
  expectedTarget = DEFAULT_RUNTIME_TARGET,
}) {
  const sourcePath = path.resolve(source);
  const targetPath = path.resolve(target);
  assertRuntimeTarget(targetPath, expectedTarget);
  await assertSourceComplete(sourcePath);
  await mkdir(targetPath, { recursive: true });

  const allowedRoots = new Set([
    ...RUNTIME_ROOT_FILES,
    ...RUNTIME_DIRECTORIES,
    'data',
  ]);
  for (const entry of await readdir(targetPath, { withFileTypes: true })) {
    if (!allowedRoots.has(entry.name)) {
      await rm(path.join(targetPath, entry.name), {
        recursive: entry.isDirectory(),
        force: true,
      });
    }
  }

  for (const filename of RUNTIME_ROOT_FILES) {
    await cp(path.join(sourcePath, filename), path.join(targetPath, filename), {
      force: true,
    });
  }
  for (const directory of RUNTIME_DIRECTORIES) {
    const destination = path.join(targetPath, directory);
    await rm(destination, { recursive: true, force: true });
    await cp(path.join(sourcePath, directory), destination, { recursive: true });
  }

  const files = await runtimeManifest(targetPath);
  assertStagedManifest(files);
  return { files, target: targetPath };
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  const source = argumentValue('--source') ?? path.resolve('.');
  const target = argumentValue('--target') ?? DEFAULT_RUNTIME_TARGET;
  const synchronize = process.argv.includes('--in-place')
    ? syncRuntimeInPlace
    : syncRuntime;
  const result = await synchronize({
    source,
    target,
    expectedTarget: DEFAULT_RUNTIME_TARGET,
  });
  console.log(`Synced ${result.files.length} runtime files to ${result.target}`);
}
