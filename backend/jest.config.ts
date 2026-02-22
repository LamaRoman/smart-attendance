import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'node',
  
  // Root directory
  rootDir: '.',
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
  ],
  
  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Transform files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
};

export default config;