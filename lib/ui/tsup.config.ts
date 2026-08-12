import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    compilerOptions: {
      // Skip type-checking during DTS emit to avoid React 18/19 peer type conflicts
      // in the mixed-React workspace (lucide-react, sonner use @types/react@19 peers).
      // TypeScript 5.5+ supports noCheck for declaration-only emit.
      noCheck: true,
    },
  },
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
