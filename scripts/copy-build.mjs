import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');

await mkdir(root, { recursive: true });
for (const file of ['index.js', 'index.css', 'index.js.map']) {
  await copyFile(resolve(dist, file), resolve(root, file));
}
