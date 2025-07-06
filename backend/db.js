// IntelliNews database helper - supports SQLite (development) and PostgreSQL (production)
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let Pool;
try {
  const pg = await import('pg');
  Pool = pg.Pool;
} catch (error) {
  console.log('PostgreSQL not available, using SQLite');
}

let sqlite3;
try {
  const sqlite = await import('sqlite3');
  sqlite3 = sqlite.default;
} catch (error) {
  console.error('SQLite3 not available');
}

const isPostgres = !!process.env.DATABASE_URL;

let db;

if (isPostgres && Pool) {
  // PostgreSQL connection pool
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
  
  db = {
    run: async (text, params = []) => {
      try {
        const result = await pool.query(text, params);
        return result;
      } catch (error) {
        console.error('Database error:', error);
        throw error;
      }
    },
    all: async (text, params = []) => {
      try {
        const result = await pool.query(text, params);
        return result.rows;
      } catch (error) {
        console.error('Database error:', error);
        throw error;
      }
    },
    get: async (text, params = []) => {
      try {
        const result = await pool.query(text, params);
        return result.rows[0];
      } catch (error) {
        console.error('Database error:', error);
        throw error;
      }
    },
    close: () => pool.end()
  };
} else if (sqlite3) {
  // SQLite fallback (file or memory)
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
  const sqlite = new sqlite3.Database(DB_PATH);
  
  db = {
    run: (text, params = []) => {
      return new Promise((resolve, reject) => {
        sqlite.run(text, params, function(error) {
          if (error) reject(error);
          else resolve({ changes: this.changes, lastID: this.lastID });
        });
      });
    },
    all: (text, params = []) => {
      return new Promise((resolve, reject) => {
        sqlite.all(text, params, (error, rows) => {
          if (error) reject(error);
          else resolve(rows);
        });
      });
    },
    get: (text, params = []) => {
      return new Promise((resolve, reject) => {
        sqlite.get(text, params, (error, row) => {
          if (error) reject(error);
          else resolve(row);
        });
      });
    },
    serialize: (callback) => sqlite.serialize(callback),
    close: () => sqlite.close()
  };
} else {
  throw new Error('No database driver available');
}

