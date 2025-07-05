import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';
import { AiService } from './services/AiService.js';

const parser = new Parser();
const aiService = new AiService();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// CORS middleware for local dev (optional)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Initialize AI service
await aiService.initialize();

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
      id: it.link || it.guid,
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

// API route: enhance article with AI
app.post('/api/enhance-article', async (req, res) => {
  try {
    const { article } = req.body;
    
    if (!article || !article.originalTitle) {
      return res.status(400).json({ error: 'article with originalTitle required' });
    }

    // Create article object with required fields
    const articleData = {
      id: article.id || article.link,
      link: article.link,
      originalTitle: article.originalTitle,
      originalSummary: article.originalSummary || article.description,
      originalContent: article.originalContent || article.description,
      sourceFeedName: article.sourceFeedName || 'Unknown',
      publicationDate: article.publicationDate || article.pubDate,
      imageUrl: article.imageUrl,
      topics: article.topics || [],
      ...article
    };

    const enhancedArticle = await aiService.enhanceArticle(articleData);
    res.json(enhancedArticle);
  } catch (err) {
    console.error('Article enhancement failed', err);
    res.status(500).json({ error: 'article_enhancement_failed' });
  }
});

// API route: get AI provider information
app.get('/api/ai-provider', async (req, res) => {
  try {
    const providerInfo = await aiService.getProviderInfo();
    res.json(providerInfo);
  } catch (err) {
    console.error('Failed to get AI provider info', err);
    res.status(500).json({ error: 'ai_provider_info_failed' });
  }
});

// API route: test AI functionality
app.post('/api/test-ai', async (req, res) => {
  try {
    const { operation, data } = req.body;
    
    if (!operation || !data) {
      return res.status(400).json({ error: 'operation and data required' });
    }

    // Create a test article
    const testArticle = {
      id: 'test-article',
      originalTitle: data.title || 'Test Article',
      originalContent: data.content || 'This is a test article for AI processing.',
      originalSummary: data.summary || 'Test summary'
    };

    const result = await aiService.enhanceArticle(testArticle);
    res.json(result);
  } catch (err) {
    console.error('AI test failed', err);
    res.status(500).json({ error: 'ai_test_failed' });
  }
});

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiService: aiService.isInitialized ? 'initialized' : 'not_initialized'
  });
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
  console.log(`AI Provider: ${process.env.AI_PROVIDER || 'mock'}`);
});