module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFiles: ['dotenv/config'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/controllers/**/*.ts',
    'src/services/market/market-router.ts',
    'src/services/market/cache.ts',
    'src/services/market/circuit-breaker.ts',
    'src/services/market/providers/brvm-transaction-cost.provider.ts',
    '!**/*.test.ts',
  ],
  coverageThreshold: {
    global: { lines: 60 },
  },
}
