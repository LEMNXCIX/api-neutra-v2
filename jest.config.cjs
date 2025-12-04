module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts', '**/test/**/*.test.js'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  testTimeout: 20000,
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock Scalar since it's not needed for unit tests
    '^@scalar/express-api-reference$': '<rootDir>/test/mocks/scalar.mock.ts',
    '^swagger-jsdoc$': '<rootDir>/test/mocks/swagger-jsdoc.mock.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@scalar|uuid)/)',
  ],
};
