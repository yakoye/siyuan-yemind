import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const root = resolve('tests');
const manifestPath = resolve(root, 'suite-manifest.json');
if (!existsSync(manifestPath)) throw new Error('Missing tests/suite-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const expectedDomains = Object.keys(manifest).sort();
const specDir = resolve(root, 'specs');
const actualSpecs = readdirSync(specDir).filter((name) => name.endsWith('.test.ts')).sort();
const expectedSpecs = expectedDomains.map((domain) => `${domain}.test.ts`).sort();
if (JSON.stringify(actualSpecs) !== JSON.stringify(expectedSpecs)) {
  throw new Error(`Spec entries differ. expected=${expectedSpecs.join(',')} actual=${actualSpecs.join(',')}`);
}

const imported = new Set();
for (const domain of expectedDomains) {
  const entry = resolve(specDir, `${domain}.test.ts`);
  const text = readFileSync(entry, 'utf8');
  for (const suite of manifest[domain]) {
    const moduleName = suite.replace(/\.ts$/, '');
    const needle = `../suites/${domain}/${moduleName}`;
    if (!text.includes(needle)) throw new Error(`Missing import ${needle} in ${relative(process.cwd(), entry)}`);
    imported.add(`${domain}/${suite}`);
  }
}

const discovered = [];
for (const domain of readdirSync(resolve(root, 'suites'))) {
  const dir = resolve(root, 'suites', domain);
  if (!statSync(dir).isDirectory()) continue;
  for (const name of readdirSync(dir)) {
    if (name.endsWith('.suite.ts')) discovered.push(`${domain}/${name}`);
  }
}
discovered.sort();
const expected = [...imported].sort();
if (JSON.stringify(discovered) !== JSON.stringify(expected)) {
  const missing = discovered.filter((item) => !imported.has(item));
  const stale = expected.filter((item) => !discovered.includes(item));
  throw new Error(`Suite manifest mismatch. unimported=${missing.join(',')} missing=${stale.join(',')}`);
}

const rootTests = readdirSync(root).filter((name) => name.endsWith('.test.ts'));
if (rootTests.length) throw new Error(`Unclassified root tests: ${rootTests.join(',')}`);
console.log(`Test structure OK: ${expectedDomains.length} domains, ${expected.length} scenario modules.`);
