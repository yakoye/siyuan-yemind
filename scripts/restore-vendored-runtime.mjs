import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const [sourceMapArgument, installedPackageArgument, outputArgument] = process.argv.slice(2);

if (!sourceMapArgument || !installedPackageArgument || !outputArgument) {
  console.error(
    'Usage: node scripts/restore-vendored-runtime.mjs <index.js.map> <installed-simple-mind-map> <output-directory>',
  );
  process.exit(1);
}

const sourceMapPath = path.resolve(sourceMapArgument);
const installedPackagePath = path.resolve(installedPackageArgument);
const outputPath = path.resolve(outputArgument);
const expectedOutputName = path.join('vendor', 'simple-mind-map-runtime');

if (!outputPath.endsWith(expectedOutputName)) {
  throw new Error(`Refusing to write outside ${expectedOutputName}: ${outputPath}`);
}

if (fs.existsSync(outputPath)) {
  throw new Error(`Output directory already exists: ${outputPath}`);
}

const sourceMap = JSON.parse(fs.readFileSync(sourceMapPath, 'utf8'));
const packageJson = JSON.parse(
  fs.readFileSync(path.join(installedPackagePath, 'package.json'), 'utf8'),
);

fs.mkdirSync(outputPath, { recursive: true });
fs.cpSync(path.join(installedPackagePath, 'src'), path.join(outputPath, 'src'), {
  recursive: true,
});

for (const filename of ['index.js', 'full.js', 'README.md']) {
  const sourcePath = path.join(installedPackagePath, filename);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, path.join(outputPath, filename));
  }
}

packageJson.main = './index.js';
packageJson.module = './index.js';
delete packageJson.bin;
delete packageJson.scripts;
fs.writeFileSync(
  path.join(outputPath, 'package.json'),
  `${JSON.stringify(packageJson, null, 2)}\n`,
);

let restoredCount = 0;
for (let index = 0; index < sourceMap.sources.length; index += 1) {
  const sourceName = String(sourceMap.sources[index]).replaceAll('\\', '/');
  const marker = 'node_modules/simple-mind-map/';
  const markerIndex = sourceName.indexOf(marker);
  if (markerIndex < 0) continue;

  const relativePath = sourceName.slice(markerIndex + marker.length);
  const content = sourceMap.sourcesContent?.[index];
  if (typeof content !== 'string') {
    throw new Error(`Missing sourcesContent for ${sourceName}`);
  }

  const destination = path.resolve(outputPath, relativePath);
  if (!destination.startsWith(`${outputPath}${path.sep}`)) {
    throw new Error(`Unsafe source-map path: ${sourceName}`);
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  restoredCount += 1;
}

if (restoredCount < 50) {
  throw new Error(`Expected at least 50 runtime sources, restored ${restoredCount}`);
}

console.log(`Restored ${restoredCount} patched simple-mind-map sources to ${outputPath}`);
