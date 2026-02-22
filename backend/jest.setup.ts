// Global test setup for Express backend
import '@testing-library/jest-dom';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';

// Suppress console errors and warnings in tests to reduce noise
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: console.log, // Keep log for debugging if needed
};