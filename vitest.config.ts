import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['scraper/**/*.js', 'src/**/*.{js,jsx}', 'server.js'],
      exclude: [
        'node_modules/**',
        'scraper/__tests__/**',
        'src/__tests__/**',
        'scraper/noticeboard-scraper-old.js', // Old backup file
        'scripts/**', // Setup scripts (non-critical)
        'server-scheduler.js', // Scheduler (Phase 2)
      ],
      all: true,
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
      // NOTE: 17 tests validate critical parsing patterns (cheerio selectors, regex)
      // Tests are isolated to avoid network dependencies (Phase 1 quick win)
      // TODO Phase 2: Export scraper functions, add integration tests, reach 50% coverage
    },
  },
});
