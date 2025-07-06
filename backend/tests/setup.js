// Global test setup for Jest
const path = require('path');
const fs = require('fs');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(__dirname, 'test.db');

// Mock external services by default
global.mockExternalServices = () => {
  // Mock translation API
  global.fetch = jest.fn();
  
  // Mock RSS parser
  jest.mock('rss-parser', () => {
    return jest.fn().mockImplementation(() => ({
      parseURL: jest.fn().mockResolvedValue({
        items: []
      })
    }));
  });
};

// Database cleanup utility
global.cleanupTestDb = () => {
  const testDbPath = process.env.DB_PATH;
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
};

// Setup before each test
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clean up test database
  global.cleanupTestDb();
});

// Cleanup after each test
afterEach(() => {
  // Clean up test database
  global.cleanupTestDb();
  
  // Reset modules
  jest.resetModules();
});

// Global teardown
afterAll(() => {
  // Final cleanup
  global.cleanupTestDb();
});

// Custom matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidISODate(received) {
    const date = new Date(received);
    const pass = date instanceof Date && !isNaN(date) && received === date.toISOString();
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO date`,
        pass: false,
      };
    }
  },
  
  toBeValidURL(received) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  }
});

// Test utilities
global.testUtils = {
  // Create a test article
  createTestArticle: (overrides = {}) => ({
    id: 'test-article-' + Date.now(),
    link: 'https://example.com/article',
    originalTitle: 'Test Article',
    originalSummary: 'This is a test article',
    translatedTitle: 'Test Artikel',
    translatedSummary: 'Dies ist ein Test Artikel',
    sourceFeedName: 'Test Feed',
    publicationDate: new Date().toISOString(),
    processedDate: new Date().toISOString(),
    topics: '["Technology"]',
    seriousnessScore: 7,
    imageUrl: 'https://example.com/image.jpg',
    imageGenerated: 0,
    aiEnhanced: 1,
    ...overrides
  }),
  
  // Create a test feed
  createTestFeed: (overrides = {}) => ({
    id: 'test-feed-' + Date.now(),
    name: 'Test Feed',
    url: 'https://example.com/feed.xml',
    language: 'en',
    ...overrides
  }),
  
  // Create a test topic
  createTestTopic: (overrides = {}) => ({
    id: 'test-topic-' + Date.now(),
    name: 'Test Topic',
    keywords: '["test", "topic"]',
    excludeKeywords: '["spam"]',
    ...overrides
  }),
  
  // Wait for async operations
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 10);
        }
      };
      
      check();
    });
  },
  
  // Mock fetch with response
  mockFetch: (response, options = {}) => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => response,
      text: async () => JSON.stringify(response),
      ...options
    };
    
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
    return global.fetch;
  },
  
  // Generate test data
  generateTestData: {
    feeds: (count = 5) => Array.from({ length: count }, (_, i) => 
      global.testUtils.createTestFeed({
        id: `feed-${i}`,
        name: `Feed ${i}`,
        url: `https://example${i}.com/feed.xml`
      })
    ),
    
    topics: (count = 3) => Array.from({ length: count }, (_, i) => 
      global.testUtils.createTestTopic({
        id: `topic-${i}`,
        name: `Topic ${i}`,
        keywords: `["keyword${i}"]`
      })
    ),
    
    articles: (count = 10) => Array.from({ length: count }, (_, i) => 
      global.testUtils.createTestArticle({
        id: `article-${i}`,
        originalTitle: `Article ${i}`,
        publicationDate: new Date(Date.now() - i * 86400000).toISOString()
      })
    )
  }
};

// Performance measurement utilities
global.measurePerformance = (fn) => {
  const start = process.hrtime.bigint();
  const result = fn();
  const end = process.hrtime.bigint();
  
  if (result instanceof Promise) {
    return result.then(value => ({
      result: value,
      duration: Number(end - start) / 1000000 // Convert to milliseconds
    }));
  }
  
  return {
    result,
    duration: Number(end - start) / 1000000
  };
};

// Memory usage monitoring
global.getMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss / 1024 / 1024, // MB
    heapTotal: usage.heapTotal / 1024 / 1024, // MB
    heapUsed: usage.heapUsed / 1024 / 1024, // MB
    external: usage.external / 1024 / 1024 // MB
  };
};

// Console output capture for testing
global.captureConsole = () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const logs = [];
  const errors = [];
  const warnings = [];
  
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));
  console.warn = (...args) => warnings.push(args.join(' '));
  
  return {
    getLogs: () => logs,
    getErrors: () => errors,
    getWarnings: () => warnings,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  };
};