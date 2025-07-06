// IntelliNews backend v0.6 - basic REST API & feed processing
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db.js';
import { processAllFeeds } from './feedProcessor.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '0.6', aiProvider: 'mock' });
});

// Configuration endpoints (feeds + topics together)
app.get('/api/config', (req, res) => {
  db.serialize(() => {
    db.all('SELECT * FROM feeds', (err1, feeds) => {
      if (err1) return res.status(500).json({ error: err1.message });
      db.all('SELECT * FROM topics', (err2, topics) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ feeds, topics });
      });
    });
  });
});

app.post('/api/config', (req, res) => {
  const { feeds = [], topics = [] } = req.body;
  
  db.serialize(() => {
    // Clear and insert feeds
    db.run('DELETE FROM feeds');
    feeds.forEach(f => {
      const feedSql = db.isPostgres 
        ? 'INSERT INTO feeds(id,name,url,language) VALUES($1,$2,$3,$4)'
        : 'INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)';
      db.run(feedSql, [f.id || uuidv4(), f.name, f.url, f.language || 'de']);
    });
    
    // Clear and insert topics
    db.run('DELETE FROM topics');
    topics.forEach(t => {
      if (db.isPostgres) {
        db.run('INSERT INTO topics(id,name,keywords,exclude_keywords) VALUES($1,$2,$3,$4)', 
          [t.id || uuidv4(), t.name, JSON.stringify(t.keywords||[]), JSON.stringify(t.excludeKeywords||[])]);
      } else {
        db.run('INSERT INTO topics(id,name,keywords,excludeKeywords) VALUES(?,?,?,?)', 
          [t.id || uuidv4(), t.name, JSON.stringify(t.keywords||[]), JSON.stringify(t.excludeKeywords||[])]);
      }
    });
  });
  
  res.json({ status: 'saved' });
});

// Feeds CRUD
app.get('/api/feeds', (req, res) => {
  db.all('SELECT * FROM feeds', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/feeds', (req, res) => {
  const { name, url, language } = req.body;
  const id = uuidv4();
  db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', [id, name, url, language || 'de']);
  res.json({ id, name, url, language });
});

app.delete('/api/feeds/:id', (req, res) => {
  db.run('DELETE FROM feeds WHERE id = ?', [req.params.id]);
  res.json({ status: 'deleted' });
});

// Topics CRUD
app.get('/api/topics', (req, res) => {
  db.all('SELECT * FROM topics', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Map fields and parse JSON for consistent API
    const topics = rows.map(row => {
      if (db.isPostgres) {
        return {
          id: row.id,
          name: row.name,
          keywords: Array.isArray(row.keywords) ? row.keywords : [],
          excludeKeywords: Array.isArray(row.exclude_keywords) ? row.exclude_keywords : [],
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      } else {
        return {
          ...row,
          keywords: row.keywords ? JSON.parse(row.keywords) : [],
          excludeKeywords: row.excludeKeywords ? JSON.parse(row.excludeKeywords) : []
        };
      }
    });
    
    res.json(topics);
  });
});

app.post('/api/topics', (req, res) => {
  const { name, keywords, excludeKeywords } = req.body;
  const id = uuidv4();
  
  if (db.isPostgres) {
    const sql = 'INSERT INTO topics(id,name,keywords,exclude_keywords) VALUES($1,$2,$3,$4)';
    db.run(sql, [id, name, JSON.stringify(keywords||[]), JSON.stringify(excludeKeywords||[])]);
  } else {
    const sql = 'INSERT INTO topics(id,name,keywords,excludeKeywords) VALUES(?,?,?,?)';
    db.run(sql, [id, name, JSON.stringify(keywords||[]), JSON.stringify(excludeKeywords||[])]);
  }
  
  res.json({ id, name, keywords: keywords || [], excludeKeywords: excludeKeywords || [] });
});

app.delete('/api/topics/:id', (req, res) => {
  db.run('DELETE FROM topics WHERE id = ?', [req.params.id]);
  res.json({ status: 'deleted' });
});

// Articles query
app.get('/api/articles', (req, res) => {
  const { topic, limit = 50 } = req.query;
  
  // Use database-specific field names
  const publicationDateField = db.isPostgres ? 'publication_date' : 'publicationDate';
  const topicsField = db.isPostgres ? 'topics' : 'topics';
  
  let sql = 'SELECT * FROM articles';
  const params = [];
  
  if (topic) {
    if (db.isPostgres) {
      sql += ' WHERE topics @> $1';
      params.push(JSON.stringify([topic]));
    } else {
      sql += ' WHERE topics LIKE ?';
      params.push(`%${topic}%`);
    }
  }
  
  sql += ` ORDER BY ${publicationDateField} DESC`;
  
  if (db.isPostgres) {
    sql += ' LIMIT $' + (params.length + 1);
    params.push(Number(limit));
  } else {
    sql += ' LIMIT ?';
    params.push(Number(limit));
  }
  
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Map database fields to consistent API format and parse topics
    const articles = rows.map(row => {
      const mapped = db.mapFields(row);
      
      // Parse topics JSON for both database types
      if (typeof mapped.topics === 'string') {
        mapped.topics = JSON.parse(mapped.topics || '[]');
      } else if (!Array.isArray(mapped.topics)) {
        mapped.topics = [];
      }
      
      return mapped;
    });
    
    res.json(articles);
  });
});

// Manual trigger for feed processing
app.post('/api/parse', async (req, res) => {
  await processAllFeeds();
  res.json({ status: 'started' });
});

// Start periodic processing every 5 minutes (simulation)
setInterval(() => {
  processAllFeeds().catch(console.error);
}, 5 * 60 * 1000);

app.listen(PORT, () => console.log(`Backend API listening on ${PORT}`));