import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';
import fs from 'fs/promises';
import { AiProviderFactory } from './ai/AiProviderFactory.js';
import { jaccardSimilarity } from './utils/duplicateDetection.js';

const parser = new Parser();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// In-memory storage (will be replaced with PostgreSQL in production)
let configuration = {
  feeds: [],
  topics: [],
  articles: []
};

// Load configuration on startup
async function loadConfiguration() {
  try {
    const data = await fs.readFile('config/configuration.json', 'utf8');
    configuration = JSON.parse(data);
  } catch (error) {
    console.log('No configuration file found, using defaults');
  }
}

// Save configuration
async function saveConfiguration() {
  try {
    await fs.mkdir('config', { recursive: true });
    await fs.writeFile('config/configuration.json', JSON.stringify(configuration, null, 2));
  } catch (error) {
    console.error('Error saving configuration:', error);
  }
}

// Initialize AI provider
const aiProvider = AiProviderFactory.createProvider(process.env.AI_PROVIDER || 'mock');

// Configuration API endpoints
app.get('/api/config', (req, res) => {
  res.json(configuration);
});

app.post('/api/config', async (req, res) => {
  try {
    configuration = { ...configuration, ...req.body };
    await saveConfiguration();
    res.json({ success: true, message: 'Configuration saved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Feed API endpoints
app.get('/api/feeds', (req, res) => {
  res.json(configuration.feeds);
});

app.post('/api/feeds', async (req, res) => {
  try {
    const feed = {
      id: generateId(),
      name: req.body.name,
      url: req.body.url,
      language: req.body.language || 'de'
    };
    configuration.feeds.push(feed);
    await saveConfiguration();
    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add feed' });
  }
});

app.delete('/api/feeds/:id', async (req, res) => {
  try {
    const feedId = req.params.id;
    configuration.feeds = configuration.feeds.filter(f => f.id !== feedId);
    await saveConfiguration();
    res.json({ success: true, message: 'Feed deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete feed' });
  }
});

// Topic API endpoints
app.get('/api/topics', (req, res) => {
  res.json(configuration.topics);
});

app.post('/api/topics', async (req, res) => {
  try {
    const topic = {
      id: generateId(),
      name: req.body.name,
      keywords: req.body.keywords || [],
      excludeKeywords: req.body.excludeKeywords || []
    };
    configuration.topics.push(topic);
    await saveConfiguration();
    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add topic' });
  }
});

app.delete('/api/topics/:id', async (req, res) => {
  try {
    const topicId = req.params.id;
    configuration.topics = configuration.topics.filter(t => t.id !== topicId);
    await saveConfiguration();
    res.json({ success: true, message: 'Topic deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

// Articles API endpoints
app.get('/api/articles', (req, res) => {
  const { topic, limit = 100 } = req.query;
  let articles = configuration.articles;

  if (topic) {
    articles = articles.filter(article => article.topics.includes(topic));
  }

  // Sort by publication date (newest first)
  articles.sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate));

  // Apply limit
  articles = articles.slice(0, parseInt(limit));

  res.json(articles);
});

// RSS feed proxy (existing endpoint)
app.get('/api/feed', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || Array.isArray(url)) {
      return res.status(400).json({ error: 'url parameter required' });
    }

    const feed = await parser.parseURL(url);
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

// Process feeds and update articles
async function processFeedsUpdate() {
  console.log('Processing feeds update...');
  
  const allArticles = [];
  const updatedFeeds = [...configuration.feeds];

  for (const feed of configuration.feeds) {
    try {
      console.log(`Processing feed: ${feed.name}`);
      
      const rssData = await parser.parseURL(feed.url);
      const feedArticles = rssData.items.map((item) => {
        const imageUrl = extractImageUrl(item);
        
        return {
          id: item.link,
          link: item.link,
          originalTitle: item.title,
          originalSummary: item.contentSnippet || item.content || '',
          originalLanguage: feed.language,
          sourceFeedName: feed.name,
          publicationDate: new Date(item.pubDate || Date.now()).toISOString(),
          processedDate: new Date().toISOString(),
          topics: [],
          aiEnhanced: false,
          imageUrl
        };
      });

      // Process articles with AI
      const processedArticles = [];
      for (const article of feedArticles) {
        try {
          let enhancedArticle = { ...article };

          // Translate if not German
          if (feed.language !== 'de') {
            const translation = await aiProvider.translate(
              `${article.originalTitle}\n\n${article.originalSummary}`,
              feed.language,
              'de'
            );
            
            const [translatedTitle, translatedSummary] = translation.split('\n\n');
            enhancedArticle.translatedTitle = translatedTitle;
            enhancedArticle.translatedSummary = translatedSummary;
            enhancedArticle.aiEnhanced = true;
          }

          // Evaluate seriousness
          try {
            const seriousnessScore = await aiProvider.evaluateSeriousness(enhancedArticle);
            enhancedArticle.seriousnessScore = seriousnessScore;
          } catch (error) {
            console.warn(`Seriousness evaluation failed for article ${article.id}:`, error.message);
          }

          // Generate image if none exists
          if (!enhancedArticle.imageUrl) {
            try {
              const generatedImageUrl = await aiProvider.generateImage(
                enhancedArticle.translatedTitle || enhancedArticle.originalTitle
              );
              enhancedArticle.imageUrl = generatedImageUrl;
              enhancedArticle.imageGenerated = true;
            } catch (error) {
              console.warn(`Image generation failed for article ${article.id}:`, error.message);
            }
          }

          // Match topics
          enhancedArticle.topics = matchTopics(enhancedArticle, configuration.topics);

          processedArticles.push(enhancedArticle);
        } catch (error) {
          console.error(`Error processing article ${article.id}:`, error);
          processedArticles.push(article); // Add original article without enhancements
        }
      }

      allArticles.push(...processedArticles);

      // Clear feed errors
      const feedIndex = updatedFeeds.findIndex(f => f.id === feed.id);
      if (feedIndex !== -1) {
        delete updatedFeeds[feedIndex].lastError;
        delete updatedFeeds[feedIndex].lastErrorTime;
      }

    } catch (error) {
      console.error(`Error processing feed ${feed.name}:`, error);
      
      // Update feed with error
      const feedIndex = updatedFeeds.findIndex(f => f.id === feed.id);
      if (feedIndex !== -1) {
        updatedFeeds[feedIndex].lastError = error.message;
        updatedFeeds[feedIndex].lastErrorTime = new Date().toISOString();
      }
    }
  }

  // Remove duplicates
  const uniqueArticles = removeDuplicates(allArticles, configuration.articles);

  // Update configuration
  configuration.feeds = updatedFeeds;
  configuration.articles = uniqueArticles;
  await saveConfiguration();

  console.log(`Updated ${uniqueArticles.length} articles from ${configuration.feeds.length} feeds`);
}

// Utility functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function extractImageUrl(item) {
  if (item.enclosure && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  
  const description = item.content || item.contentSnippet || '';
  const match = description.match(/<img[^>]+src="([^"]+)"/);
  return match ? match[1] : undefined;
}

function matchTopics(article, topics) {
  const text = `${article.originalTitle} ${article.originalSummary}`.toLowerCase();
  const matchedTopics = [];
  
  for (const topic of topics) {
    const hasKeyword = topic.keywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    const hasExcludeKeyword = topic.excludeKeywords?.some(keyword => 
      text.includes(keyword.toLowerCase())
    ) || false;
    
    if (hasKeyword && !hasExcludeKeyword) {
      matchedTopics.push(topic.name);
    }
  }
  
  return matchedTopics;
}

function removeDuplicates(newArticles, existingArticles = []) {
  const allArticles = [...existingArticles];
  
  for (const article of newArticles) {
    const isDuplicate = allArticles.some(existing => {
      const text1 = `${article.originalTitle} ${article.originalSummary}`;
      const text2 = `${existing.originalTitle} ${existing.originalSummary}`;
      return jaccardSimilarity(text1, text2) > 0.9;
    });
    
    if (!isDuplicate) {
      allArticles.push(article);
    }
  }
  
  return allArticles;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    aiProvider: process.env.AI_PROVIDER || 'mock'
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

// Cron job - process feeds every 5 minutes
setInterval(async () => {
  try {
    await processFeedsUpdate();
  } catch (error) {
    console.error('Scheduled feed update failed:', error);
  }
}, 5 * 60 * 1000);

// Initialize and start server
async function startServer() {
  await loadConfiguration();
  
  // Run initial feed update
  setTimeout(async () => {
    console.log('Running initial feed update...');
    await processFeedsUpdate();
  }, 5000);
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`AI Provider: ${process.env.AI_PROVIDER || 'mock'}`);
  });
}

startServer();