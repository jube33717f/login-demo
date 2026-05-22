import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '\\.module\\.css$': 'identity-obj-proxy',
    '\\.(css)$': 'identity-obj-proxy',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
};

export default config;
