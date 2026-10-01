import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globalSetup: ['tests/globalSetup.js'],
    // First run downloads the mongod binary (~cached after) — generous hooks
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
})
