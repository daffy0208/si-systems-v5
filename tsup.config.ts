import { defineConfig } from 'tsup';

export default defineConfig({
  // Entry points for each module
  entry: [
    'src/index.ts',
    'src/adapters/index.ts',
    'src/core/index.ts',
    'src/persistence/index.ts',
    'src/nlp/index.ts',
    'src/filters/index.ts',
    'src/prompters/index.ts',
  ],

  // Output both CJS and ESM formats
  format: ['cjs', 'esm'],

  // Generate TypeScript declarations
  dts: true,

  // Don't bundle dependencies (let consumers handle it)
  splitting: false,

  // Generate sourcemaps
  sourcemap: true,

  // Clean dist folder before build
  clean: true,

  // Target modern Node.js
  target: 'node16',

  // Preserve directory structure
  outDir: 'dist',
});
