import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertVersionContract,
  readVersionContract,
  VERSION_MARKER_COUNT,
} from '../../../scripts/release/version-contract.mjs';
import {
  assertSafeReleaseDirectory,
  RELEASE_ZIP_DATE,
  releaseArtifactNames,
} from '../../../scripts/release/build-release.mjs';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('v1.5.0 unified release artifacts', () => {
  it('reads one version contract across every release marker', async () => {
    const contract = await readVersionContract(path.resolve('.'));
    expect(contract.expected).toBe('1.5.1');
    expect(Object.keys(contract.versions)).toHaveLength(VERSION_MARKER_COUNT);
    expect(() => assertVersionContract(contract)).not.toThrow();
  });

  it('reports the exact marker when one version drifts', () => {
    expect(() => assertVersionContract({
      expected: '1.5.0',
      versions: {
        'package.json': '1.5.0',
        'web/VERSION': '1.2.0',
      },
    })).toThrow(/web\/VERSION.*1\.2\.0.*1\.5\.0/s);
  });

  it('names both host packages and refuses release cleanup outside release root', async () => {
    expect(RELEASE_ZIP_DATE.toISOString()).toBe('1980-01-01T00:00:00.000Z');
    expect(releaseArtifactNames('1.5.0')).toEqual({
      plugin: 'siyuan-yemind-v1.5.0.zip',
      web: 'yemind-web-v1.5.0.zip',
      manifest: 'release-manifest.json',
      checksums: 'SHA256SUMS',
    });
    const root = await mkdtemp(path.join(os.tmpdir(), 'yemind-release-'));
    temporaryRoots.push(root);
    const releaseRoot = path.join(root, 'release');
    const target = path.join(releaseRoot, 'v1.5.0');
    expect(() => assertSafeReleaseDirectory(target, releaseRoot, '1.5.0')).not.toThrow();
    expect(() => assertSafeReleaseDirectory(root, releaseRoot, '1.5.0')).toThrow(/unsafe/i);
  });

  it('keeps the version setter and verifier wired to the shared contract', async () => {
    const setter = await readFile(path.resolve('scripts/release/set-version.mjs'), 'utf8');
    const verifier = await readFile(path.resolve('scripts/release/verify-release.mjs'), 'utf8');
    expect(setter).toContain('writeVersionContract');
    expect(verifier).toContain('releaseArtifactNames');
    expect(verifier).toContain('checksumMap');
    expect(verifier).toContain('JSZip.loadAsync');
  });
});
