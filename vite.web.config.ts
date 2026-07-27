import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const assetRoot = resolve(__dirname, 'assets');
const assetMimeTypes: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
};

function serveWorkspaceAssets(): Plugin {
  return {
    name: 'yemind-workspace-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/assets', async (request, response, next) => {
        try {
          const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
            .replace(/^\/+/, '');
          const file = resolve(assetRoot, pathname);
          if (file !== assetRoot && !file.startsWith(`${assetRoot}${sep}`)) {
            next();
            return;
          }
          if (!(await stat(file)).isFile()) {
            next();
            return;
          }
          response.statusCode = 200;
          response.setHeader('Content-Type', assetMimeTypes[extname(file).toLowerCase()] ?? 'application/octet-stream');
          response.end(await readFile(file));
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, 'web'),
  base: './',
  plugins: [serveWorkspaceAssets()],
  resolve: {
    alias: {
      siyuan: resolve(__dirname, 'web/src/siyuanAdapter.ts'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'web-dist'),
    emptyOutDir: true,
  },
});
