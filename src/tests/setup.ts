import dotenv from 'dotenv';

// Load test environment variables
dotenv.config();

// Set test timeout
jest.setTimeout(30000);

// Suppress console logs during tests unless explicitly needed
if (process.env.SUPPRESS_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}