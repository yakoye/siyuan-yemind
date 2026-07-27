import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import {
  PLUGIN_RELEASE_ROOT_FILES,
  releaseArtifactNames,
} from './build-release.mjs';
import { assertVersionContract, readVersionContract } from './version-contract.mjs';

const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');

export async function verifyRelease(root = process.cwd()) {
  const resolvedRoot = path.resolve(root);
  const contract = await readVersionContract(resolvedRoot);
  const version = assertVersionContract(contract);
  const names = releaseArtifactNames(version);
  const output = path.join(resolvedRoot, 'release', `v${version}`);
  const manifestBuffer = await readFile(path.join(output, names.manifest));
  const manifest = JSON.parse(manifestBuffer.toString('utf8'));
  if (manifest.version !== version) {
    throw new Error(`Release manifest version ${manifest.version} does not match ${version}`);
  }
  const checksumText = await readFile(path.join(output, names.checksums), 'utf8');
  const checksumMap = new Map(
    checksumText.trim().split(/\r?\n/).map((line) => {
      const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/);
      if (!match) throw new Error(`Invalid checksum line: ${line}`);
      return [match[2], match[1]];
    }),
  );
  for (const artifact of manifest.artifacts) {
    const buffer = await readFile(path.join(output, artifact.file));
    const actual = digest(buffer);
    if (actual !== artifact.sha256 || actual !== checksumMap.get(artifact.file)) {
      throw new Error(`SHA256 mismatch: ${artifact.file}`);
    }
    if (buffer.length !== artifact.bytes) {
      throw new Error(`Byte count mismatch: ${artifact.file}`);
    }
  }
  if (digest(manifestBuffer) !== checksumMap.get(names.manifest)) {
    throw new Error(`SHA256 mismatch: ${names.manifest}`);
  }

  const pluginZip = await JSZip.loadAsync(await readFile(path.join(output, names.plugin)));
  for (const required of PLUGIN_RELEASE_ROOT_FILES) {
    if (!pluginZip.file(required)) throw new Error(`Plugin ZIP missing ${required}`);
  }
  if (!Object.keys(pluginZip.files).some((file) => file.startsWith('assets/'))) {
    throw new Error('Plugin ZIP missing assets/');
  }
  if (!Object.keys(pluginZip.files).some((file) => file.startsWith('i18n/'))) {
    throw new Error('Plugin ZIP missing i18n/');
  }

  const webZip = await JSZip.loadAsync(await readFile(path.join(output, names.web)));
  for (const required of ['index.html', 'VERSION', '.nojekyll', 'icon.png']) {
    if (!webZip.file(required)) throw new Error(`Web ZIP missing ${required}`);
  }
  return { output, version, manifest };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  const result = await verifyRelease(process.cwd());
  console.log(
    `Verified YeMind v${result.version} release: ${result.manifest.artifacts.length} ZIP artifacts and SHA256SUMS.`,
  );
}
