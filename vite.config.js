import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    outDir: 'dist',
    // Keep false so parallel watch builds (main + content) don't wipe each other's outputs.
    emptyOutDir: false,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service-worker') return 'service-worker.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'icons/*', dest: 'icons' },
        { src: 'src/data/*', dest: 'data' },
      ],
    }),
  ],
});
