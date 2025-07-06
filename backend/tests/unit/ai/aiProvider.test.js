const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const nock = require('nock');

// Mock node-fetch
const mockFetch = jest.fn();
jest.mock('node-fetch', () => ({ default: mockFetch }));

describe('AI Provider System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('AiProviderFactory', () => {
    const AiProviderFactory = require('../../../ai/AiProviderFactory.js');

    it('should create OpenAI provider when specified', () => {
      const provider = AiProviderFactory.createProvider('openai', 'test-key');
      expect(provider.constructor.name).toBe('OpenAiProvider');
    });

    it('should create Gemini provider when specified', () => {
      const provider = AiProviderFactory.createProvider('gemini', 'test-key');
      expect(provider.constructor.name).toBe('GeminiAiProvider');
    });

    it('should create Mock provider when specified', () => {
      const provider = AiProviderFactory.createProvider('mock');
      expect(provider.constructor.name).toBe('MockAiProvider');
    });

    it('should default to Mock provider for unknown types', () => {
      const provider = AiProviderFactory.createProvider('unknown');
      expect(provider.constructor.name).toBe('MockAiProvider');
    });

    it('should default to Mock provider when no type specified', () => {
      const provider = AiProviderFactory.createProvider();
      expect(provider.constructor.name).toBe('MockAiProvider');
    });

    it('should pass API key to providers that need it', () => {
      const openaiProvider = AiProviderFactory.createProvider('openai', 'test-key');
      expect(openaiProvider.apiKey).toBe('test-key');

      const geminiProvider = AiProviderFactory.createProvider('gemini', 'test-key');
      expect(geminiProvider.apiKey).toBe('test-key');
    });

    it('should handle empty or null API keys', () => {
      const provider1 = AiProviderFactory.createProvider('openai', '');
      const provider2 = AiProviderFactory.createProvider('openai', null);
      const provider3 = AiProviderFactory.createProvider('openai', undefined);

      expect(provider1.apiKey).toBe('');
      expect(provider2.apiKey).toBe(null);
      expect(provider3.apiKey).toBe(undefined);
    });
  });

  describe('IAiProvider Interface', () => {
    const IAiProvider = require('../../../ai/IAiProvider.js');

    it('should define the correct interface methods', () => {
      const provider = new IAiProvider();
      
      expect(typeof provider.summarizeText).toBe('function');
      expect(typeof provider.categorizeText).toBe('function');
      expect(typeof provider.translateText).toBe('function');
      expect(typeof provider.generateTags).toBe('function');
      expect(typeof provider.assessSeriousness).toBe('function');
    });

    it('should throw errors for unimplemented methods', async () => {
      const provider = new IAiProvider();
      
      await expect(provider.summarizeText('')).rejects.toThrow('Method not implemented');
      await expect(provider.categorizeText('')).rejects.toThrow('Method not implemented');
      await expect(provider.translateText('', 'en', 'de')).rejects.toThrow('Method not implemented');
      await expect(provider.generateTags('')).rejects.toThrow('Method not implemented');
      await expect(provider.assessSeriousness('')).rejects.toThrow('Method not implemented');
    });
  });

  describe('MockAiProvider', () => {
    const MockAiProvider = require('../../../ai/MockAiProvider.js');
    let provider;

    beforeEach(() => {
      provider = new MockAiProvider();
    });

    it('should summarize text with mock implementation', async () => {
      const text = 'This is a long article about artificial intelligence and machine learning technologies.';
      const result = await provider.summarizeText(text);
      
      expect(result).toContain('Mock summary');
      expect(result.length).toBeLessThan(text.length);
    });

    it('should categorize text with predefined categories', async () => {
      const techText = 'This article discusses programming and software development.';
      const result = await provider.categorizeText(techText);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(['Technology', 'Business', 'Science', 'Politics', 'Sports', 'Entertainment']).toEqual(expect.arrayContaining(result));
    });

    it('should translate text with mock implementation', async () => {
      const result = await provider.translateText('Hello World', 'en', 'de');
      
      expect(result).toContain('Mock translation');
      expect(result).toContain('Hello World');
      expect(result).toContain('en');
      expect(result).toContain('de');
    });

    it('should generate tags from text', async () => {
      const text = 'This is an article about artificial intelligence and machine learning.';
      const result = await provider.generateTags(text);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(tag => typeof tag === 'string')).toBe(true);
    });

    it('should assess seriousness with random score', async () => {
      const text = 'This is a serious news article about important events.';
      const result = await provider.assessSeriousness(text);
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    });

    it('should handle empty text input', async () => {
      const summary = await provider.summarizeText('');
      const categories = await provider.categorizeText('');
      const translation = await provider.translateText('', 'en', 'de');
      const tags = await provider.generateTags('');
      const seriousness = await provider.assessSeriousness('');
      
      expect(summary).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(translation).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(typeof seriousness).toBe('number');
    });

    it('should handle null input', async () => {
      const summary = await provider.summarizeText(null);
      const categories = await provider.categorizeText(null);
      const translation = await provider.translateText(null, 'en', 'de');
      const tags = await provider.generateTags(null);
      const seriousness = await provider.assessSeriousness(null);
      
      expect(summary).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(translation).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(typeof seriousness).toBe('number');
    });

    it('should handle very long text', async () => {
      const longText = 'A'.repeat(10000);
      const result = await provider.summarizeText(longText);
      
      expect(result).toBeDefined();
      expect(result.length).toBeLessThan(longText.length);
    });

    it('should handle special characters', async () => {
      const specialText = 'Text with émojis 🚀 and ümlaut characters!';
      const result = await provider.summarizeText(specialText);
      
      expect(result).toBeDefined();
      expect(result).toContain('Mock summary');
    });
  });

  describe('OpenAiProvider', () => {
    const OpenAiProvider = require('../../../ai/OpenAiProvider.js');
    let provider;

    beforeEach(() => {
      provider = new OpenAiProvider('test-api-key');
    });

    it('should initialize with API key', () => {
      expect(provider.apiKey).toBe('test-api-key');
    });

    it('should summarize text successfully', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'This is a summary of the article.' } }]
      };

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, mockResponse);

      const result = await provider.summarizeText('This is a long article about technology.');
      
      expect(result).toBe('This is a summary of the article.');
    });

    it('should handle OpenAI API errors', async () => {
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(500, { error: 'Internal server error' });

      const result = await provider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should handle network errors', async () => {
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .replyWithError('Network error');

      const result = await provider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should handle malformed API responses', async () => {
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, { invalid: 'response' });

      const result = await provider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should categorize text with proper format', async () => {
      const mockResponse = {
        choices: [{ message: { content: '["Technology", "Business"]' } }]
      };

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, mockResponse);

      const result = await provider.categorizeText('This is about tech and business.');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['Technology', 'Business']);
    });

    it('should handle invalid JSON in categorization', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Invalid JSON response' } }]
      };

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, mockResponse);

      const result = await provider.categorizeText('Test text');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['Uncategorized']);
    });

    it('should translate text correctly', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Hallo Welt' } }]
      };

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, mockResponse);

      const result = await provider.translateText('Hello World', 'en', 'de');
      
      expect(result).toBe('Hallo Welt');
    });

    it('should generate tags as array', async () => {
      const mockResponse = {
        choices: [{ message: { content: '["AI", "Technology", "Innovation"]' } }]
      };

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, mockResponse);

      const result = await provider.generateTags('Article about AI technology.');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['AI', 'Technology', 'Innovation']);
    });

    it('should assess seriousness as number', async () => {
      const mockResponse = {
        choices: [{ message: { content: '7' } }]
      };

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, mockResponse);

      const result = await provider.assessSeriousness('Serious news article.');
      
      expect(typeof result).toBe('number');
      expect(result).toBe(7);
    });

    it('should handle non-numeric seriousness response', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Not a number' } }]
      };

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, mockResponse);

      const result = await provider.assessSeriousness('Test text');
      
      expect(typeof result).toBe('number');
      expect(result).toBe(5); // Default fallback
    });

    it('should handle rate limiting', async () => {
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(429, { error: 'Rate limit exceeded' });

      const result = await provider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should handle unauthorized access', async () => {
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(401, { error: 'Unauthorized' });

      const result = await provider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should handle missing API key', async () => {
      const providerWithoutKey = new OpenAiProvider();
      
      const result = await providerWithoutKey.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should handle empty API key', async () => {
      const providerWithEmptyKey = new OpenAiProvider('');
      
      const result = await providerWithEmptyKey.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });
  });

  describe('GeminiAiProvider', () => {
    const GeminiAiProvider = require('../../../ai/GeminiAiProvider.js');
    let provider;

    beforeEach(() => {
      provider = new GeminiAiProvider('test-api-key');
    });

    it('should initialize with API key', () => {
      expect(provider.apiKey).toBe('test-api-key');
    });

    it('should summarize text successfully', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'This is a Gemini summary.' }]
            }
          }
        ]
      };

      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/gemini-pro:generateContent')
        .query({ key: 'test-api-key' })
        .reply(200, mockResponse);

      const result = await provider.summarizeText('This is a long article.');
      
      expect(result).toBe('This is a Gemini summary.');
    });

    it('should handle Gemini API errors', async () => {
      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/gemini-pro:generateContent')
        .query({ key: 'test-api-key' })
        .reply(400, { error: 'Bad request' });

      const result = await provider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should handle malformed Gemini responses', async () => {
      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/gemini-pro:generateContent')
        .query({ key: 'test-api-key' })
        .reply(200, { invalid: 'response' });

      const result = await provider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should categorize text with proper format', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: '["Science", "Technology"]' }]
            }
          }
        ]
      };

      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/gemini-pro:generateContent')
        .query({ key: 'test-api-key' })
        .reply(200, mockResponse);

      const result = await provider.categorizeText('Scientific article about technology.');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['Science', 'Technology']);
    });

    it('should handle blocked content', async () => {
      const mockResponse = {
        candidates: [
          {
            finishReason: 'SAFETY',
            safetyRatings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                probability: 'HIGH'
              }
            ]
          }
        ]
      };

      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/gemini-pro:generateContent')
        .query({ key: 'test-api-key' })
        .reply(200, mockResponse);

      const result = await provider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should handle quota exceeded', async () => {
      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/gemini-pro:generateContent')
        .query({ key: 'test-api-key' })
        .reply(429, { error: 'Quota exceeded' });

      const result = await provider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should handle network timeouts', async () => {
      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/gemini-pro:generateContent')
        .query({ key: 'test-api-key' })
        .socketDelay(10000)
        .reply(200, {});

      const result = await provider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should translate text correctly', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Bonjour le monde' }]
            }
          }
        ]
      };

      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/gemini-pro:generateContent')
        .query({ key: 'test-api-key' })
        .reply(200, mockResponse);

      const result = await provider.translateText('Hello World', 'en', 'fr');
      
      expect(result).toBe('Bonjour le monde');
    });

    it('should generate tags as array', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: '["Machine Learning", "AI", "Data Science"]' }]
            }
          }
        ]
      };

      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/gemini-pro:generateContent')
        .query({ key: 'test-api-key' })
        .reply(200, mockResponse);

      const result = await provider.generateTags('Article about machine learning.');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['Machine Learning', 'AI', 'Data Science']);
    });

    it('should assess seriousness as number', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: '8' }]
            }
          }
        ]
      };

      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/gemini-pro:generateContent')
        .query({ key: 'test-api-key' })
        .reply(200, mockResponse);

      const result = await provider.assessSeriousness('Important news article.');
      
      expect(typeof result).toBe('number');
      expect(result).toBe(8);
    });

    it('should handle empty candidates array', async () => {
      const mockResponse = {
        candidates: []
      };

      nock('https://generativelanguage.googleapis.com')
        .post('/v1beta/models/gemini-pro:generateContent')
        .query({ key: 'test-api-key' })
        .reply(200, mockResponse);

      const result = await provider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should handle missing API key', async () => {
      const providerWithoutKey = new GeminiAiProvider();
      
      const result = await providerWithoutKey.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });
  });

  describe('Provider Integration Tests', () => {
    const AiProviderFactory = require('../../../ai/AiProviderFactory.js');

    it('should handle provider switching', async () => {
      const mockProvider = AiProviderFactory.createProvider('mock');
      const result = await mockProvider.summarizeText('Test text');
      
      expect(result).toContain('Mock summary');
    });

    it('should handle provider failures gracefully', async () => {
      const openaiProvider = AiProviderFactory.createProvider('openai', 'invalid-key');
      
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(401, { error: 'Invalid API key' });

      const result = await openaiProvider.summarizeText('Test text');
      
      expect(result).toContain('Error:');
    });

    it('should handle concurrent requests', async () => {
      const mockProvider = AiProviderFactory.createProvider('mock');
      
      const promises = Array.from({ length: 10 }, (_, i) => 
        mockProvider.summarizeText(`Test text ${i}`)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toContain('Mock summary');
      });
    });

    it('should handle large text inputs', async () => {
      const mockProvider = AiProviderFactory.createProvider('mock');
      const largeText = 'Large text content. '.repeat(1000);
      
      const result = await mockProvider.summarizeText(largeText);
      
      expect(result).toBeDefined();
      expect(result.length).toBeLessThan(largeText.length);
    });
  });
});