import Parser from 'rss-parser';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { feedsDB, articlesDB, topicsDB } from './db.js';
import { AiProviderFactory } from './ai/AiProviderFactory.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'IntelliNews/1.1 RSS Feed Reader'
  }
});

// Get AI provider from environment or default to mock
const AI_PROVIDER = process.env.AI_PROVIDER || 'mock';
const aiProvider = AiProviderFactory.createProvider(AI_PROVIDER);

// Simple translation fallback via MyMemory API
async function translateTextFallback(text, sourceLang, targetLang = 'de') {
  if (!text || sourceLang === targetLang || text.length > 500) return text;
  
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Translation API failed');
    
    const data = await res.json();
    return data?.responseData?.translatedText || text;
  } catch (error) {
    console.warn('Fallback translation failed:', error.message);
    return text;
  }
}

// Generate fallback image URL from Unsplash
function generateFallbackImageUrl(article) {
  if (article.imageUrl) return { url: article.imageUrl, generated: false };
  
  // Extract keywords from title for better image selection
  const keywords = article.originalTitle
    .split(' ')
    .slice(0, 3)
    .join(',')
    .replace(/[^a-zA-Z0-9,]/g, '');
  
  return {
    url: `https://source.unsplash.com/800x600/?${encodeURIComponent(keywords)}`,
    generated: true
  };
}

// Simple seriousness evaluation fallback
function evaluateSeriousnessFallback(article) {
  const content = `${article.originalTitle} ${article.originalSummary}`;
  const length = content.length;
  
  // Score based on content characteristics
  let score = 5; // baseline
  
  // Length indicates depth
  if (length > 1000) score += 2;
  else if (length > 500) score += 1;
  
  // Keywords that suggest serious content
  const seriousKeywords = ['politik', 'wirtschaft', 'wissenschaft', 'forschung', 'studie', 'politik', 'government', 'economy', 'science', 'research'];
  const contentLower = content.toLowerCase();
  const seriousMatches = seriousKeywords.filter(keyword => contentLower.includes(keyword)).length;
  score += Math.min(seriousMatches, 2);
  
  // Keywords that suggest less serious content
  const casualKeywords = ['promi', 'star', 'celebrity', 'gossip', 'scandal', 'viral'];
  const casualMatches = casualKeywords.filter(keyword => contentLower.includes(keyword)).length;
  score -= Math.min(casualMatches, 2);
  
  return Math.max(1, Math.min(10, score));
}

