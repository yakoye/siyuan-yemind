import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      siyuan: resolve(__dirname, 'web/src/siyuanAdapter.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['web/tests/**/*.test.ts'],
    clearMocks: true,
  },
});
