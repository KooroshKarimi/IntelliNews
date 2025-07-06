// IntelliNews database helper - supports SQLite (development) and PostgreSQL (production)

const path = require('path');
const { Pool } = (() => {
  try { return require('pg'); } catch { return {}; }
})();
const sqlite3 = require('sqlite3').verbose();
const isPostgres = !!process.env.DATABASE_URL;

let db;

if (isPostgres) {
  // PostgreSQL connection pool
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PG_SSL === 'true' });
  db = {
    run: (text, params = []) => pool.query(text, params),
    all: (text, params, cb) => pool.query(text, params).then(r => cb(null, r.rows)).catch(cb),
    get: (text, params, cb) => pool.query(text, params).then(r => cb(null, r.rows[0])).catch(cb),
  };
} else {
  // SQLite fallback (file or memory)
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
  const sqlite = new sqlite3.Database(DB_PATH);
  db = sqlite;
}

function init() {
  const feedTable = `CREATE TABLE IF NOT EXISTS feeds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    language TEXT NOT NULL
  )`;

  const topicTable = `CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    keywords TEXT NOT NULL,
    excludeKeywords TEXT
  )`;

  const articleTable = `CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    link TEXT,
    originalTitle TEXT,
    originalSummary TEXT,
    translatedTitle TEXT,
    translatedSummary TEXT,
    sourceFeedName TEXT,
    publicationDate TEXT,
    processedDate TEXT,
    topics TEXT,
    seriousnessScore INTEGER,
    imageUrl TEXT,
    imageGenerated INTEGER,
    aiEnhanced INTEGER
  )`;

  if (isPostgres) {
    // run sequentially via pool
    db.run(feedTable);
    db.run(topicTable);
    db.run(articleTable);
  } else {
    db.serialize(() => {
      db.run(feedTable);
      db.run(topicTable);
      db.run(articleTable);
    });
  }
}

init();

module.exports = { db, isPostgres };