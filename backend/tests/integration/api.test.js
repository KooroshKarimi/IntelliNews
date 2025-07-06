const request = require('supertest');
const { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } = require('@jest/globals');
const path = require('path');
const fs = require('fs');

// Import after setting up test environment
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(__dirname, 'test-api.db');

// Mock the feedProcessor
jest.mock('../../feedProcessor.js', () => ({
  processAllFeeds: jest.fn().mockResolvedValue()
}));

describe('API Integration Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(process.env.DB_PATH)) {
      fs.unlinkSync(process.env.DB_PATH);
    }
    
    // Import the app after setting up environment
    app = require('../../server.js');
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    // Clean up test database
    if (fs.existsSync(process.env.DB_PATH)) {
      fs.unlinkSync(process.env.DB_PATH);
    }
  });

  beforeEach(async () => {
    // Clear database before each test
    const { db } = require('../../db.js');
    await new Promise((resolve) => {
      db.serialize(() => {
        db.run('DELETE FROM feeds');
        db.run('DELETE FROM topics');
        db.run('DELETE FROM articles');
        resolve();
      });
    });
  });

  describe('Health Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        version: '0.6',
        aiProvider: 'mock'
      });
    });

    it('should return valid timestamp', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('Feeds API', () => {
    describe('GET /api/feeds', () => {
      it('should return empty array when no feeds exist', async () => {
        const response = await request(app)
          .get('/api/feeds')
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it('should return all feeds', async () => {
        // Insert test feed
        const { db } = require('../../db.js');
        await new Promise((resolve) => {
          db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
            ['test-feed', 'Test Feed', 'https://example.com/feed.xml', 'en'], 
            resolve);
        });

        const response = await request(app)
          .get('/api/feeds')
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toEqual({
          id: 'test-feed',
          name: 'Test Feed',
          url: 'https://example.com/feed.xml',
          language: 'en'
        });
      });
    });

    describe('POST /api/feeds', () => {
      it('should create a new feed', async () => {
        const feedData = {
          name: 'New Feed',
          url: 'https://example.com/new-feed.xml',
          language: 'de'
        };

        const response = await request(app)
          .post('/api/feeds')
          .send(feedData)
          .expect(200);

        expect(response.body).toEqual({
          id: expect.any(String),
          name: 'New Feed',
          url: 'https://example.com/new-feed.xml',
          language: 'de'
        });
      });

      it('should default language to "de" when not specified', async () => {
        const feedData = {
          name: 'New Feed',
          url: 'https://example.com/new-feed.xml'
        };

        const response = await request(app)
          .post('/api/feeds')
          .send(feedData)
          .expect(200);

        expect(response.body.language).toBe('de');
      });

      it('should handle empty request body', async () => {
        const response = await request(app)
          .post('/api/feeds')
          .send({})
          .expect(200);

        expect(response.body).toEqual({
          id: expect.any(String),
          name: undefined,
          url: undefined,
          language: 'de'
        });
      });

      it('should handle special characters in feed data', async () => {
        const feedData = {
          name: 'Feed with "quotes" and émojis 🚀',
          url: 'https://example.com/feed?param=value&other=test',
          language: 'en'
        };

        const response = await request(app)
          .post('/api/feeds')
          .send(feedData)
          .expect(200);

        expect(response.body.name).toBe(feedData.name);
        expect(response.body.url).toBe(feedData.url);
      });
    });

    describe('DELETE /api/feeds/:id', () => {
      it('should delete an existing feed', async () => {
        // Insert test feed
        const { db } = require('../../db.js');
        await new Promise((resolve) => {
          db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
            ['test-feed', 'Test Feed', 'https://example.com/feed.xml', 'en'], 
            resolve);
        });

        const response = await request(app)
          .delete('/api/feeds/test-feed')
          .expect(200);

        expect(response.body).toEqual({ status: 'deleted' });

        // Verify feed is deleted
        const getResponse = await request(app)
          .get('/api/feeds')
          .expect(200);

        expect(getResponse.body).toHaveLength(0);
      });

      it('should handle deletion of non-existent feed', async () => {
        const response = await request(app)
          .delete('/api/feeds/non-existent')
          .expect(200);

        expect(response.body).toEqual({ status: 'deleted' });
      });
    });
  });

  describe('Topics API', () => {
    describe('GET /api/topics', () => {
      it('should return empty array when no topics exist', async () => {
        const response = await request(app)
          .get('/api/topics')
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it('should return all topics', async () => {
        // Insert test topic
        const { db } = require('../../db.js');
        await new Promise((resolve) => {
          db.run('INSERT INTO topics(id,name,keywords,excludeKeywords) VALUES(?,?,?,?)', 
            ['test-topic', 'Technology', '["tech", "software"]', '["spam"]'], 
            resolve);
        });

        const response = await request(app)
          .get('/api/topics')
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toEqual({
          id: 'test-topic',
          name: 'Technology',
          keywords: '["tech", "software"]',
          excludeKeywords: '["spam"]'
        });
      });
    });

    describe('POST /api/topics', () => {
      it('should create a new topic', async () => {
        const topicData = {
          name: 'Sports',
          keywords: ['football', 'soccer', 'basketball'],
          excludeKeywords: ['betting']
        };

        const response = await request(app)
          .post('/api/topics')
          .send(topicData)
          .expect(200);

        expect(response.body).toEqual({
          id: expect.any(String),
          name: 'Sports',
          keywords: ['football', 'soccer', 'basketball'],
          excludeKeywords: ['betting']
        });
      });

      it('should handle empty keywords arrays', async () => {
        const topicData = {
          name: 'Empty Topic',
          keywords: [],
          excludeKeywords: []
        };

        const response = await request(app)
          .post('/api/topics')
          .send(topicData)
          .expect(200);

        expect(response.body.keywords).toEqual([]);
        expect(response.body.excludeKeywords).toEqual([]);
      });

      it('should default to empty arrays when keywords not provided', async () => {
        const topicData = {
          name: 'Default Topic'
        };

        const response = await request(app)
          .post('/api/topics')
          .send(topicData)
          .expect(200);

        expect(response.body.keywords).toEqual([]);
        expect(response.body.excludeKeywords).toEqual([]);
      });
    });

    describe('DELETE /api/topics/:id', () => {
      it('should delete an existing topic', async () => {
        // Insert test topic
        const { db } = require('../../db.js');
        await new Promise((resolve) => {
          db.run('INSERT INTO topics(id,name,keywords,excludeKeywords) VALUES(?,?,?,?)', 
            ['test-topic', 'Technology', '["tech"]', '["spam"]'], 
            resolve);
        });

        const response = await request(app)
          .delete('/api/topics/test-topic')
          .expect(200);

        expect(response.body).toEqual({ status: 'deleted' });

        // Verify topic is deleted
        const getResponse = await request(app)
          .get('/api/topics')
          .expect(200);

        expect(getResponse.body).toHaveLength(0);
      });
    });
  });

  describe('Articles API', () => {
    beforeEach(async () => {
      // Insert test article
      const { db } = require('../../db.js');
      await new Promise((resolve) => {
        db.run(`INSERT INTO articles(
          id, link, originalTitle, originalSummary, translatedTitle, translatedSummary,
          sourceFeedName, publicationDate, processedDate, topics, seriousnessScore,
          imageUrl, imageGenerated, aiEnhanced
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
          'test-article',
          'https://example.com/article1',
          'Test Article',
          'This is a test article',
          'Test Artikel',
          'Dies ist ein Test Artikel',
          'Test Feed',
          '2023-01-01T12:00:00Z',
          '2023-01-01T12:30:00Z',
          '["Technology"]',
          7,
          'https://example.com/image.jpg',
          0,
          1
        ], resolve);
      });
    });

    describe('GET /api/articles', () => {
      it('should return all articles', async () => {
        const response = await request(app)
          .get('/api/articles')
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toEqual({
          id: 'test-article',
          link: 'https://example.com/article1',
          originalTitle: 'Test Article',
          originalSummary: 'This is a test article',
          translatedTitle: 'Test Artikel',
          translatedSummary: 'Dies ist ein Test Artikel',
          sourceFeedName: 'Test Feed',
          publicationDate: '2023-01-01T12:00:00Z',
          processedDate: '2023-01-01T12:30:00Z',
          topics: ['Technology'],
          seriousnessScore: 7,
          imageUrl: 'https://example.com/image.jpg',
          imageGenerated: 0,
          aiEnhanced: 1
        });
      });

      it('should filter articles by topic', async () => {
        // Insert another article without the topic
        const { db } = require('../../db.js');
        await new Promise((resolve) => {
          db.run(`INSERT INTO articles(
            id, link, originalTitle, originalSummary, translatedTitle, translatedSummary,
            sourceFeedName, publicationDate, processedDate, topics, seriousnessScore,
            imageUrl, imageGenerated, aiEnhanced
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
            'test-article-2',
            'https://example.com/article2',
            'Sports Article',
            'This is about sports',
            'Sport Artikel',
            'Dies ist über Sport',
            'Test Feed',
            '2023-01-01T12:00:00Z',
            '2023-01-01T12:30:00Z',
            '["Sports"]',
            6,
            'https://example.com/image2.jpg',
            0,
            1
          ], resolve);
        });

        const response = await request(app)
          .get('/api/articles?topic=Technology')
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].topics).toContain('Technology');
      });

      it('should limit results based on limit parameter', async () => {
        const response = await request(app)
          .get('/api/articles?limit=1')
          .expect(200);

        expect(response.body).toHaveLength(1);
      });

      it('should handle large limit values', async () => {
        const response = await request(app)
          .get('/api/articles?limit=1000')
          .expect(200);

        expect(response.body).toHaveLength(1);
      });

      it('should handle invalid limit values', async () => {
        const response = await request(app)
          .get('/api/articles?limit=invalid')
          .expect(200);

        expect(response.body).toHaveLength(1);
      });

      it('should handle non-existent topics', async () => {
        const response = await request(app)
          .get('/api/articles?topic=NonExistent')
          .expect(200);

        expect(response.body).toHaveLength(0);
      });
    });
  });

  describe('Configuration API', () => {
    describe('GET /api/config', () => {
      it('should return empty configuration', async () => {
        const response = await request(app)
          .get('/api/config')
          .expect(200);

        expect(response.body).toEqual({
          feeds: [],
          topics: []
        });
      });

      it('should return feeds and topics', async () => {
        // Insert test data
        const { db } = require('../../db.js');
        await new Promise((resolve) => {
          db.serialize(() => {
            db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
              ['feed-1', 'Feed 1', 'https://example.com/feed1.xml', 'en']);
            db.run('INSERT INTO topics(id,name,keywords,excludeKeywords) VALUES(?,?,?,?)', 
              ['topic-1', 'Topic 1', '["keyword1"]', '["exclude1"]'], resolve);
          });
        });

        const response = await request(app)
          .get('/api/config')
          .expect(200);

        expect(response.body.feeds).toHaveLength(1);
        expect(response.body.topics).toHaveLength(1);
        expect(response.body.feeds[0].name).toBe('Feed 1');
        expect(response.body.topics[0].name).toBe('Topic 1');
      });
    });

    describe('POST /api/config', () => {
      it('should save configuration', async () => {
        const configData = {
          feeds: [
            {
              id: 'feed-1',
              name: 'Feed 1',
              url: 'https://example.com/feed1.xml',
              language: 'en'
            }
          ],
          topics: [
            {
              id: 'topic-1',
              name: 'Topic 1',
              keywords: ['keyword1'],
              excludeKeywords: ['exclude1']
            }
          ]
        };

        const response = await request(app)
          .post('/api/config')
          .send(configData)
          .expect(200);

        expect(response.body).toEqual({ status: 'saved' });

        // Verify configuration was saved
        const getResponse = await request(app)
          .get('/api/config')
          .expect(200);

        expect(getResponse.body.feeds).toHaveLength(1);
        expect(getResponse.body.topics).toHaveLength(1);
      });

      it('should handle empty configuration', async () => {
        const response = await request(app)
          .post('/api/config')
          .send({})
          .expect(200);

        expect(response.body).toEqual({ status: 'saved' });
      });

      it('should generate UUIDs for items without IDs', async () => {
        const configData = {
          feeds: [
            {
              name: 'Feed without ID',
              url: 'https://example.com/feed.xml'
            }
          ],
          topics: [
            {
              name: 'Topic without ID',
              keywords: ['keyword']
            }
          ]
        };

        const response = await request(app)
          .post('/api/config')
          .send(configData)
          .expect(200);

        expect(response.body).toEqual({ status: 'saved' });

        // Verify UUIDs were generated
        const getResponse = await request(app)
          .get('/api/config')
          .expect(200);

        expect(getResponse.body.feeds[0].id).toBeDefined();
        expect(getResponse.body.topics[0].id).toBeDefined();
      });

      it('should replace existing configuration', async () => {
        // Insert initial data
        const { db } = require('../../db.js');
        await new Promise((resolve) => {
          db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
            ['old-feed', 'Old Feed', 'https://example.com/old.xml', 'en'], resolve);
        });

        const newConfigData = {
          feeds: [
            {
              id: 'new-feed',
              name: 'New Feed',
              url: 'https://example.com/new.xml',
              language: 'de'
            }
          ],
          topics: []
        };

        const response = await request(app)
          .post('/api/config')
          .send(newConfigData)
          .expect(200);

        expect(response.body).toEqual({ status: 'saved' });

        // Verify old configuration was replaced
        const getResponse = await request(app)
          .get('/api/config')
          .expect(200);

        expect(getResponse.body.feeds).toHaveLength(1);
        expect(getResponse.body.feeds[0].name).toBe('New Feed');
      });
    });
  });

  describe('Feed Processing API', () => {
    describe('POST /api/parse', () => {
      it('should trigger feed processing', async () => {
        const response = await request(app)
          .post('/api/parse')
          .expect(200);

        expect(response.body).toEqual({ status: 'started' });
      });

      it('should handle processing errors gracefully', async () => {
        // Mock processAllFeeds to throw an error
        const { processAllFeeds } = require('../../feedProcessor.js');
        processAllFeeds.mockRejectedValueOnce(new Error('Processing error'));

        const response = await request(app)
          .post('/api/parse')
          .expect(200);

        expect(response.body).toEqual({ status: 'started' });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/feeds')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('should handle non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });

    it('should handle invalid HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/feeds')
        .expect(404);
    });
  });

  describe('CORS and Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/health')
        .expect(204);
    });
  });

  describe('Performance and Load', () => {
    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () => 
        request(app).get('/api/health').expect(200)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('ok');
      });
    });

    it('should handle large payloads', async () => {
      const largeFeedData = {
        name: 'A'.repeat(1000),
        url: 'https://example.com/feed.xml',
        language: 'en'
      };

      const response = await request(app)
        .post('/api/feeds')
        .send(largeFeedData)
        .expect(200);

      expect(response.body.name).toBe(largeFeedData.name);
    });
  });
});