// Calculate Jaccard similarity for duplicate detection
function calculateJaccardSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Check if article is duplicate based on Jaccard similarity > 0.9
async function isDuplicate(newArticle) {
  try {
    const recentArticles = await articlesDB.getAll({ limit: 100 });
    
    for (const existingArticle of recentArticles) {
      const similarity = calculateJaccardSimilarity(
        newArticle.originalTitle + ' ' + newArticle.originalSummary,
        existingArticle.originalTitle + ' ' + existingArticle.originalSummary
      );
      
      if (similarity > 0.9) {
        console.log(`Duplicate detected: ${newArticle.originalTitle} (similarity: ${similarity})`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return false; // In case of error, proceed with article
  }
}

// Match article topics based on keywords
async function matchTopics(article) {
  try {
    const topics = await topicsDB.getAll();
    const matchedTopics = [];
    
    const articleText = `${article.originalTitle} ${article.originalSummary}`.toLowerCase();
    
    for (const topic of topics) {
      if (!topic.enabled) continue;
      
      const keywords = topic.keywords || [];
      const excludeKeywords = topic.excludeKeywords || [];
      
      // Check if any keyword matches
      const hasKeyword = keywords.some(keyword => 
        articleText.includes(keyword.toLowerCase())
      );
      
      // Check if any exclude keyword matches
      const hasExcludeKeyword = excludeKeywords.some(keyword => 
        articleText.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword && !hasExcludeKeyword) {
        matchedTopics.push(topic.name);
      }
    }
    
    return matchedTopics;
  } catch (error) {
    console.error('Error matching topics:', error);
    return [];
  }
}

// Process a single RSS feed
async function processSingleFeed(feed) {
  console.log(`Processing feed: ${feed.name} (${feed.url})`);
  
  let feedStatus = {
    feedId: feed.id,
    isHealthy: true,
    lastSuccessfulFetch: null,
    consecutiveFailures: 0,
    lastFailureReason: null,
    nextRetryTime: null
  };
  
  try {
    // Parse RSS feed
    const rssFeed = await parser.parseURL(feed.url);
    const now = new Date().toISOString();
    
    feedStatus.lastSuccessfulFetch = now;
    feedStatus.consecutiveFailures = 0;
    feedStatus.lastFailureReason = null;
    
    console.log(`Found ${rssFeed.items.length} items in feed: ${feed.name}`);
    
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const item of rssFeed.items) {
      try {
        // Basic article data
        const articleId = item.link || item.guid || uuidv4();
        const originalTitle = item.title || 'Untitled';
        const originalSummary = item.contentSnippet || item.summary || item.content || '';
        const originalContent = item.content || originalSummary;
        const publicationDate = new Date(item.pubDate || item.isoDate || Date.now()).toISOString();
        const processedDate = now;
        
        // Check for duplicates
        const article = {
          id: articleId,
          originalTitle,
          originalSummary,
          originalContent
        };
        
        if (await isDuplicate(article)) {
          skippedCount++;
          continue;
        }
        
        // Extract or generate image
        let imageUrl = null;
        let imageGenerated = false;
        
        // Try to extract image from RSS feed
        if (item.enclosure && item.enclosure.type?.startsWith('image/')) {
          imageUrl = item.enclosure.url;
        } else if (item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) {
          imageUrl = item['media:content']['$'].url;
        }
        
        // AI Enhancement with fallback
        let translatedTitle = originalTitle;
        let translatedSummary = originalSummary;
        let seriousnessScore = 5;
        let aiEnhanced = false;
        
        // Try AI translation
        if (feed.language !== 'de') {
          try {
            translatedTitle = await aiProvider.translate(originalTitle, feed.language, 'de');
            translatedSummary = await aiProvider.translate(originalSummary, feed.language, 'de');
            aiEnhanced = true;
          } catch (aiError) {
            console.warn(`AI translation failed for article: ${originalTitle}, using fallback`);
            try {
              translatedTitle = await translateTextFallback(originalTitle, feed.language, 'de');
              translatedSummary = await translateTextFallback(originalSummary, feed.language, 'de');
            } catch (fallbackError) {
              console.warn('Fallback translation also failed:', fallbackError.message);
            }
          }
        }
        
        // Try AI seriousness evaluation
        try {
          seriousnessScore = await aiProvider.evaluateSeriousness({ originalTitle, originalSummary });
          aiEnhanced = true;
        } catch (aiError) {
          console.warn(`AI seriousness evaluation failed for article: ${originalTitle}, using fallback`);
          seriousnessScore = evaluateSeriousnessFallback({ originalTitle, originalSummary });
        }
        
        // Try AI image generation if no image found
        if (!imageUrl) {
          try {
            const aiImage = await aiProvider.generateImage({ title: originalTitle });
            imageUrl = aiImage.url;
            imageGenerated = aiImage.generated;
            aiEnhanced = true;
          } catch (aiError) {
            console.warn(`AI image generation failed for article: ${originalTitle}, using fallback`);
            const fallbackImage = generateFallbackImageUrl({ originalTitle, imageUrl });
            imageUrl = fallbackImage.url;
            imageGenerated = fallbackImage.generated;
          }
        }
        
        // Match topics
        const matchedTopics = await matchTopics({
          originalTitle: translatedTitle || originalTitle,
          originalSummary: translatedSummary || originalSummary
        });
        
        // Create article object
        const newArticle = {
          id: articleId,
          link: item.link,
          originalTitle,
          originalSummary,
          originalContent,
          translatedTitle,
          translatedSummary,
          sourceFeedName: feed.name,
          sourceFeedId: feed.id,
          publicationDate,
          processedDate,
          topics: matchedTopics,
          seriousnessScore,
          imageUrl,
          imageGenerated,
          aiEnhanced,
          isRead: false,
          isFavorite: false,
          isArchived: false
        };
        
        // Save article to database
        await articlesDB.create(newArticle);
        processedCount++;
        
      } catch (articleError) {
        console.error(`Failed to process article from ${feed.name}:`, articleError.message);
        // Continue with next article
      }
    }
    
    console.log(`Feed processing completed: ${feed.name} - ${processedCount} processed, ${skippedCount} skipped`);
    
    // Update feed statistics
    await feedsDB.update(feed.id, {
      lastFetched: now,
      articleCount: processedCount
    });
    
  } catch (feedError) {
    console.error(`Failed to process feed ${feed.name}:`, feedError.message);
    
    // Update feed status with error
    const currentStatus = await feedsDB.getStatus(feed.id) || {};
    feedStatus = {
      ...feedStatus,
      isHealthy: false,
      consecutiveFailures: (currentStatus.consecutiveFailures || 0) + 1,
      lastFailureReason: feedError.message,
      nextRetryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() // Retry in 1 hour
    };
  }
  
  // Update feed status in database
  await feedsDB.updateStatus(feed.id, feedStatus);
}

// Process all enabled feeds
export async function processAllFeeds() {
  console.log('Starting feed processing cycle...');
  
  try {
    const feeds = await feedsDB.getAll();
    const enabledFeeds = feeds.filter(feed => feed.enabled !== false);
    
    console.log(`Processing ${enabledFeeds.length} enabled feeds`);
    
    // Process feeds sequentially to avoid overwhelming servers
    for (const feed of enabledFeeds) {
      try {
        await processSingleFeed(feed);
        
        // Small delay between feeds to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Critical error processing feed ${feed.name}:`, error);
        // Continue with next feed
      }
    }
    
    console.log('Feed processing cycle completed');
    
  } catch (error) {
    console.error('Failed to start feed processing cycle:', error);
  }
}

// Process a single feed by URL (for testing/manual triggers)
export async function processFeedByUrl(feedUrl) {
  try {
    const feed = await feedsDB.getAll();
    const targetFeed = feed.find(f => f.url === feedUrl);
    
    if (!targetFeed) {
      throw new Error(`Feed not found: ${feedUrl}`);
    }
    
    await processSingleFeed(targetFeed);
    return { success: true, message: 'Feed processed successfully' };
    
  } catch (error) {
    console.error(`Error processing feed by URL ${feedUrl}:`, error);
    return { success: false, error: error.message };
  }
}

// Health check for feed processing system
export async function getProcessingHealth() {
  try {
    const feeds = await feedsDB.getAllWithStatus();
    const totalFeeds = feeds.length;
    const healthyFeeds = feeds.filter(f => f.isHealthy !== false).length;
    const unhealthyFeeds = feeds.filter(f => f.isHealthy === false);
    
    return {
      totalFeeds,
      healthyFeeds,
      unhealthyFeeds: unhealthyFeeds.length,
      unhealthyFeedDetails: unhealthyFeeds.map(f => ({
        name: f.name,
        url: f.url,
        consecutiveFailures: f.consecutiveFailures,
        lastFailureReason: f.lastFailureReason,
        nextRetryTime: f.nextRetryTime
      })),
      aiProvider: AI_PROVIDER,
      lastProcessingTime: new Date().toISOString()
    };
  } catch (error) {
    return {
      error: error.message,
      aiProvider: AI_PROVIDER
    };
  }
}