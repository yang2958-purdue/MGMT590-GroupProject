import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Second build step: single-file IIFE for programmatic inject.
 * chrome.scripting.executeScript({ files }) runs as a classic script; ES module
 * entry with `import` from sibling chunks never registers chrome.runtime.onMessage.
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'src/content/content.js'),
      output: {
        entryFileNames: 'content/content.js',
        format: 'iife',
        name: 'JobBotContent',
        inlineDynamicImports: true,
      },
    },
  },
});
