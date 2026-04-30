import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/**/*.test.tsx',
      'src/**/*.test.ts',
      'lib/**/*.test.ts',
      'lib/**/*.test.tsx',
      'components/**/*.test.tsx',
      'components/**/*.test.ts',
    ],
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@parabuains/db/schema': resolve(__dirname, '../../packages/db/src/schema/index.ts'),
      '@parabuains/db': resolve(__dirname, '../../packages/db/src/index.ts'),
      'drizzle-orm': resolve(__dirname, '../../packages/db/node_modules/drizzle-orm'),
    },
  },
});
