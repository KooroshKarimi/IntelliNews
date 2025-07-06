const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const nock = require('nock');

// Mock dependencies
const mockParser = {
  parseURL: jest.fn()
};

const mockDb = {
  all: jest.fn(),
  run: jest.fn(),
  serialize: jest.fn(callback => callback())
};

const mockFetch = jest.fn();

// Mock modules
jest.mock('rss-parser', () => jest.fn(() => mockParser));
jest.mock('node-fetch', () => ({ default: mockFetch }));
jest.mock('../db.js', () => ({ db: mockDb }));

// Import after mocking
const { processAllFeeds } = require('../../feedProcessor.js');

describe('Feed Processor Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Translation Function', () => {
    const feedProcessor = require('../../feedProcessor.js');

    it('should translate text successfully', async () => {
      const mockTranslation = {
        responseData: {
          translatedText: 'Hallo Welt'
        }
      };

      nock('https://api.mymemory.translated.net')
        .get('/get')
        .query({ q: 'Hello World', langpair: 'en|de' })
        .reply(200, mockTranslation);

      // Access the internal translate function through module internals
      const translateModule = require('../../feedProcessor.js');
      const result = await translateModule.translateText('Hello World', 'en', 'de');
      
      expect(result).toBe('Hallo Welt');
    });

    it('should return original text when translation fails', async () => {
      nock('https://api.mymemory.translated.net')
        .get('/get')
        .query({ q: 'Hello World', langpair: 'en|de' })
        .reply(500);

      const translateModule = require('../../feedProcessor.js');
      const result = await translateModule.translateText('Hello World', 'en', 'de');
      
      expect(result).toBe('Hello World');
    });

    it('should return original text when source and target language are same', async () => {
      const translateModule = require('../../feedProcessor.js');
      const result = await translateModule.translateText('Hello World', 'en', 'en');
      
      expect(result).toBe('Hello World');
    });

    it('should handle empty text', async () => {
      const translateModule = require('../../feedProcessor.js');
      const result = await translateModule.translateText('', 'en', 'de');
      
      expect(result).toBe('');
    });

    it('should handle null text', async () => {
      const translateModule = require('../../feedProcessor.js');
      const result = await translateModule.translateText(null, 'en', 'de');
      
      expect(result).toBe(null);
    });

    it('should handle undefined text', async () => {
      const translateModule = require('../../feedProcessor.js');
      const result = await translateModule.translateText(undefined, 'en', 'de');
      
      expect(result).toBe(undefined);
    });

    it('should handle malformed API response', async () => {
      nock('https://api.mymemory.translated.net')
        .get('/get')
        .query({ q: 'Hello World', langpair: 'en|de' })
        .reply(200, { invalid: 'response' });

      const translateModule = require('../../feedProcessor.js');
      const result = await translateModule.translateText('Hello World', 'en', 'de');
      
      expect(result).toBe('Hello World');
    });
  });

  describe('Image Generation', () => {
    const feedProcessor = require('../../feedProcessor.js');

    it('should use existing image URL when available', () => {
      const article = {
        imageUrl: 'https://example.com/image.jpg',
        originalTitle: 'Test Article'
      };

      const result = feedProcessor.generateImageUrl(article);
      
      expect(result).toEqual({
        url: 'https://example.com/image.jpg',
        generated: 0
      });
    });

    it('should generate Unsplash URL when no image exists', () => {
      const article = {
        originalTitle: 'Test Article About Technology',
        originalSummary: 'This is a test'
      };

      const result = feedProcessor.generateImageUrl(article);
      
      expect(result.url).toContain('https://source.unsplash.com/featured/');
      expect(result.url).toContain('Test,Article,About');
      expect(result.generated).toBe(1);
    });

    it('should handle empty title gracefully', () => {
      const article = {
        originalTitle: '',
        originalSummary: 'Test summary'
      };

      const result = feedProcessor.generateImageUrl(article);
      
      expect(result.url).toContain('https://source.unsplash.com/featured/');
      expect(result.generated).toBe(1);
    });

    it('should handle special characters in title', () => {
      const article = {
        originalTitle: 'Test & Article with "quotes" and symbols!',
        originalSummary: 'Test'
      };

      const result = feedProcessor.generateImageUrl(article);
      
      expect(result.url).toContain('https://source.unsplash.com/featured/');
      expect(result.generated).toBe(1);
    });

    it('should handle very long titles', () => {
      const article = {
        originalTitle: 'A'.repeat(1000),
        originalSummary: 'Test'
      };

      const result = feedProcessor.generateImageUrl(article);
      
      expect(result.url).toContain('https://source.unsplash.com/featured/');
      expect(result.generated).toBe(1);
    });
  });

  describe('Seriousness Evaluation', () => {
    const feedProcessor = require('../../feedProcessor.js');

    it('should rate very long articles as serious (score 9)', () => {
      const article = {
        originalTitle: 'A'.repeat(500),
        originalSummary: 'B'.repeat(400)
      };

      const result = feedProcessor.evaluateSeriousness(article);
      
      expect(result).toBe(9);
    });

    it('should rate long articles as serious (score 8)', () => {
      const article = {
        originalTitle: 'A'.repeat(300),
        originalSummary: 'B'.repeat(250)
      };

      const result = feedProcessor.evaluateSeriousness(article);
      
      expect(result).toBe(8);
    });

    it('should rate medium articles as moderately serious (score 7)', () => {
      const article = {
        originalTitle: 'A'.repeat(150),
        originalSummary: 'B'.repeat(150)
      };

      const result = feedProcessor.evaluateSeriousness(article);
      
      expect(result).toBe(7);
    });

    it('should rate short articles as less serious (score 5)', () => {
      const article = {
        originalTitle: 'Short',
        originalSummary: 'Brief'
      };

      const result = feedProcessor.evaluateSeriousness(article);
      
      expect(result).toBe(5);
    });

    it('should handle empty content', () => {
      const article = {
        originalTitle: '',
        originalSummary: ''
      };

      const result = feedProcessor.evaluateSeriousness(article);
      
      expect(result).toBe(5);
    });

    it('should handle null content', () => {
      const article = {
        originalTitle: null,
        originalSummary: null
      };

      const result = feedProcessor.evaluateSeriousness(article);
      
      expect(result).toBe(5);
    });

    it('should handle undefined content', () => {
      const article = {
        originalTitle: undefined,
        originalSummary: undefined
      };

      const result = feedProcessor.evaluateSeriousness(article);
      
      expect(result).toBe(5);
    });
  });

  describe('Feed Processing', () => {
    beforeEach(() => {
      mockDb.all.mockImplementation((query, callback) => {
        if (query.includes('feeds')) {
          callback(null, [
            {
              id: 'feed-1',
              name: 'Test Feed',
              url: 'https://example.com/feed.xml',
              language: 'en'
            }
          ]);
        } else if (query.includes('topics')) {
          callback(null, [
            {
              id: 'topic-1',
              name: 'Technology',
              keywords: '["tech", "software", "programming"]',
              excludeKeywords: '["spam", "ads"]'
            }
          ]);
        }
      });
    });

    it('should process feeds successfully', async () => {
      const mockFeedData = {
        items: [
          {
            title: 'Test Article',
            link: 'https://example.com/article1',
            contentSnippet: 'This is a test article about technology',
            pubDate: '2023-01-01T12:00:00Z',
            enclosure: {
              url: 'https://example.com/image.jpg',
              type: 'image/jpeg'
            }
          }
        ]
      };

      mockParser.parseURL.mockResolvedValue(mockFeedData);

      // Mock translation API
      nock('https://api.mymemory.translated.net')
        .get('/get')
        .query(true)
        .reply(200, {
          responseData: {
            translatedText: 'Translated text'
          }
        })
        .persist();

      await processAllFeeds();

      expect(mockParser.parseURL).toHaveBeenCalledWith('https://example.com/feed.xml');
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO articles'),
        expect.any(Array)
      );
    });

    it('should handle feed parsing errors gracefully', async () => {
      mockParser.parseURL.mockRejectedValue(new Error('Feed parse error'));

      await processAllFeeds();

      expect(mockParser.parseURL).toHaveBeenCalled();
      // Should not crash and should continue processing
    });

    it('should handle database errors gracefully', async () => {
      mockDb.all.mockImplementation((query, callback) => {
        callback(new Error('Database error'), null);
      });

      await processAllFeeds();

      // Should not crash
      expect(mockDb.all).toHaveBeenCalled();
    });

    it('should handle empty feed items', async () => {
      const mockFeedData = {
        items: []
      };

      mockParser.parseURL.mockResolvedValue(mockFeedData);

      await processAllFeeds();

      expect(mockParser.parseURL).toHaveBeenCalled();
      expect(mockDb.run).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO articles'),
        expect.any(Array)
      );
    });

    it('should handle missing feed data gracefully', async () => {
      const mockFeedData = {
        items: [
          {
            title: '',
            link: '',
            contentSnippet: '',
            pubDate: null
          }
        ]
      };

      mockParser.parseURL.mockResolvedValue(mockFeedData);

      await processAllFeeds();

      expect(mockParser.parseURL).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO articles'),
        expect.any(Array)
      );
    });

    it('should handle malformed feed data', async () => {
      const mockFeedData = {
        items: [
          {
            title: null,
            link: undefined,
            contentSnippet: 123,
            pubDate: 'invalid-date'
          }
        ]
      };

      mockParser.parseURL.mockResolvedValue(mockFeedData);

      await processAllFeeds();

      expect(mockParser.parseURL).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO articles'),
        expect.any(Array)
      );
    });
  });

  describe('Topic Matching', () => {
    beforeEach(() => {
      mockDb.all.mockImplementation((query, callback) => {
        if (query.includes('feeds')) {
          callback(null, [
            {
              id: 'feed-1',
              name: 'Test Feed',
              url: 'https://example.com/feed.xml',
              language: 'en'
            }
          ]);
        } else if (query.includes('topics')) {
          callback(null, [
            {
              id: 'topic-1',
              name: 'Technology',
              keywords: '["tech", "software", "programming"]',
              excludeKeywords: '["spam", "ads"]'
            },
            {
              id: 'topic-2',
              name: 'Sports',
              keywords: '["football", "soccer", "basketball"]',
              excludeKeywords: '["betting"]'
            }
          ]);
        }
      });
    });

    it('should match articles to topics based on keywords', async () => {
      const mockFeedData = {
        items: [
          {
            title: 'New Software Release',
            link: 'https://example.com/article1',
            contentSnippet: 'This programming tool is amazing',
            pubDate: '2023-01-01T12:00:00Z'
          }
        ]
      };

      mockParser.parseURL.mockResolvedValue(mockFeedData);

      // Mock translation API
      nock('https://api.mymemory.translated.net')
        .get('/get')
        .query(true)
        .reply(200, {
          responseData: {
            translatedText: 'Translated text'
          }
        })
        .persist();

      await processAllFeeds();

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO articles'),
        expect.arrayContaining([
          expect.any(String), // id
          expect.any(String), // link
          expect.any(String), // originalTitle
          expect.any(String), // originalSummary
          expect.any(String), // translatedTitle
          expect.any(String), // translatedSummary
          expect.any(String), // sourceFeedName
          expect.any(String), // publicationDate
          expect.any(String), // processedDate
          '["Technology"]', // topics - should match Technology
          expect.any(Number), // seriousnessScore
          expect.any(String), // imageUrl
          expect.any(Number), // imageGenerated
          expect.any(Number)  // aiEnhanced
        ])
      );
    });

    it('should exclude articles with exclude keywords', async () => {
      const mockFeedData = {
        items: [
          {
            title: 'Football betting software',
            link: 'https://example.com/article1',
            contentSnippet: 'This is about football betting and programming',
            pubDate: '2023-01-01T12:00:00Z'
          }
        ]
      };

      mockParser.parseURL.mockResolvedValue(mockFeedData);

      // Mock translation API
      nock('https://api.mymemory.translated.net')
        .get('/get')
        .query(true)
        .reply(200, {
          responseData: {
            translatedText: 'Translated text'
          }
        })
        .persist();

      await processAllFeeds();

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO articles'),
        expect.arrayContaining([
          expect.any(String), // id
          expect.any(String), // link
          expect.any(String), // originalTitle
          expect.any(String), // originalSummary
          expect.any(String), // translatedTitle
          expect.any(String), // translatedSummary
          expect.any(String), // sourceFeedName
          expect.any(String), // publicationDate
          expect.any(String), // processedDate
          '["Technology"]', // topics - should only match Technology (Sports excluded due to "betting")
          expect.any(Number), // seriousnessScore
          expect.any(String), // imageUrl
          expect.any(Number), // imageGenerated
          expect.any(Number)  // aiEnhanced
        ])
      );
    });

    it('should handle malformed topic keywords', async () => {
      mockDb.all.mockImplementation((query, callback) => {
        if (query.includes('feeds')) {
          callback(null, [
            {
              id: 'feed-1',
              name: 'Test Feed',
              url: 'https://example.com/feed.xml',
              language: 'en'
            }
          ]);
        } else if (query.includes('topics')) {
          callback(null, [
            {
              id: 'topic-1',
              name: 'Technology',
              keywords: 'invalid-json',
              excludeKeywords: null
            }
          ]);
        }
      });

      const mockFeedData = {
        items: [
          {
            title: 'Test Article',
            link: 'https://example.com/article1',
            contentSnippet: 'This is a test article',
            pubDate: '2023-01-01T12:00:00Z'
          }
        ]
      };

      mockParser.parseURL.mockResolvedValue(mockFeedData);

      await processAllFeeds();

      // Should not crash even with malformed JSON
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('Network and Error Handling', () => {
    it('should handle network timeouts', async () => {
      mockParser.parseURL.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        });
      });

      await processAllFeeds();

      expect(mockParser.parseURL).toHaveBeenCalled();
      // Should not crash
    });

    it('should handle invalid XML/RSS data', async () => {
      mockParser.parseURL.mockRejectedValue(new Error('Invalid XML'));

      await processAllFeeds();

      expect(mockParser.parseURL).toHaveBeenCalled();
      // Should not crash
    });

    it('should handle translation service outages', async () => {
      const mockFeedData = {
        items: [
          {
            title: 'Test Article',
            link: 'https://example.com/article1',
            contentSnippet: 'This is a test article',
            pubDate: '2023-01-01T12:00:00Z'
          }
        ]
      };

      mockParser.parseURL.mockResolvedValue(mockFeedData);

      // Mock translation API failure
      nock('https://api.mymemory.translated.net')
        .get('/get')
        .query(true)
        .reply(500, 'Service unavailable')
        .persist();

      await processAllFeeds();

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO articles'),
        expect.any(Array)
      );
    });

    it('should handle concurrent feed processing', async () => {
      mockDb.all.mockImplementation((query, callback) => {
        if (query.includes('feeds')) {
          callback(null, [
            { id: 'feed-1', name: 'Feed 1', url: 'https://example.com/feed1.xml', language: 'en' },
            { id: 'feed-2', name: 'Feed 2', url: 'https://example.com/feed2.xml', language: 'en' },
            { id: 'feed-3', name: 'Feed 3', url: 'https://example.com/feed3.xml', language: 'en' }
          ]);
        } else if (query.includes('topics')) {
          callback(null, []);
        }
      });

      const mockFeedData = {
        items: [
          {
            title: 'Test Article',
            link: 'https://example.com/article1',
            contentSnippet: 'This is a test article',
            pubDate: '2023-01-01T12:00:00Z'
          }
        ]
      };

      mockParser.parseURL.mockResolvedValue(mockFeedData);

      await processAllFeeds();

      expect(mockParser.parseURL).toHaveBeenCalledTimes(3);
      expect(mockDb.run).toHaveBeenCalledTimes(3);
    });
  });
});