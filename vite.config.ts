import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["cjs"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["siyuan"],
      output: { exports: "default" },
    },
    outDir: ".",
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
  },
});
