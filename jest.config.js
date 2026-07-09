module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  testMatch: ['<rootDir>/test/**/*.test.ts'],
};
