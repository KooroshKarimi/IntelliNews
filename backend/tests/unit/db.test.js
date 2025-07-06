const { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } = require('@jest/globals');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Mock pg module
const mockPool = {
  query: jest.fn(),
  end: jest.fn()
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool)
}));

describe('Database Module', () => {
  let testDbPath;
  let originalProcessEnv;

  beforeAll(() => {
    originalProcessEnv = process.env;
    testDbPath = path.join(__dirname, 'test.db');
  });

  afterAll(() => {
    process.env = originalProcessEnv;
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.DATABASE_URL;
    delete process.env.PG_SSL;
    delete process.env.DB_PATH;
  });

  afterEach(() => {
    // Clean up any created test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('SQLite Configuration', () => {
    it('should use SQLite when DATABASE_URL is not set', () => {
      process.env.DB_PATH = testDbPath;
      delete require.cache[require.resolve('../../db.js')];
      const { db, isPostgres } = require('../../db.js');
      
      expect(isPostgres).toBe(false);
      expect(db).toBeDefined();
    });

    it('should use custom DB_PATH when provided', () => {
      const customPath = path.join(__dirname, 'custom.db');
      process.env.DB_PATH = customPath;
      delete require.cache[require.resolve('../../db.js')];
      
      const { db } = require('../../db.js');
      expect(db).toBeDefined();
      
      // Clean up
      if (fs.existsSync(customPath)) {
        fs.unlinkSync(customPath);
      }
    });

    it('should create tables on initialization', (done) => {
      process.env.DB_PATH = testDbPath;
      delete require.cache[require.resolve('../../db.js')];
      
      const { db } = require('../../db.js');
      
      setTimeout(() => {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
          expect(err).toBeFalsy();
          const tableNames = tables.map(t => t.name);
          expect(tableNames).toContain('feeds');
          expect(tableNames).toContain('topics');
          expect(tableNames).toContain('articles');
          done();
        });
      }, 100);
    });
  });

  describe('PostgreSQL Configuration', () => {
    it('should use PostgreSQL when DATABASE_URL is set', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
      delete require.cache[require.resolve('../../db.js')];
      
      const { isPostgres } = require('../../db.js');
      expect(isPostgres).toBe(true);
    });

    it('should configure SSL when PG_SSL is true', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
      process.env.PG_SSL = 'true';
      delete require.cache[require.resolve('../../db.js')];
      
      const { isPostgres } = require('../../db.js');
      expect(isPostgres).toBe(true);
    });

    it('should handle PostgreSQL query methods', async () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
      delete require.cache[require.resolve('../../db.js')];
      
      mockPool.query.mockResolvedValue({ rows: [{ id: 1, name: 'test' }] });
      
      const { db } = require('../../db.js');
      
      // Test all method
      await new Promise((resolve) => {
        db.all('SELECT * FROM test', [], (err, rows) => {
          expect(err).toBeFalsy();
          expect(rows).toEqual([{ id: 1, name: 'test' }]);
          resolve();
        });
      });
      
      // Test get method
      await new Promise((resolve) => {
        db.get('SELECT * FROM test WHERE id = ?', [1], (err, row) => {
          expect(err).toBeFalsy();
          expect(row).toEqual({ id: 1, name: 'test' });
          resolve();
        });
      });
    });

    it('should handle PostgreSQL connection errors', async () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
      delete require.cache[require.resolve('../../db.js')];
      
      const error = new Error('Connection failed');
      mockPool.query.mockRejectedValue(error);
      
      const { db } = require('../../db.js');
      
      await new Promise((resolve) => {
        db.all('SELECT * FROM test', [], (err, rows) => {
          expect(err).toBe(error);
          expect(rows).toBeUndefined();
          resolve();
        });
      });
    });
  });

  describe('Database Operations', () => {
    let db;

    beforeEach(() => {
      process.env.DB_PATH = testDbPath;
      delete require.cache[require.resolve('../../db.js')];
      db = require('../../db.js').db;
    });

    it('should perform CRUD operations on feeds table', (done) => {
      const testFeed = {
        id: 'test-feed-1',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        language: 'en'
      };

      db.serialize(() => {
        // Insert
        db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
          [testFeed.id, testFeed.name, testFeed.url, testFeed.language], 
          function(err) {
            expect(err).toBeFalsy();
            
            // Select
            db.get('SELECT * FROM feeds WHERE id = ?', [testFeed.id], (err, row) => {
              expect(err).toBeFalsy();
              expect(row).toEqual(testFeed);
              
              // Update
              db.run('UPDATE feeds SET name = ? WHERE id = ?', ['Updated Feed', testFeed.id], (err) => {
                expect(err).toBeFalsy();
                
                // Delete
                db.run('DELETE FROM feeds WHERE id = ?', [testFeed.id], (err) => {
                  expect(err).toBeFalsy();
                  done();
                });
              });
            });
          }
        );
      });
    });

    it('should perform CRUD operations on topics table', (done) => {
      const testTopic = {
        id: 'test-topic-1',
        name: 'Technology',
        keywords: '["tech", "software", "programming"]',
        excludeKeywords: '["spam", "ads"]'
      };

      db.serialize(() => {
        db.run('INSERT INTO topics(id,name,keywords,excludeKeywords) VALUES(?,?,?,?)', 
          [testTopic.id, testTopic.name, testTopic.keywords, testTopic.excludeKeywords], 
          function(err) {
            expect(err).toBeFalsy();
            
            db.get('SELECT * FROM topics WHERE id = ?', [testTopic.id], (err, row) => {
              expect(err).toBeFalsy();
              expect(row).toEqual(testTopic);
              done();
            });
          }
        );
      });
    });

    it('should perform CRUD operations on articles table', (done) => {
      const testArticle = {
        id: 'test-article-1',
        link: 'https://example.com/article1',
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
        aiEnhanced: 1
      };

      db.serialize(() => {
        db.run(`INSERT INTO articles(
          id, link, originalTitle, originalSummary, translatedTitle, translatedSummary,
          sourceFeedName, publicationDate, processedDate, topics, seriousnessScore,
          imageUrl, imageGenerated, aiEnhanced
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          Object.values(testArticle),
          function(err) {
            expect(err).toBeFalsy();
            
            db.get('SELECT * FROM articles WHERE id = ?', [testArticle.id], (err, row) => {
              expect(err).toBeFalsy();
              expect(row).toEqual(testArticle);
              done();
            });
          }
        );
      });
    });

    it('should handle database errors gracefully', (done) => {
      db.run('INSERT INTO nonexistent_table VALUES (1)', (err) => {
        expect(err).toBeTruthy();
        expect(err.message).toContain('no such table');
        done();
      });
    });

    it('should handle constraint violations', (done) => {
      const testFeed = {
        id: 'test-feed-duplicate',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        language: 'en'
      };

      db.serialize(() => {
        // Insert first record
        db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
          [testFeed.id, testFeed.name, testFeed.url, testFeed.language], 
          function(err) {
            expect(err).toBeFalsy();
            
            // Try to insert duplicate
            db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
              [testFeed.id, testFeed.name, testFeed.url, testFeed.language], 
              function(err) {
                expect(err).toBeTruthy();
                expect(err.message).toContain('UNIQUE constraint failed');
                done();
              }
            );
          }
        );
      });
    });

    it('should handle empty result sets', (done) => {
      db.all('SELECT * FROM feeds WHERE id = ?', ['nonexistent'], (err, rows) => {
        expect(err).toBeFalsy();
        expect(rows).toEqual([]);
        done();
      });
    });

    it('should handle transactions', (done) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
          ['tx-test', 'Transaction Test', 'https://test.com', 'en'], 
          function(err) {
            expect(err).toBeFalsy();
            
            db.run('ROLLBACK');
            
            db.get('SELECT * FROM feeds WHERE id = ?', ['tx-test'], (err, row) => {
              expect(err).toBeFalsy();
              expect(row).toBeUndefined();
              done();
            });
          }
        );
      });
    });
  });

  describe('Edge Cases', () => {
    let db;

    beforeEach(() => {
      process.env.DB_PATH = testDbPath;
      delete require.cache[require.resolve('../../db.js')];
      db = require('../../db.js').db;
    });

    it('should handle null and undefined values', (done) => {
      db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
        ['null-test', null, undefined, 'en'], 
        function(err) {
          // SQLite should handle null/undefined gracefully
          expect(err).toBeFalsy();
          done();
        }
      );
    });

    it('should handle special characters in data', (done) => {
      const specialData = {
        id: 'special-test',
        name: 'Test with "quotes" and \'apostrophes\'',
        url: 'https://example.com/feed?param=value&other=test',
        language: 'de'
      };

      db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
        [specialData.id, specialData.name, specialData.url, specialData.language], 
        function(err) {
          expect(err).toBeFalsy();
          
          db.get('SELECT * FROM feeds WHERE id = ?', [specialData.id], (err, row) => {
            expect(err).toBeFalsy();
            expect(row.name).toBe(specialData.name);
            expect(row.url).toBe(specialData.url);
            done();
          });
        }
      );
    });

    it('should handle large data sets', (done) => {
      const largeText = 'A'.repeat(10000);
      
      db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
        ['large-test', largeText, 'https://example.com', 'en'], 
        function(err) {
          expect(err).toBeFalsy();
          
          db.get('SELECT * FROM feeds WHERE id = ?', ['large-test'], (err, row) => {
            expect(err).toBeFalsy();
            expect(row.name).toBe(largeText);
            done();
          });
        }
      );
    });

    it('should handle Unicode characters', (done) => {
      const unicodeData = {
        id: 'unicode-test',
        name: 'Test with émojis 🚀 and ümlaut',
        url: 'https://example.com/fééd.xml',
        language: 'de'
      };

      db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', 
        [unicodeData.id, unicodeData.name, unicodeData.url, unicodeData.language], 
        function(err) {
          expect(err).toBeFalsy();
          
          db.get('SELECT * FROM feeds WHERE id = ?', [unicodeData.id], (err, row) => {
            expect(err).toBeFalsy();
            expect(row.name).toBe(unicodeData.name);
            expect(row.url).toBe(unicodeData.url);
            done();
          });
        }
      );
    });
  });
});