import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { createSourceBuildDefines, resolveSourceBuildIdentity } from './build/buildIdentity';

const sourceBuild = resolveSourceBuildIdentity(__dirname);

export default defineConfig({
  define: createSourceBuildDefines(sourceBuild),
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['siyuan'],
      output: {
        exports: 'default',
        assetFileNames: (assetInfo: { name?: string }) => assetInfo.name?.endsWith('.css') ? 'index.css' : 'assets/[name]-[hash][extname]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
  },
});