async function initializeDatabase() {
  console.log(`Initializing database (${isPostgres ? 'PostgreSQL' : 'SQLite'})...`);
  
  const feedTable = `CREATE TABLE IF NOT EXISTS feeds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    language TEXT NOT NULL DEFAULT 'de',
    enabled BOOLEAN DEFAULT true,
    lastFetched TEXT,
    lastError TEXT,
    lastErrorTime TEXT,
    articleCount INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`;

  const topicTable = `CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    keywords TEXT NOT NULL,
    excludeKeywords TEXT,
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`;

  const articleTable = `CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    link TEXT UNIQUE,
    originalTitle TEXT,
    originalSummary TEXT,
    originalContent TEXT,
    translatedTitle TEXT,
    translatedSummary TEXT,
    sourceFeedName TEXT,
    sourceFeedId TEXT,
    publicationDate TEXT,
    processedDate TEXT,
    topics TEXT DEFAULT '[]',
    seriousnessScore INTEGER,
    imageUrl TEXT,
    imageGenerated BOOLEAN DEFAULT false,
    aiEnhanced BOOLEAN DEFAULT false,
    isRead BOOLEAN DEFAULT false,
    isFavorite BOOLEAN DEFAULT false,
    isArchived BOOLEAN DEFAULT false,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sourceFeedId) REFERENCES feeds(id)
  )`;

  // User preferences table for cross-device consistency
  const userPreferencesTable = `CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY DEFAULT 'user_settings',
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'de',
    articlesPerPage INTEGER DEFAULT 20,
    autoTranslate BOOLEAN DEFAULT true,
    showSeriousnessScore BOOLEAN DEFAULT true,
    defaultTopicFilter TEXT,
    readArticleRetentionDays INTEGER DEFAULT 30,
    aiProvider TEXT DEFAULT 'mock',
    preferences TEXT DEFAULT '{}',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`;

  // Feed status tracking for error handling
  const feedStatusTable = `CREATE TABLE IF NOT EXISTS feed_status (
    feedId TEXT PRIMARY KEY,
    isHealthy BOOLEAN DEFAULT true,
    lastSuccessfulFetch TEXT,
    consecutiveFailures INTEGER DEFAULT 0,
    lastFailureReason TEXT,
    nextRetryTime TEXT,
    FOREIGN KEY (feedId) REFERENCES feeds(id) ON DELETE CASCADE
  )`;

  // Article duplicates for Jaccard similarity tracking
  const duplicatesTable = `CREATE TABLE IF NOT EXISTS article_duplicates (
    id TEXT PRIMARY KEY,
    originalArticleId TEXT,
    duplicateArticleId TEXT,
    similarityScore REAL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (originalArticleId) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (duplicateArticleId) REFERENCES articles(id) ON DELETE CASCADE
  )`;

  try {
    if (isPostgres) {
      await db.run(feedTable);
      await db.run(topicTable);
      await db.run(articleTable);
      await db.run(userPreferencesTable);
      await db.run(feedStatusTable);
      await db.run(duplicatesTable);
      
      // Create indexes for performance
      await db.run('CREATE INDEX IF NOT EXISTS idx_articles_publication_date ON articles(publicationDate DESC)');
      await db.run('CREATE INDEX IF NOT EXISTS idx_articles_source_feed ON articles(sourceFeedId)');
      await db.run('CREATE INDEX IF NOT EXISTS idx_articles_topics ON articles(topics)');
      await db.run('CREATE INDEX IF NOT EXISTS idx_articles_processed_date ON articles(processedDate DESC)');
    } else {
      await db.run(feedTable);
      await db.run(topicTable);
      await db.run(articleTable);
      await db.run(userPreferencesTable);
      await db.run(feedStatusTable);
      await db.run(duplicatesTable);
      
      // Create indexes for performance
      await db.run('CREATE INDEX IF NOT EXISTS idx_articles_publication_date ON articles(publicationDate DESC)');
      await db.run('CREATE INDEX IF NOT EXISTS idx_articles_source_feed ON articles(sourceFeedId)');
      await db.run('CREATE INDEX IF NOT EXISTS idx_articles_processed_date ON articles(processedDate DESC)');
    }

    // Initialize default user preferences if not exists
    const existingPrefs = await db.get('SELECT * FROM user_preferences WHERE id = ?', ['user_settings']);
    if (!existingPrefs) {
      await db.run(`INSERT INTO user_preferences (id) VALUES (?)`, ['user_settings']);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Database operations for feeds
export const feedsDB = {
  async getAll() {
    return await db.all('SELECT * FROM feeds ORDER BY name');
  },
  
  async getById(id) {
    return await db.get('SELECT * FROM feeds WHERE id = ?', [id]);
  },
  
  async create(feed) {
    const now = new Date().toISOString();
    await db.run(
      'INSERT INTO feeds (id, name, url, language, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [feed.id, feed.name, feed.url, feed.language || 'de', feed.enabled !== false, now, now]
    );
    
    // Initialize feed status
    await db.run(
      'INSERT INTO feed_status (feedId, isHealthy) VALUES (?, ?)',
      [feed.id, true]
    );
    
    return feed;
  },
  
  async update(id, updates) {
    const now = new Date().toISOString();
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), now, id];
    
    await db.run(
      `UPDATE feeds SET ${fields}, updatedAt = ? WHERE id = ?`,
      values
    );
  },
  
  async delete(id) {
    await db.run('DELETE FROM feeds WHERE id = ?', [id]);
  },
  
  async updateStatus(feedId, status) {
    const {isHealthy, lastSuccessfulFetch, consecutiveFailures, lastFailureReason, nextRetryTime} = status;
    await db.run(
      `INSERT OR REPLACE INTO feed_status 
       (feedId, isHealthy, lastSuccessfulFetch, consecutiveFailures, lastFailureReason, nextRetryTime)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [feedId, isHealthy, lastSuccessfulFetch, consecutiveFailures || 0, lastFailureReason, nextRetryTime]
    );
  },
  
  async getStatus(feedId) {
    return await db.get('SELECT * FROM feed_status WHERE feedId = ?', [feedId]);
  },
  
  async getAllWithStatus() {
    const query = isPostgres ? 
      'SELECT f.*, fs.isHealthy, fs.lastSuccessfulFetch, fs.consecutiveFailures, fs.lastFailureReason FROM feeds f LEFT JOIN feed_status fs ON f.id = fs.feedId ORDER BY f.name' :
      'SELECT f.*, fs.isHealthy, fs.lastSuccessfulFetch, fs.consecutiveFailures, fs.lastFailureReason FROM feeds f LEFT JOIN feed_status fs ON f.id = fs.feedId ORDER BY f.name';
    return await db.all(query);
  }
};

// Database operations for topics
export const topicsDB = {
  async getAll() {
    return await db.all('SELECT * FROM topics ORDER BY priority DESC, name');
  },
  
  async getById(id) {
    const topic = await db.get('SELECT * FROM topics WHERE id = ?', [id]);
    if (topic) {
      topic.keywords = JSON.parse(topic.keywords || '[]');
      topic.excludeKeywords = JSON.parse(topic.excludeKeywords || '[]');
    }
    return topic;
  },
  
  async create(topic) {
    const now = new Date().toISOString();
    await db.run(
      'INSERT INTO topics (id, name, keywords, excludeKeywords, enabled, priority, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        topic.id, 
        topic.name, 
        JSON.stringify(topic.keywords || []), 
        JSON.stringify(topic.excludeKeywords || []),
        topic.enabled !== false,
        topic.priority || 1,
        now, 
        now
      ]
    );
    return topic;
  },
  
  async update(id, updates) {
    const now = new Date().toISOString();
    const processedUpdates = { ...updates, updatedAt: now };
    
    if (processedUpdates.keywords) {
      processedUpdates.keywords = JSON.stringify(processedUpdates.keywords);
    }
    if (processedUpdates.excludeKeywords) {
      processedUpdates.excludeKeywords = JSON.stringify(processedUpdates.excludeKeywords);
    }
    
    const fields = Object.keys(processedUpdates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(processedUpdates), id];
    
    await db.run(`UPDATE topics SET ${fields} WHERE id = ?`, values);
  },
  
  async delete(id) {
    await db.run('DELETE FROM topics WHERE id = ?', [id]);
  }
};

// Database operations for articles
export const articlesDB = {
  async getAll(options = {}) {
    const { topic, limit = 50, offset = 0, isRead, isArchived, sourceFeedId } = options;
    
    let sql = 'SELECT * FROM articles WHERE 1=1';
    const params = [];
    
    if (topic) {
      sql += ' AND topics LIKE ?';
      params.push(`%${topic}%`);
    }
    
    if (typeof isRead === 'boolean') {
      sql += ' AND isRead = ?';
      params.push(isRead);
    }
    
    if (typeof isArchived === 'boolean') {
      sql += ' AND isArchived = ?';
      params.push(isArchived);
    }
    
    if (sourceFeedId) {
      sql += ' AND sourceFeedId = ?';
      params.push(sourceFeedId);
    }
    
    sql += ' ORDER BY publicationDate DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    
    const rows = await db.all(sql, params);
    return rows.map(row => ({
      ...row,
      topics: JSON.parse(row.topics || '[]'),
      imageGenerated: Boolean(row.imageGenerated),
      aiEnhanced: Boolean(row.aiEnhanced),
      isRead: Boolean(row.isRead),
      isFavorite: Boolean(row.isFavorite),
      isArchived: Boolean(row.isArchived)
    }));
  },
  
  async getById(id) {
    const article = await db.get('SELECT * FROM articles WHERE id = ?', [id]);
    if (article) {
      article.topics = JSON.parse(article.topics || '[]');
      article.imageGenerated = Boolean(article.imageGenerated);
      article.aiEnhanced = Boolean(article.aiEnhanced);
      article.isRead = Boolean(article.isRead);
      article.isFavorite = Boolean(article.isFavorite);
      article.isArchived = Boolean(article.isArchived);
    }
    return article;
  },
  
  async create(article) {
    const now = new Date().toISOString();
    const sql = `INSERT OR REPLACE INTO articles (
      id, link, originalTitle, originalSummary, originalContent, translatedTitle, translatedSummary,
      sourceFeedName, sourceFeedId, publicationDate, processedDate, topics, seriousnessScore,
      imageUrl, imageGenerated, aiEnhanced, isRead, isFavorite, isArchived, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await db.run(sql, [
      article.id,
      article.link,
      article.originalTitle,
      article.originalSummary,
      article.originalContent,
      article.translatedTitle,
      article.translatedSummary,
      article.sourceFeedName,
      article.sourceFeedId,
      article.publicationDate,
      article.processedDate || now,
      JSON.stringify(article.topics || []),
      article.seriousnessScore,
      article.imageUrl,
      Boolean(article.imageGenerated),
      Boolean(article.aiEnhanced),
      Boolean(article.isRead),
      Boolean(article.isFavorite),
      Boolean(article.isArchived),
      now,
      now
    ]);
    
    return article;
  },
  
  async update(id, updates) {
    const now = new Date().toISOString();
    const processedUpdates = { ...updates, updatedAt: now };
    
    if (processedUpdates.topics) {
      processedUpdates.topics = JSON.stringify(processedUpdates.topics);
    }
    
    const fields = Object.keys(processedUpdates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(processedUpdates), id];
    
    await db.run(`UPDATE articles SET ${fields} WHERE id = ?`, values);
  },
  
  async delete(id) {
    await db.run('DELETE FROM articles WHERE id = ?', [id]);
  },
  
  async markAsRead(id, isRead = true) {
    await this.update(id, { isRead, updatedAt: new Date().toISOString() });
  },
  
  async markAsFavorite(id, isFavorite = true) {
    await this.update(id, { isFavorite, updatedAt: new Date().toISOString() });
  },
  
  async archive(id, isArchived = true) {
    await this.update(id, { isArchived, updatedAt: new Date().toISOString() });
  }
};

// Database operations for user preferences
export const userPreferencesDB = {
  async get() {
    const prefs = await db.get('SELECT * FROM user_preferences WHERE id = ?', ['user_settings']);
    if (prefs?.preferences) {
      prefs.preferences = JSON.parse(prefs.preferences);
    }
    return prefs;
  },
  
  async update(updates) {
    const now = new Date().toISOString();
    const processedUpdates = { ...updates, updatedAt: now };
    
    if (processedUpdates.preferences && typeof processedUpdates.preferences === 'object') {
      processedUpdates.preferences = JSON.stringify(processedUpdates.preferences);
    }
    
    const fields = Object.keys(processedUpdates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(processedUpdates), 'user_settings'];
    
    await db.run(`UPDATE user_preferences SET ${fields} WHERE id = ?`, values);
  }
};

// Utility functions
export const dbUtils = {
  async cleanup() {
    // Remove old read articles based on retention policy
    const prefs = await userPreferencesDB.get();
    const retentionDays = prefs?.readArticleRetentionDays || 30;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    
    await db.run(
      'DELETE FROM articles WHERE isRead = ? AND isArchived = ? AND updatedAt < ?',
      [true, false, cutoffDate]
    );
  },
  
  async getStats() {
    const totalArticles = await db.get('SELECT COUNT(*) as count FROM articles');
    const unreadArticles = await db.get('SELECT COUNT(*) as count FROM articles WHERE isRead = ?', [false]);
    const totalFeeds = await db.get('SELECT COUNT(*) as count FROM feeds WHERE enabled = ?', [true]);
    const totalTopics = await db.get('SELECT COUNT(*) as count FROM topics WHERE enabled = ?', [true]);
    
    return {
      totalArticles: totalArticles.count,
      unreadArticles: unreadArticles.count,
      totalFeeds: totalFeeds.count,
      totalTopics: totalTopics.count
    };
  }
};

// Initialize database on module load
await initializeDatabase();

export { db, isPostgres };