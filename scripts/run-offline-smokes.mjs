import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outDir = resolve(root, '.tmp-offline-smokes');
const entries = [
  'themeSmokeEntry',
  'appearanceTransactionSmokeEntry',
  'outlineTextSmokeEntry',
  'structuredOutlineSmokeEntry',
];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  npx,
  [
    '--no-install',
    'tsc',
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
    '--skipLibCheck',
    '--types',
    'node',
    '--lib',
    'es2022,dom',
  ],
  { cwd: root, encoding: 'utf8', stdio: 'pipe' },
);
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
