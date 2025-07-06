// IntelliNews Database Layer - Full SQLite & PostgreSQL Support
const path = require('path');
const { Pool } = (() => {
  try { return require('pg'); } catch { return {}; }
})();
const sqlite3 = require('sqlite3').verbose();

// Database selection based on environment
const DATABASE_TYPE = process.env.NODE_ENV === 'production' && process.env.DATABASE_URL ? 'postgres' : 'sqlite';
const isPostgres = DATABASE_TYPE === 'postgres';

class DatabaseAdapter {
  constructor() {
    this.isPostgres = isPostgres;
    this.init();
  }

  init() {
    if (isPostgres) {
      this.initPostgreSQL();
    } else {
      this.initSQLite();
    }
    this.createTables();
  }

  initPostgreSQL() {
    console.log('🐘 Initializing PostgreSQL connection...');
    const config = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
    
    this.pool = new Pool(config);
    
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
      process.exit(-1);
    });
  }

  initSQLite() {
    console.log('🗃️ Initializing SQLite database...');
    const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
    this.sqlite = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err);
        process.exit(-1);
      }
      console.log(`SQLite database connected: ${dbPath}`);
    });
  }

  // Unified interface methods
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (isPostgres) {
        this.pool.query(sql, params)
          .then(result => resolve(result))
          .catch(reject);
      } else {
        this.sqlite.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }
    });
  }

  all(sql, params = [], callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    if (isPostgres) {
      this.pool.query(sql, params)
        .then(result => callback(null, result.rows))
        .catch(callback);
    } else {
      this.sqlite.all(sql, params, callback);
    }
  }

  get(sql, params = [], callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    if (isPostgres) {
      this.pool.query(sql, params)
        .then(result => callback(null, result.rows[0] || null))
        .catch(callback);
    } else {
      this.sqlite.get(sql, params, callback);
    }
  }

  serialize(callback) {
    if (isPostgres) {
      // PostgreSQL doesn't need serialization, just run the callback
      callback();
    } else {
      this.sqlite.serialize(callback);
    }
  }

  async createTables() {
    console.log(`📋 Creating database schema for ${DATABASE_TYPE}...`);
    
    const feedsTable = isPostgres ? `
      CREATE TABLE IF NOT EXISTS feeds (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        language VARCHAR(10) NOT NULL DEFAULT 'de',
        last_error TEXT,
        last_error_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    ` : `
      CREATE TABLE IF NOT EXISTS feeds (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'de',
        last_error TEXT,
        last_error_time TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const topicsTable = isPostgres ? `
      CREATE TABLE IF NOT EXISTS topics (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        keywords JSONB NOT NULL DEFAULT '[]',
        exclude_keywords JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    ` : `
      CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        keywords TEXT NOT NULL DEFAULT '[]',
        excludeKeywords TEXT DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const articlesTable = isPostgres ? `
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        link TEXT,
        original_title TEXT,
        original_summary TEXT,
        original_content TEXT,
        translated_title TEXT,
        translated_summary TEXT,
        source_feed_name VARCHAR(255),
        publication_date TIMESTAMP,
        processed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        topics JSONB DEFAULT '[]',
        seriousness_score INTEGER CHECK (seriousness_score >= 1 AND seriousness_score <= 10),
        image_url TEXT,
        image_generated BOOLEAN DEFAULT FALSE,
        ai_enhanced BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    ` : `
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        link TEXT,
        originalTitle TEXT,
        originalSummary TEXT,
        originalContent TEXT,
        translatedTitle TEXT,
        translatedSummary TEXT,
        sourceFeedName TEXT,
        publicationDate TEXT,
        processedDate TEXT DEFAULT CURRENT_TIMESTAMP,
        topics TEXT DEFAULT '[]',
        seriousnessScore INTEGER,
        imageUrl TEXT,
        imageGenerated INTEGER DEFAULT 0,
        aiEnhanced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await this.run(feedsTable);
      await this.run(topicsTable);
      await this.run(articlesTable);
      
      if (isPostgres) {
        // Create indexes for better performance
        await this.run('CREATE INDEX IF NOT EXISTS idx_articles_publication_date ON articles(publication_date)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_articles_source_feed ON articles(source_feed_name)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_articles_topics ON articles USING GIN(topics)');
      }
      
      console.log('✅ Database schema created successfully');
    } catch (error) {
      console.error('❌ Error creating database schema:', error);
      process.exit(-1);
    }
  }

  // Helper method for field name mapping (PostgreSQL uses snake_case, SQLite uses camelCase)
  mapFields(row) {
    if (!isPostgres || !row) return row;
    
    // Map PostgreSQL snake_case to camelCase for consistent API
    const mapped = {};
    for (const [key, value] of Object.entries(row)) {
      switch (key) {
        case 'original_title': mapped.originalTitle = value; break;
        case 'original_summary': mapped.originalSummary = value; break;
        case 'original_content': mapped.originalContent = value; break;
        case 'translated_title': mapped.translatedTitle = value; break;
        case 'translated_summary': mapped.translatedSummary = value; break;
        case 'source_feed_name': mapped.sourceFeedName = value; break;
        case 'publication_date': mapped.publicationDate = value; break;
        case 'processed_date': mapped.processedDate = value; break;
        case 'seriousness_score': mapped.seriousnessScore = value; break;
        case 'image_url': mapped.imageUrl = value; break;
        case 'image_generated': mapped.imageGenerated = value ? 1 : 0; break;
        case 'ai_enhanced': mapped.aiEnhanced = value ? 1 : 0; break;
        case 'exclude_keywords': mapped.excludeKeywords = value; break;
        default: mapped[key] = value;
      }
    }
    return mapped;
  }

  // Graceful shutdown
  async close() {
    if (isPostgres) {
      await this.pool.end();
      console.log('PostgreSQL connection pool closed');
    } else {
      return new Promise((resolve) => {
        this.sqlite.close((err) => {
          if (err) console.error('Error closing SQLite:', err);
          else console.log('SQLite database closed');
          resolve();
        });
      });
    }
  }
}

// Create and export the database instance
const dbAdapter = new DatabaseAdapter();

// Export compatibility interface
const db = {
  run: (sql, params) => dbAdapter.run(sql, params),
  all: (sql, params, callback) => dbAdapter.all(sql, params, callback),
  get: (sql, params, callback) => dbAdapter.get(sql, params, callback),
  serialize: (callback) => dbAdapter.serialize(callback),
  mapFields: (row) => dbAdapter.mapFields(row),
  isPostgres: dbAdapter.isPostgres,
  close: () => dbAdapter.close()
};

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await db.close();
  process.exit(0);
});

module.exports = { db, isPostgres: dbAdapter.isPostgres };