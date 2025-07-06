// Simple SQLite helper for IntelliNews backend v0.6

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use file-based DB in production, :memory: fallback for CI
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');

// Open database
const db = new sqlite3.Database(DB_PATH);

// Initialize schema if not exists
function init() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      language TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      keywords TEXT NOT NULL,
      excludeKeywords TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS articles (
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
    )`);
  });
}

init();

module.exports = { db };