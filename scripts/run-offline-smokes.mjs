import { createRequire } from 'node:module';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const outDir = resolve(root, '.tmp-offline-smokes');
const entries = [
  'themeSmokeEntry',
  'appearanceTransactionSmokeEntry',
  'outlineTextSmokeEntry',
  'structuredOutlineSmokeEntry',
  'dragIntentSmokeEntry',
  'localAssetsSmokeEntry',
];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

function resolveCommand(command) {
  const lookup = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], {
    encoding: 'utf8',
  });
  return lookup.status === 0 ? String(lookup.stdout).trim().split(/\r?\n/)[0] : command;
}

const tsc = resolveCommand(process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
const tscBin = dirname(tsc);
const nodeTypesCandidates = [
  resolve(tscBin, '..', 'lib', 'node_modules', 'ts-node', 'node_modules', '@types'),
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@types'),
];
const nodeTypeRoot = nodeTypesCandidates.find((candidate) => existsSync(resolve(candidate, 'node')));

const args = [
  ...entries.map((name) => `tests/offline/${name}.ts`),
  '--outDir',
  outDir,
  '--module',
  'commonjs',
  '--target',
  'es2022',
  '--moduleResolution',
  'node',
  '--esModuleInterop',
  '--resolveJsonModule',
  '--skipLibCheck',
  '--lib',
  'es2022,dom',
];
if (nodeTypeRoot) {
  args.push('--types', 'node', '--typeRoots', nodeTypeRoot);
}

const result = spawnSync(tsc, args, {
  cwd: root,
  encoding: 'utf8',
  stdio: 'pipe',
});
if (result.status !== 0) {
  process.stderr.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  rmSync(outDir, { recursive: true, force: true });
  process.exit(result.status ?? 1);
}

const require = createRequire(import.meta.url);
try {
  for (const name of entries) {
    const modulePath = resolve(outDir, 'tests', 'offline', `${name}.js`);
    const value = require(modulePath).default;
    console.log(`[offline] ${name}: ${JSON.stringify(value)}`);
  }
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
