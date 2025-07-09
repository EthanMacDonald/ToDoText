/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/e2e/',
        'dashboard/frontend/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
    include: [
      'tests/integration/**/*.{test,spec}.{js,ts}',
    ],
    exclude: [
      'tests/e2e/**/*',
      'tests/frontend/**/*',
      'tests/backend/**/*',
      'node_modules/**/*',
    ],
  },
})
