/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.(ts|js)x?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testRegex: '\\.integration\\.test\\.ts$',
  setupFiles: ['dotenv/config'], // Load .env file before tests
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  resetMocks: true
};
