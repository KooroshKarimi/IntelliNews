-- IntelliNews Initial Database Schema for PostgreSQL
-- Run this manually when setting up a new PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Feeds table
CREATE TABLE IF NOT EXISTS feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'de',
  last_error TEXT,
  last_error_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topics table with JSONB for keywords
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]',
  exclude_keywords JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Articles table with JSONB for topics
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
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_articles_publication_date ON articles(publication_date);
CREATE INDEX IF NOT EXISTS idx_articles_source_feed ON articles(source_feed_name);
CREATE INDEX IF NOT EXISTS idx_articles_topics ON articles USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_feeds_url ON feeds(url);
CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name);

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feeds_updated_at BEFORE UPDATE ON feeds 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();