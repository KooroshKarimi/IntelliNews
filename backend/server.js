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
    db.run('DELETE FROM feeds');
    feeds.forEach(f => {
      db.run('INSERT INTO feeds(id,name,url,language) VALUES(?,?,?,?)', [f.id || uuidv4(), f.name, f.url, f.language || 'de']);
    });
    db.run('DELETE FROM topics');
    topics.forEach(t => {
      db.run('INSERT INTO topics(id,name,keywords,excludeKeywords) VALUES(?,?,?,?)', [t.id || uuidv4(), t.name, JSON.stringify(t.keywords||[]), JSON.stringify(t.excludeKeywords||[])]);
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
    res.json(rows);
  });
});

app.post('/api/topics', (req, res) => {
  const { name, keywords, excludeKeywords } = req.body;
  const id = uuidv4();
  db.run('INSERT INTO topics(id,name,keywords,excludeKeywords) VALUES(?,?,?,?)', [id, name, JSON.stringify(keywords||[]), JSON.stringify(excludeKeywords||[])]);
  res.json({ id, name, keywords, excludeKeywords });
});

app.delete('/api/topics/:id', (req, res) => {
  db.run('DELETE FROM topics WHERE id = ?', [req.params.id]);
  res.json({ status: 'deleted' });
});

// Articles query
app.get('/api/articles', (req, res) => {
  const { topic, limit = 50 } = req.query;
  let sql = 'SELECT * FROM articles';
  const params = [];
  if (topic) {
    sql += ' WHERE topics LIKE ?';
    params.push(`%${topic}%`);
  }
  sql += ' ORDER BY publicationDate DESC LIMIT ?';
  params.push(Number(limit));
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, topics: JSON.parse(r.topics||'[]') })));
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