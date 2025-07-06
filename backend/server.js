// IntelliNews backend v1.1 - Complete REST API with database persistence
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { feedsDB, articlesDB, topicsDB, userPreferencesDB, dbUtils } from './db.js';
import { processAllFeeds, processFeedByUrl, getProcessingHealth } from './feedProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const AI_PROVIDER = process.env.AI_PROVIDER || 'mock';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../intellinews/build')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const stats = await dbUtils.getStats();
    const processingHealth = await getProcessingHealth();
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(), 
      version: '1.1',
      aiProvider: AI_PROVIDER,
      database: 'operational',
      stats,
      feedProcessing: processingHealth
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================================================
// FEEDS API
// =============================================================================

// Get all feeds with status information
app.get('/api/feeds', async (req, res) => {
  try {
    const feeds = await feedsDB.getAllWithStatus();
    res.json(feeds);
  } catch (error) {
    console.error('Error fetching feeds:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single feed by ID
app.get('/api/feeds/:id', async (req, res) => {
  try {
    const feed = await feedsDB.getById(req.params.id);
    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    res.json(feed);
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new feed
app.post('/api/feeds', async (req, res) => {
  try {
    const { name, url, language, enabled } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }
    
    const feedId = uuidv4();
    const newFeed = {
      id: feedId,
      name,
      url,
      language: language || 'de',
      enabled: enabled !== false
    };
    
    await feedsDB.create(newFeed);
    res.status(201).json(newFeed);
  } catch (error) {
    console.error('Error creating feed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update feed
app.put('/api/feeds/:id', async (req, res) => {
  try {
    const { name, url, language, enabled } = req.body;
    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (language !== undefined) updates.language = language;
    if (enabled !== undefined) updates.enabled = enabled;
    
    await feedsDB.update(req.params.id, updates);
    const updatedFeed = await feedsDB.getById(req.params.id);
    res.json(updatedFeed);
  } catch (error) {
    console.error('Error updating feed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete feed
app.delete('/api/feeds/:id', async (req, res) => {
  try {
    await feedsDB.delete(req.params.id);
    res.json({ status: 'deleted', id: req.params.id });
  } catch (error) {
    console.error('Error deleting feed:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// TOPICS API
// =============================================================================

// Get all topics
app.get('/api/topics', async (req, res) => {
  try {
    const topics = await topicsDB.getAll();
    res.json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single topic by ID
app.get('/api/topics/:id', async (req, res) => {
  try {
    const topic = await topicsDB.getById(req.params.id);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    res.json(topic);
  } catch (error) {
    console.error('Error fetching topic:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new topic
app.post('/api/topics', async (req, res) => {
  try {
    const { name, keywords, excludeKeywords, enabled, priority } = req.body;
    
    if (!name || !keywords) {
      return res.status(400).json({ error: 'Name and keywords are required' });
    }
    
    const topicId = uuidv4();
    const newTopic = {
      id: topicId,
      name,
      keywords: Array.isArray(keywords) ? keywords : [keywords],
      excludeKeywords: Array.isArray(excludeKeywords) ? excludeKeywords : (excludeKeywords ? [excludeKeywords] : []),
      enabled: enabled !== false,
      priority: priority || 1
    };
    
    await topicsDB.create(newTopic);
    res.status(201).json(newTopic);
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update topic
app.put('/api/topics/:id', async (req, res) => {
  try {
    const { name, keywords, excludeKeywords, enabled, priority } = req.body;
    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (keywords !== undefined) updates.keywords = Array.isArray(keywords) ? keywords : [keywords];
    if (excludeKeywords !== undefined) updates.excludeKeywords = Array.isArray(excludeKeywords) ? excludeKeywords : (excludeKeywords ? [excludeKeywords] : []);
    if (enabled !== undefined) updates.enabled = enabled;
    if (priority !== undefined) updates.priority = priority;
    
    await topicsDB.update(req.params.id, updates);
    const updatedTopic = await topicsDB.getById(req.params.id);
    res.json(updatedTopic);
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete topic
app.delete('/api/topics/:id', async (req, res) => {
  try {
    await topicsDB.delete(req.params.id);
    res.json({ status: 'deleted', id: req.params.id });
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// ARTICLES API
// =============================================================================

// Get articles with filtering and pagination
app.get('/api/articles', async (req, res) => {
  try {
    const { 
      topic, 
      limit = 50, 
      offset = 0, 
      isRead, 
      isArchived, 
      sourceFeedId,
      seriousnessMin,
      seriousnessMax
    } = req.query;
    
    const options = {
      topic,
      limit: Math.min(Number(limit), 100), // Cap at 100
      offset: Number(offset)
    };
    
    if (isRead !== undefined) options.isRead = isRead === 'true';
    if (isArchived !== undefined) options.isArchived = isArchived === 'true';
    if (sourceFeedId) options.sourceFeedId = sourceFeedId;
    
    let articles = await articlesDB.getAll(options);
    
    // Apply seriousness filter if specified
    if (seriousnessMin !== undefined || seriousnessMax !== undefined) {
      const minScore = seriousnessMin ? Number(seriousnessMin) : 1;
      const maxScore = seriousnessMax ? Number(seriousnessMax) : 10;
      articles = articles.filter(a => 
        a.seriousnessScore >= minScore && a.seriousnessScore <= maxScore
      );
    }
    
    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single article by ID
app.get('/api/articles/:id', async (req, res) => {
  try {
    const article = await articlesDB.getById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark article as read/unread
app.patch('/api/articles/:id/read', async (req, res) => {
  try {
    const { isRead = true } = req.body;
    await articlesDB.markAsRead(req.params.id, isRead);
    res.json({ status: 'updated', id: req.params.id, isRead });
  } catch (error) {
    console.error('Error updating article read status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark article as favorite/unfavorite
app.patch('/api/articles/:id/favorite', async (req, res) => {
  try {
    const { isFavorite = true } = req.body;
    await articlesDB.markAsFavorite(req.params.id, isFavorite);
    res.json({ status: 'updated', id: req.params.id, isFavorite });
  } catch (error) {
    console.error('Error updating article favorite status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Archive/unarchive article
app.patch('/api/articles/:id/archive', async (req, res) => {
  try {
    const { isArchived = true } = req.body;
    await articlesDB.archive(req.params.id, isArchived);
    res.json({ status: 'updated', id: req.params.id, isArchived });
  } catch (error) {
    console.error('Error updating article archive status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete article
app.delete('/api/articles/:id', async (req, res) => {
  try {
    await articlesDB.delete(req.params.id);
    res.json({ status: 'deleted', id: req.params.id });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// USER PREFERENCES API (for cross-device consistency)
// =============================================================================

// Get user preferences
app.get('/api/preferences', async (req, res) => {
  try {
    const preferences = await userPreferencesDB.get();
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user preferences
app.put('/api/preferences', async (req, res) => {
  try {
    const updates = req.body;
    await userPreferencesDB.update(updates);
    const updatedPreferences = await userPreferencesDB.get();
    res.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// CONFIGURATION API (Legacy compatibility)
// =============================================================================

// Get complete configuration (feeds + topics)
app.get('/api/config', async (req, res) => {
  try {
    const feeds = await feedsDB.getAll();
    const topics = await topicsDB.getAll();
    res.json({ feeds, topics });
  } catch (error) {
    console.error('Error fetching configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update complete configuration (legacy endpoint)
app.post('/api/config', async (req, res) => {
  try {
    const { feeds = [], topics = [] } = req.body;

    // ---------------------------------------------------------------------
    // FEEDS – Upsert logic (create or update). Feeds that are not included
    // in the incoming payload will simply be disabled instead of being
    // deleted. This avoids foreign-key constraint issues with the articles
    // table, while still allowing users to "remove" a feed.
    // ---------------------------------------------------------------------
    const existingFeeds = await feedsDB.getAll();
    const existingFeedMap = new Map(existingFeeds.map(f => [f.id, f]));
    // Additional map keyed by URL to detect duplicates independent of ID (URL is UNIQUE)
    const existingFeedByUrl = new Map(existingFeeds.map(f => [f.url, f]));

    // Track incoming feed IDs for later disabling of missing feeds
    const incomingFeedIds = new Set();

    for (const feed of feeds) {
      // Ensure there is always an ID present
      const id = feed.id || uuidv4();
      incomingFeedIds.add(id);

      if (existingFeedMap.has(id)) {
        // The feed already exists by ID – simple update
        await feedsDB.update(id, {
          name: feed.name,
          url: feed.url,
          language: feed.language || 'de',
          enabled: feed.enabled !== false
        });
      } else if (existingFeedByUrl.has(feed.url)) {
        // Same URL already exists but with a different ID (e.g., user duplicated a feed).
        // We merge the incoming data into the existing row instead of creating a new one
        const duplicate = existingFeedByUrl.get(feed.url);
        incomingFeedIds.add(duplicate.id);

        await feedsDB.update(duplicate.id, {
          name: feed.name || duplicate.name,
          language: feed.language || duplicate.language || 'de',
          enabled: feed.enabled !== false
        });
      } else {
        // Completely new feed – create it
        await feedsDB.create({
          id,
          name: feed.name,
          url: feed.url,
          language: feed.language || 'de',
          enabled: feed.enabled !== false
        });
      }
    }

    // Disable feeds that were removed from the configuration instead of
    // deleting them outright (prevents FK violations).
    for (const feed of existingFeeds) {
      if (!incomingFeedIds.has(feed.id) && feed.enabled !== false) {
        await feedsDB.update(feed.id, { enabled: false });
      }
    }

    // ---------------------------------------------------------------------
    // TOPICS – Upsert logic similar to feeds. No FK constraints exist at the
    // moment, but we keep the same non-destructive behaviour for safety.
    // ---------------------------------------------------------------------
    const existingTopics = await topicsDB.getAll();
    const existingTopicMap = new Map(existingTopics.map(t => [t.id, t]));
    const existingTopicByName = new Map(existingTopics.map(t => [t.name, t]));

    const incomingTopicIds = new Set();

    for (const topic of topics) {
      const id = topic.id || uuidv4();
      incomingTopicIds.add(id);

      const processed = {
        name: topic.name,
        keywords: topic.keywords || [],
        excludeKeywords: topic.excludeKeywords || [],
        enabled: topic.enabled !== false,
        priority: topic.priority || 1
      };

      if (existingTopicMap.has(id)) {
        // Same ID – regular update
        await topicsDB.update(id, processed);
      } else if (existingTopicByName.has(topic.name)) {
        // Duplicate name with different ID, merge instead of failing on UNIQUE constraint
        const duplicate = existingTopicByName.get(topic.name);
        incomingTopicIds.add(duplicate.id);
        await topicsDB.update(duplicate.id, processed);
      } else {
        await topicsDB.create({ id, ...processed });
      }
    }

    // Disable (rather than delete) topics that are no longer present
    // Future work: decide whether to delete or keep historical topics.
    for (const topic of existingTopics) {
      if (!incomingTopicIds.has(topic.id) && topic.enabled !== false) {
        await topicsDB.update(topic.id, { enabled: false });
      }
    }

    res.json({
      status: 'configuration updated',
      feedsCount: feeds.length,
      topicsCount: topics.length
    });
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// FEED PROCESSING API
// =============================================================================

// Manual trigger for feed processing
app.post('/api/parse', async (req, res) => {
  try {
    console.log('Manual feed processing triggered');
    // Don't await - let it run in background
    processAllFeeds().catch(console.error);
    res.json({ status: 'processing started', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error starting feed processing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process specific feed by URL
app.post('/api/parse/feed', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const result = await processFeedByUrl(url);
    res.json(result);
  } catch (error) {
    console.error('Error processing feed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get feed processing health status
app.get('/api/processing/health', async (req, res) => {
  try {
    const health = await getProcessingHealth();
    res.json(health);
  } catch (error) {
    console.error('Error getting processing health:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// SYSTEM MAINTENANCE API
// =============================================================================

// Cleanup old articles
app.post('/api/maintenance/cleanup', async (req, res) => {
  try {
    await dbUtils.cleanup();
    res.json({ status: 'cleanup completed', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get system statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await dbUtils.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  // Skip API routes - they should return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'Endpoint not found',
      method: req.method,
      path: req.originalUrl,
      availableEndpoints: [
        'GET /api/health',
        'GET /api/feeds',
        'POST /api/feeds',
        'GET /api/topics',
        'POST /api/topics',
        'GET /api/articles',
        'GET /api/preferences',
        'PUT /api/preferences',
        'POST /api/parse',
        'GET /api/stats'
      ]
    });
  }
  
  // For all other routes, serve React app
  res.sendFile(path.join(__dirname, '../intellinews/build/index.html'));
});

// 404 handler for non-GET requests to API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    method: req.method,
    path: req.originalUrl,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/feeds',
      'POST /api/feeds',
      'GET /api/topics',
      'POST /api/topics',
      'GET /api/articles',
      'GET /api/preferences',
      'PUT /api/preferences',
      'POST /api/parse',
      'GET /api/stats'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

// Start periodic processing every 5 minutes
setInterval(() => {
  console.log('Starting scheduled feed processing...');
  processAllFeeds().catch(console.error);
}, 5 * 60 * 1000);

// Start cleanup every 24 hours
setInterval(() => {
  console.log('Starting scheduled cleanup...');
  dbUtils.cleanup().catch(console.error);
}, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`IntelliNews Backend v1.1 listening on port ${PORT}`);
  console.log(`AI Provider: ${AI_PROVIDER}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Available endpoints:');
  console.log('  GET /api/health - System health check');
  console.log('  GET /api/feeds - List all feeds');
  console.log('  POST /api/feeds - Create new feed');
  console.log('  GET /api/topics - List all topics');
  console.log('  POST /api/topics - Create new topic');
  console.log('  GET /api/articles - List articles with filtering');
  console.log('  GET /api/preferences - Get user preferences');
  console.log('  PUT /api/preferences - Update user preferences');
  console.log('  POST /api/parse - Trigger manual feed processing');
  console.log('  GET /api/stats - Get system statistics');
  
  // Initial feed processing
  setTimeout(() => {
    console.log('Starting initial feed processing...');
    processAllFeeds().catch(console.error);
  }, 5000);
});