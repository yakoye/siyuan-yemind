import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.');
const text = async (relative) => (await readFile(path.join(root, relative), 'utf8')).trim();
const json = async (relative) => JSON.parse(await text(relative));

const packageJson = await json('package.json');
const packageLock = await json('package-lock.json');
const plugin = await json('plugin.json');
const expected = packageJson.version;
const versions = {
  'package.json': expected,
  'package-lock.json': packageLock.version,
  'package-lock.json packages[""]': packageLock.packages?.['']?.version,
  'plugin.json': plugin.version,
  VERSION: await text('VERSION'),
  'web/VERSION': await text('web/VERSION'),
};

const constants = await text('src/plugin/constants.ts');
const releaseInfo = await text('src/releaseInfo.ts');
versions['src/plugin/constants.ts'] = constants.match(/PLUGIN_VERSION\s*=\s*['"]([^'"]+)/)?.[1];
versions['src/releaseInfo.ts buildId'] = releaseInfo.match(/buildId:\s*['"]yemind-v([^-]+)/)?.[1];

const invalid = Object.entries(versions).filter(([, version]) => version !== expected);
if (invalid.length) {
  console.error(`Version consistency failed; expected ${expected}:`);
  for (const [file, version] of invalid) console.error(`- ${file}: ${version ?? 'missing'}`);
  process.exit(1);
}

console.log(`YeMind version ${expected} is consistent across ${Object.keys(versions).length} release markers.`);
