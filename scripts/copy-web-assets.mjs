import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'web-dist');

await mkdir(output, { recursive: true });
await cp(path.join(root, 'assets'), path.join(output, 'assets'), {
  recursive: true,
  force: true,
});
await cp(path.join(root, 'icon.png'), path.join(output, 'icon.png'), {
  force: true,
});
await cp(path.join(root, 'web', 'VERSION'), path.join(output, 'VERSION'), {
  force: true,
});
await writeFile(path.join(output, '.nojekyll'), '');

console.log('[web-assets] copied assets/, icon.png, VERSION and .nojekyll');
