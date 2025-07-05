import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';

const parser = new Parser();

const app = express();
const PORT = process.env.PORT || 8080;

// CORS middleware for local dev (optional)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// API route: fetch RSS feed server-side to avoid CORS issues
app.get('/api/feed', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || Array.isArray(url)) {
      return res.status(400).json({ error: 'url parameter required' });
    }

    const feed = await parser.parseURL(url);
    // Return only necessary fields
    const items = feed.items.map((it) => ({
      title: it.title,
      link: it.link,
      description: it.contentSnippet || it.content || '',
      pubDate: it.pubDate,
      enclosure: it.enclosure,
    }));
    res.json(items);
  } catch (err) {
    console.error('Feed fetch failed', err);
    res.status(500).json({ error: 'feed_fetch_failed' });
  }
});

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static frontend build
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});