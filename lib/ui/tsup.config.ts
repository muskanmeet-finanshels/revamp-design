import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  esbuildOptions(options) {
    options.alias = {
      '@/lib/utils': './src/lib/utils',
    };
  },
  banner: {
    js: "'use client';",
  },
});
