import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const VERSION_MARKER_COUNT = 8;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const readText = async (root, relative) =>
  (await readFile(path.join(root, relative), 'utf8')).trim();
const readJson = async (root, relative) =>
  JSON.parse(await readText(root, relative));

export async function readVersionContract(root = process.cwd()) {
  const resolvedRoot = path.resolve(root);
  const packageJson = await readJson(resolvedRoot, 'package.json');
  const packageLock = await readJson(resolvedRoot, 'package-lock.json');
  const plugin = await readJson(resolvedRoot, 'plugin.json');
  const constants = await readText(resolvedRoot, 'src/plugin/constants.ts');
  const releaseInfo = await readText(resolvedRoot, 'src/releaseInfo.ts');
  const expected = String(packageJson.version ?? '');
  return {
    expected,
    versions: {
      'package.json': expected,
      'package-lock.json': packageLock.version,
      'package-lock.json packages[""]': packageLock.packages?.['']?.version,
      'plugin.json': plugin.version,
      VERSION: await readText(resolvedRoot, 'VERSION'),
      'web/VERSION': await readText(resolvedRoot, 'web/VERSION'),
      'src/plugin/constants.ts':
        constants.match(/PLUGIN_VERSION\s*=\s*['"]([^'"]+)/)?.[1],
      'src/releaseInfo.ts buildId':
        releaseInfo.match(/buildId:\s*['"]yemind-v([^-]+)/)?.[1],
    },
  };
}

export function assertVersionContract(contract) {
  const invalid = Object.entries(contract.versions)
    .filter(([, version]) => version !== contract.expected);
  if (!SEMVER.test(contract.expected) || invalid.length) {
    const details = invalid
      .map(([file, actual]) => `${file}: ${actual ?? 'missing'} (expected ${contract.expected})`)
      .join('\n');
    throw new Error(
      `Version consistency failed; expected ${contract.expected}${details ? `:\n${details}` : ''}`,
    );
  }
  if (Object.keys(contract.versions).length !== VERSION_MARKER_COUNT) {
    throw new Error(
      `Version marker count changed: ${Object.keys(contract.versions).length} (expected ${VERSION_MARKER_COUNT})`,
    );
  }
  return contract.expected;
}

export async function writeVersionContract(root, version) {
  if (!SEMVER.test(String(version))) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  const resolvedRoot = path.resolve(root);
  const packageJson = await readJson(resolvedRoot, 'package.json');
  const packageLock = await readJson(resolvedRoot, 'package-lock.json');
  const plugin = await readJson(resolvedRoot, 'plugin.json');
  const constantsPath = path.join(resolvedRoot, 'src/plugin/constants.ts');
  const releaseInfoPath = path.join(resolvedRoot, 'src/releaseInfo.ts');
  const constants = await readFile(constantsPath, 'utf8');
  const releaseInfo = await readFile(releaseInfoPath, 'utf8');
  const date = new Date().toISOString();
  const stamp = date.slice(0, 10).replaceAll('-', '');

  packageJson.version = version;
  packageLock.version = version;
  if (packageLock.packages?.['']) packageLock.packages[''].version = version;
  plugin.version = version;

  await Promise.all([
    writeFile(path.join(resolvedRoot, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`),
    writeFile(path.join(resolvedRoot, 'package-lock.json'), `${JSON.stringify(packageLock, null, 2)}\n`),
    writeFile(path.join(resolvedRoot, 'plugin.json'), `${JSON.stringify(plugin, null, 2)}\n`),
    writeFile(path.join(resolvedRoot, 'VERSION'), `${version}\n`),
    writeFile(path.join(resolvedRoot, 'web/VERSION'), `${version}\n`),
    writeFile(
      constantsPath,
      constants.replace(
        /PLUGIN_VERSION\s*=\s*(['"])[^'"]+\1/,
        `PLUGIN_VERSION = '${version}'`,
      ),
    ),
    writeFile(
      releaseInfoPath,
      releaseInfo
        .replace(/buildTime:\s*['"][^'"]+['"]/, `buildTime: '${date}'`)
        .replace(
          /buildId:\s*['"]yemind-v[^'"]+['"]/,
          `buildId: 'yemind-v${version}-${stamp}'`,
        ),
    ),
  ]);

  const contract = await readVersionContract(resolvedRoot);
  assertVersionContract(contract);
  return contract;
}
