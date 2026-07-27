import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { assertVersionContract, readVersionContract } from './version-contract.mjs';

export const PLUGIN_RELEASE_ROOT_FILES = [
  'plugin.json',
  'index.js',
  'index.css',
  'icon.png',
  'LICENSE',
  'README.md',
  'README_zh_CN.md',
  'VERSION',
];
export const PLUGIN_RELEASE_DIRECTORIES = ['assets', 'i18n'];

export function releaseArtifactNames(version) {
  return {
    plugin: `siyuan-yemind-v${version}.zip`,
    web: `yemind-web-v${version}.zip`,
    manifest: 'release-manifest.json',
    checksums: 'SHA256SUMS',
  };
}

export function assertSafeReleaseDirectory(target, releaseRoot, version) {
  const actual = path.resolve(target);
  const expectedRoot = path.resolve(releaseRoot);
  const expected = path.join(expectedRoot, `v${version}`);
  if (
    actual.toLowerCase() !== expected.toLowerCase()
    || path.dirname(actual).toLowerCase() !== expectedRoot.toLowerCase()
  ) {
    throw new Error(`Unsafe release directory: ${actual}`);
  }
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function exists(value) {
  return access(value).then(() => true, () => false);
}

async function collectFiles(root, relative = '') {
  const directory = path.join(root, relative);
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(root, child));
    else if (entry.isFile()) files.push(child.replaceAll('\\', '/'));
  }
  return files.sort();
}

async function zipFiles(root, relativeFiles) {
  const zip = new JSZip();
  for (const relative of relativeFiles) {
    zip.file(relative, await readFile(path.join(root, relative)));
  }
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    platform: 'UNIX',
  });
}

async function pluginFiles(root) {
  for (const relative of [...PLUGIN_RELEASE_ROOT_FILES, ...PLUGIN_RELEASE_DIRECTORIES]) {
    if (!await exists(path.join(root, relative))) {
      throw new Error(`Missing plugin release input: ${relative}`);
    }
  }
  const nested = [];
  for (const directory of PLUGIN_RELEASE_DIRECTORIES) {
    nested.push(...await collectFiles(root, directory));
  }
  return [...PLUGIN_RELEASE_ROOT_FILES, ...nested];
}

function gitCommit(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

export async function buildRelease(root = process.cwd()) {
  const resolvedRoot = path.resolve(root);
  const contract = await readVersionContract(resolvedRoot);
  const version = assertVersionContract(contract);
  const names = releaseArtifactNames(version);
  const releaseRoot = path.join(resolvedRoot, 'release');
  const output = path.join(releaseRoot, `v${version}`);
  assertSafeReleaseDirectory(output, releaseRoot, version);
  await mkdir(releaseRoot, { recursive: true });
  await rm(output, { recursive: true, force: true });
  await mkdir(output);

  const webRoot = path.join(resolvedRoot, 'web-dist');
  if (!await exists(path.join(webRoot, 'index.html'))) {
    throw new Error('Missing web release input: web-dist/index.html');
  }
  const pluginBuffer = await zipFiles(resolvedRoot, await pluginFiles(resolvedRoot));
  const webBuffer = await zipFiles(webRoot, await collectFiles(webRoot));
  await Promise.all([
    writeFile(path.join(output, names.plugin), pluginBuffer),
    writeFile(path.join(output, names.web), webBuffer),
  ]);

  const artifacts = [
    { kind: 'plugin', file: names.plugin, bytes: pluginBuffer.length, sha256: sha256(pluginBuffer) },
    { kind: 'web', file: names.web, bytes: webBuffer.length, sha256: sha256(webBuffer) },
  ];
  const manifest = {
    schemaVersion: 1,
    version,
    commit: gitCommit(resolvedRoot),
    builtAt: new Date().toISOString(),
    artifacts,
  };
  const manifestBuffer = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(output, names.manifest), manifestBuffer);
  const checksumLines = [
    ...artifacts.map((artifact) => `${artifact.sha256}  ${artifact.file}`),
    `${sha256(manifestBuffer)}  ${names.manifest}`,
  ];
  await writeFile(path.join(output, names.checksums), `${checksumLines.join('\n')}\n`);

  return {
    output,
    version,
    names,
    manifest,
  };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  const result = await buildRelease(process.cwd());
  const totalBytes = (await Promise.all(
    result.manifest.artifacts.map((artifact) =>
      stat(path.join(result.output, artifact.file)).then((entry) => entry.size)),
  )).reduce((sum, bytes) => sum + bytes, 0);
  console.log(`Built YeMind v${result.version} release in ${result.output} (${totalBytes} bytes).`);
}
