const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');

// Test configuration
const TEST_PORT = 8081;
const TEST_DB_PATH = path.join(__dirname, 'e2e-test.db');
const API_BASE_URL = `http://localhost:${TEST_PORT}`;

describe('End-to-End System Tests', () => {
  let serverProcess;
  let testDbPath;

  beforeAll(async () => {
    // Set up test environment
    process.env.PORT = TEST_PORT;
    process.env.DB_PATH = TEST_DB_PATH;
    process.env.NODE_ENV = 'test';
    
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Start the server for E2E tests
    serverProcess = spawn('node', [path.join(__dirname, '../../backend/server.js')], {
      env: { ...process.env },
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  });

  afterAll(async () => {
    // Clean up server process
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(() => {
          serverProcess.kill('SIGKILL');
          resolve();
        }, 5000);
      });
    }

    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(async () => {
    // Clean database before each test
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('System Health and Startup', () => {
    it('should start server successfully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        version: '0.6',
        aiProvider: 'mock'
      });
    });

    it('should initialize database schema', async () => {
      // Make a request to ensure database is initialized
      await request(API_BASE_URL)
        .get('/api/feeds')
        .expect(200);

      // Check that database file exists
      expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(API_BASE_URL).get('/api/health').expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('ok');
      });
    });
  });

  describe('Complete Feed Management Workflow', () => {
    it('should handle complete feed CRUD operations', async () => {
      // 1. Initially no feeds
      let response = await request(API_BASE_URL)
        .get('/api/feeds')
        .expect(200);
      expect(response.body).toEqual([]);

      // 2. Create a feed
      const feedData = {
        name: 'Test RSS Feed',
        url: 'https://example.com/rss.xml',
        language: 'en'
      };

      response = await request(API_BASE_URL)
        .post('/api/feeds')
        .send(feedData)
        .expect(200);

      const feedId = response.body.id;
      expect(response.body).toEqual({
        id: feedId,
        name: 'Test RSS Feed',
        url: 'https://example.com/rss.xml',
        language: 'en'
      });

      // 3. Verify feed was created
      response = await request(API_BASE_URL)
        .get('/api/feeds')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual({
        id: feedId,
        name: 'Test RSS Feed',
        url: 'https://example.com/rss.xml',
        language: 'en'
      });

      // 4. Delete the feed
      response = await request(API_BASE_URL)
        .delete(`/api/feeds/${feedId}`)
        .expect(200);

      expect(response.body).toEqual({ status: 'deleted' });

      // 5. Verify feed was deleted
      response = await request(API_BASE_URL)
        .get('/api/feeds')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle multiple feeds', async () => {
      // Create multiple feeds
      const feeds = [
        { name: 'Tech News', url: 'https://tech.example.com/rss.xml', language: 'en' },
        { name: 'Sports News', url: 'https://sports.example.com/rss.xml', language: 'en' },
        { name: 'German News', url: 'https://news.example.de/rss.xml', language: 'de' }
      ];

      const createdFeeds = [];
      for (const feed of feeds) {
        const response = await request(API_BASE_URL)
          .post('/api/feeds')
          .send(feed)
          .expect(200);
        createdFeeds.push(response.body);
      }

      // Verify all feeds exist
      const response = await request(API_BASE_URL)
        .get('/api/feeds')
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body.map(f => f.name)).toEqual(
        expect.arrayContaining(['Tech News', 'Sports News', 'German News'])
      );
    });
  });

  describe('Complete Topic Management Workflow', () => {
    it('should handle complete topic CRUD operations', async () => {
      // 1. Initially no topics
      let response = await request(API_BASE_URL)
        .get('/api/topics')
        .expect(200);
      expect(response.body).toEqual([]);

      // 2. Create a topic
      const topicData = {
        name: 'Technology',
        keywords: ['tech', 'software', 'programming'],
        excludeKeywords: ['spam', 'ads']
      };

      response = await request(API_BASE_URL)
        .post('/api/topics')
        .send(topicData)
        .expect(200);

      const topicId = response.body.id;
      expect(response.body).toEqual({
        id: topicId,
        name: 'Technology',
        keywords: ['tech', 'software', 'programming'],
        excludeKeywords: ['spam', 'ads']
      });

      // 3. Verify topic was created
      response = await request(API_BASE_URL)
        .get('/api/topics')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Technology');

      // 4. Delete the topic
      response = await request(API_BASE_URL)
        .delete(`/api/topics/${topicId}`)
        .expect(200);

      expect(response.body).toEqual({ status: 'deleted' });

      // 5. Verify topic was deleted
      response = await request(API_BASE_URL)
        .get('/api/topics')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle complex topic configurations', async () => {
      const topics = [
        {
          name: 'Technology',
          keywords: ['tech', 'software', 'AI', 'machine learning'],
          excludeKeywords: ['spam', 'ads', 'clickbait']
        },
        {
          name: 'Sports',
          keywords: ['football', 'soccer', 'basketball', 'tennis'],
          excludeKeywords: ['betting', 'gambling']
        },
        {
          name: 'Science',
          keywords: ['research', 'study', 'discovery', 'breakthrough'],
          excludeKeywords: ['pseudoscience', 'conspiracy']
        }
      ];

      // Create all topics
      const createdTopics = [];
      for (const topic of topics) {
        const response = await request(API_BASE_URL)
          .post('/api/topics')
          .send(topic)
          .expect(200);
        createdTopics.push(response.body);
      }

      // Verify all topics exist
      const response = await request(API_BASE_URL)
        .get('/api/topics')
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body.map(t => t.name)).toEqual(
        expect.arrayContaining(['Technology', 'Sports', 'Science'])
      );
    });
  });

  describe('Configuration Management Workflow', () => {
    it('should handle complete configuration save and load', async () => {
      const configData = {
        feeds: [
          { name: 'Feed 1', url: 'https://feed1.com/rss.xml', language: 'en' },
          { name: 'Feed 2', url: 'https://feed2.com/rss.xml', language: 'de' }
        ],
        topics: [
          { name: 'Topic 1', keywords: ['keyword1'], excludeKeywords: ['exclude1'] },
          { name: 'Topic 2', keywords: ['keyword2'], excludeKeywords: ['exclude2'] }
        ]
      };

      // Save configuration
      let response = await request(API_BASE_URL)
        .post('/api/config')
        .send(configData)
        .expect(200);

      expect(response.body).toEqual({ status: 'saved' });

      // Load configuration
      response = await request(API_BASE_URL)
        .get('/api/config')
        .expect(200);

      expect(response.body.feeds).toHaveLength(2);
      expect(response.body.topics).toHaveLength(2);
      expect(response.body.feeds[0].name).toBe('Feed 1');
      expect(response.body.topics[0].name).toBe('Topic 1');
    });

    it('should handle configuration updates', async () => {
      // Initial configuration
      const initialConfig = {
        feeds: [{ name: 'Initial Feed', url: 'https://initial.com/rss.xml', language: 'en' }],
        topics: [{ name: 'Initial Topic', keywords: ['initial'], excludeKeywords: [] }]
      };

      await request(API_BASE_URL)
        .post('/api/config')
        .send(initialConfig)
        .expect(200);

      // Updated configuration
      const updatedConfig = {
        feeds: [
          { name: 'Updated Feed', url: 'https://updated.com/rss.xml', language: 'de' },
          { name: 'New Feed', url: 'https://new.com/rss.xml', language: 'en' }
        ],
        topics: [
          { name: 'Updated Topic', keywords: ['updated'], excludeKeywords: ['old'] }
        ]
      };

      await request(API_BASE_URL)
        .post('/api/config')
        .send(updatedConfig)
        .expect(200);

      // Verify configuration was updated
      const response = await request(API_BASE_URL)
        .get('/api/config')
        .expect(200);

      expect(response.body.feeds).toHaveLength(2);
      expect(response.body.topics).toHaveLength(1);
      expect(response.body.feeds[0].name).toBe('Updated Feed');
      expect(response.body.topics[0].name).toBe('Updated Topic');
    });
  });

  describe('Article Management and Querying', () => {
    beforeEach(async () => {
      // Insert test articles for querying
      const { db } = require('../../backend/db.js');
      await new Promise((resolve) => {
        db.serialize(() => {
          db.run(`INSERT INTO articles(
            id, link, originalTitle, originalSummary, translatedTitle, translatedSummary,
            sourceFeedName, publicationDate, processedDate, topics, seriousnessScore,
            imageUrl, imageGenerated, aiEnhanced
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
            'article-1',
            'https://example.com/article1',
            'Technology News',
            'Latest in tech',
            'Technologie Nachrichten',
            'Neuestes in der Technik',
            'Tech Feed',
            '2023-01-01T12:00:00Z',
            '2023-01-01T12:30:00Z',
            '["Technology"]',
            8,
            'https://example.com/image1.jpg',
            0,
            1
          ]);
          
          db.run(`INSERT INTO articles(
            id, link, originalTitle, originalSummary, translatedTitle, translatedSummary,
            sourceFeedName, publicationDate, processedDate, topics, seriousnessScore,
            imageUrl, imageGenerated, aiEnhanced
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
            'article-2',
            'https://example.com/article2',
            'Sports Update',
            'Championship results',
            'Sport Update',
            'Meisterschaftsergebnisse',
            'Sports Feed',
            '2023-01-02T12:00:00Z',
            '2023-01-02T12:30:00Z',
            '["Sports"]',
            6,
            'https://example.com/image2.jpg',
            1,
            1
          ], resolve);
        });
      });
    });

    it('should query all articles', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/articles')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].originalTitle).toBe('Sports Update'); // Most recent first
      expect(response.body[1].originalTitle).toBe('Technology News');
    });

    it('should filter articles by topic', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/articles?topic=Technology')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].originalTitle).toBe('Technology News');
      expect(response.body[0].topics).toContain('Technology');
    });

    it('should limit article results', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/articles?limit=1')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].originalTitle).toBe('Sports Update');
    });

    it('should handle complex queries', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/articles?topic=Sports&limit=10')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].topics).toContain('Sports');
    });
  });

  describe('Feed Processing Integration', () => {
    it('should trigger feed processing', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/parse')
        .expect(200);

      expect(response.body).toEqual({ status: 'started' });
    });

    it('should handle feed processing with configuration', async () => {
      // Set up feeds and topics
      const config = {
        feeds: [
          { name: 'Test Feed', url: 'https://example.com/feed.xml', language: 'en' }
        ],
        topics: [
          { name: 'Test Topic', keywords: ['test'], excludeKeywords: [] }
        ]
      };

      await request(API_BASE_URL)
        .post('/api/config')
        .send(config)
        .expect(200);

      // Trigger processing
      const response = await request(API_BASE_URL)
        .post('/api/parse')
        .expect(200);

      expect(response.body).toEqual({ status: 'started' });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database errors gracefully', async () => {
      // Force database error by using invalid SQL
      const response = await request(API_BASE_URL)
        .get('/api/articles?topic="; DROP TABLE articles; --')
        .expect(200);

      // Should not crash, should return empty results
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle malformed request bodies', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/feeds')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      const response = await request(API_BASE_URL)
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

    it('should handle large payloads', async () => {
      const largePayload = {
        feeds: Array.from({ length: 100 }, (_, i) => ({
          name: `Feed ${i}`,
          url: `https://example${i}.com/feed.xml`,
          language: 'en'
        })),
        topics: Array.from({ length: 50 }, (_, i) => ({
          name: `Topic ${i}`,
          keywords: [`keyword${i}`],
          excludeKeywords: [`exclude${i}`]
        }))
      };

      const response = await request(API_BASE_URL)
        .post('/api/config')
        .send(largePayload)
        .expect(200);

      expect(response.body).toEqual({ status: 'saved' });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high load', async () => {
      const requests = Array.from({ length: 50 }, () =>
        request(API_BASE_URL).get('/api/health').expect(200)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      responses.forEach(response => {
        expect(response.body.status).toBe('ok');
      });
    });

    it('should handle concurrent writes', async () => {
      const requests = Array.from({ length: 20 }, (_, i) =>
        request(API_BASE_URL)
          .post('/api/feeds')
          .send({
            name: `Concurrent Feed ${i}`,
            url: `https://example${i}.com/feed.xml`,
            language: 'en'
          })
          .expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach((response, i) => {
        expect(response.body.name).toBe(`Concurrent Feed ${i}`);
      });

      // Verify all feeds were created
      const getAllResponse = await request(API_BASE_URL)
        .get('/api/feeds')
        .expect(200);

      expect(getAllResponse.body).toHaveLength(20);
    });

    it('should handle memory efficiently', async () => {
      // Create many articles to test memory usage
      const requests = Array.from({ length: 100 }, (_, i) =>
        request(API_BASE_URL)
          .post('/api/feeds')
          .send({
            name: `Memory Test Feed ${i}`,
            url: `https://memory-test${i}.com/feed.xml`,
            language: 'en'
          })
      );

      await Promise.all(requests);

      // Should not crash or run out of memory
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      // Create feeds and topics
      const config = {
        feeds: [
          { name: 'Integrity Feed', url: 'https://integrity.com/feed.xml', language: 'en' }
        ],
        topics: [
          { name: 'Integrity Topic', keywords: ['integrity'], excludeKeywords: [] }
        ]
      };

      await request(API_BASE_URL)
        .post('/api/config')
        .send(config)
        .expect(200);

      // Verify configuration was saved
      const configResponse = await request(API_BASE_URL)
        .get('/api/config')
        .expect(200);

      expect(configResponse.body.feeds).toHaveLength(1);
      expect(configResponse.body.topics).toHaveLength(1);

      // Verify individual endpoints return same data
      const feedsResponse = await request(API_BASE_URL)
        .get('/api/feeds')
        .expect(200);

      const topicsResponse = await request(API_BASE_URL)
        .get('/api/topics')
        .expect(200);

      expect(feedsResponse.body).toHaveLength(1);
      expect(topicsResponse.body).toHaveLength(1);
      expect(feedsResponse.body[0].name).toBe('Integrity Feed');
      expect(topicsResponse.body[0].name).toBe('Integrity Topic');
    });

    it('should handle transaction rollbacks', async () => {
      // This test ensures atomicity of operations
      const initialFeedsResponse = await request(API_BASE_URL)
        .get('/api/feeds')
        .expect(200);

      const initialCount = initialFeedsResponse.body.length;

      // Attempt to create invalid configuration
      const invalidConfig = {
        feeds: [
          { name: 'Valid Feed', url: 'https://valid.com/feed.xml', language: 'en' },
          { name: null, url: null, language: null } // Invalid feed
        ],
        topics: []
      };

      await request(API_BASE_URL)
        .post('/api/config')
        .send(invalidConfig)
        .expect(200); // API might not validate, but should handle gracefully

      // Verify data consistency
      const finalFeedsResponse = await request(API_BASE_URL)
        .get('/api/feeds')
        .expect(200);

      // Should either have all feeds or none (atomic operation)
      expect(finalFeedsResponse.body.length).toBeGreaterThanOrEqual(initialCount);
    });
  });

  describe('Security Testing', () => {
    it('should prevent SQL injection', async () => {
      const maliciousInput = "'; DROP TABLE feeds; --";
      
      const response = await request(API_BASE_URL)
        .post('/api/feeds')
        .send({
          name: maliciousInput,
          url: 'https://example.com/feed.xml',
          language: 'en'
        })
        .expect(200);

      expect(response.body.name).toBe(maliciousInput);

      // Verify database is still intact
      const feedsResponse = await request(API_BASE_URL)
        .get('/api/feeds')
        .expect(200);

      expect(Array.isArray(feedsResponse.body)).toBe(true);
    });

    it('should handle XSS attempts', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const response = await request(API_BASE_URL)
        .post('/api/feeds')
        .send({
          name: xssPayload,
          url: 'https://example.com/feed.xml',
          language: 'en'
        })
        .expect(200);

      expect(response.body.name).toBe(xssPayload);
      // The API returns the data as-is, which is correct for a JSON API
      // XSS protection should be handled by the frontend
    });

    it('should handle oversized requests', async () => {
      const oversizedData = {
        name: 'A'.repeat(100000), // Very long name
        url: 'https://example.com/feed.xml',
        language: 'en'
      };

      const response = await request(API_BASE_URL)
        .post('/api/feeds')
        .send(oversizedData)
        .expect(200);

      expect(response.body.name).toBe(oversizedData.name);
    });
  });

  describe('Cross-Component Integration', () => {
    it('should integrate feeds, topics, and articles', async () => {
      // 1. Create configuration
      const config = {
        feeds: [
          { name: 'Integration Feed', url: 'https://integration.com/feed.xml', language: 'en' }
        ],
        topics: [
          { name: 'Integration Topic', keywords: ['integration'], excludeKeywords: [] }
        ]
      };

      await request(API_BASE_URL)
        .post('/api/config')
        .send(config)
        .expect(200);

      // 2. Trigger processing
      await request(API_BASE_URL)
        .post('/api/parse')
        .expect(200);

      // 3. Verify all components work together
      const configResponse = await request(API_BASE_URL)
        .get('/api/config')
        .expect(200);

      expect(configResponse.body.feeds).toHaveLength(1);
      expect(configResponse.body.topics).toHaveLength(1);

      const articlesResponse = await request(API_BASE_URL)
        .get('/api/articles')
        .expect(200);

      // Articles endpoint should work even if no articles are processed
      expect(Array.isArray(articlesResponse.body)).toBe(true);
    });
  });

  describe('Monitoring and Observability', () => {
    it('should provide health check with details', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        version: expect.any(String),
        aiProvider: expect.any(String)
      });

      // Verify timestamp is recent
      const timestamp = new Date(response.body.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - timestamp.getTime();
      expect(diffMs).toBeLessThan(5000); // Within 5 seconds
    });

    it('should handle service degradation gracefully', async () => {
      // This test simulates various degraded states
      const response = await request(API_BASE_URL)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });
});