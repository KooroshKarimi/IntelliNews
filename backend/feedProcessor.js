const Parser = require('rss-parser');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const { db } = require('./db');
const { v4: uuidv4 } = require('uuid');

const parser = new Parser();

// Simple translation via MyMemory as in frontend
async function translateText(text, sourceLang, targetLang = 'de') {
  if (!text || sourceLang === targetLang) return text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('translate failed');
    const data = await res.json();
    return data?.responseData?.translatedText || text;
  } catch {
    return text;
  }
}

function generateImageUrl(article){
  if(article.imageUrl) return {url: article.imageUrl, generated: 0};
  const query = encodeURIComponent(article.originalTitle.split(' ').slice(0,3).join(','));
  return {url: `https://source.unsplash.com/featured/?${query}`, generated:1};
}

function evaluateSeriousness(article){
  const len = `${article.originalTitle} ${article.originalSummary}`.length;
  return len>800?9:len>500?8:len>250?7:5;
}

async function processSingleFeed(feed){
  try {
    console.log(`📰 Processing feed: ${feed.name}`);
    const items = await parser.parseURL(feed.url);
    
    // Clear any previous errors for this feed
    const clearErrorSql = db.isPostgres 
      ? 'UPDATE feeds SET last_error = NULL, last_error_time = NULL WHERE id = $1'
      : 'UPDATE feeds SET last_error = NULL, last_error_time = NULL WHERE id = ?';
    await db.run(clearErrorSql, [feed.id]);
    
    for(const item of items.items){
      const id = item.link;
      const originalTitle = item.title || '';
      const originalSummary = item.contentSnippet || item.content || '';
      const originalContent = item.content || '';
      const publicationDate = new Date(item.pubDate || Date.now()).toISOString();
      const processedDate = new Date().toISOString();

      // translation
      const translatedTitle = await translateText(originalTitle, feed.language);
      const translatedSummary = await translateText(originalSummary, feed.language);

      // seriousness score
      const seriousnessScore = evaluateSeriousness({originalTitle, originalSummary});

      // image
      let imageUrl;
      if(item.enclosure && item.enclosure.type?.startsWith('image/')) imageUrl = item.enclosure.url;
      const img = generateImageUrl({imageUrl, originalTitle, originalSummary});

      // derive topics (case-insensitive keyword matching)
      const topicNames = await new Promise((resolve)=>{
        db.all('SELECT * FROM topics', (err, rows)=>{
          if(err) return resolve([]);
          const matched=[];
          const text = (originalTitle+' '+originalSummary).toLowerCase();
          rows.forEach(t=>{
            // Handle both PostgreSQL JSONB and SQLite TEXT formats
            let keywords, excludeKeywords;
            if (db.isPostgres) {
              keywords = Array.isArray(t.keywords) ? t.keywords : [];
              excludeKeywords = Array.isArray(t.exclude_keywords) ? t.exclude_keywords : [];
            } else {
              keywords = t.keywords ? JSON.parse(t.keywords) : [];
              excludeKeywords = t.excludeKeywords ? JSON.parse(t.excludeKeywords) : [];
            }
            
            const has = keywords.some(k=>text.includes(k.toLowerCase()));
            const excl = excludeKeywords.some(k=>text.includes(k.toLowerCase()));
            if(has && !excl) matched.push(t.name);
          });
          resolve(matched);
        });
      });

      // Insert or replace article with database-specific field names
      const insertSql = db.isPostgres ? `
        INSERT INTO articles(
          id, link, original_title, original_summary, original_content, 
          translated_title, translated_summary, source_feed_name, 
          publication_date, processed_date, topics, seriousness_score,
          image_url, image_generated, ai_enhanced
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (id) DO UPDATE SET
          original_title = EXCLUDED.original_title,
          original_summary = EXCLUDED.original_summary,
          original_content = EXCLUDED.original_content,
          translated_title = EXCLUDED.translated_title,
          translated_summary = EXCLUDED.translated_summary,
          processed_date = EXCLUDED.processed_date,
          topics = EXCLUDED.topics,
          seriousness_score = EXCLUDED.seriousness_score,
          image_url = EXCLUDED.image_url,
          image_generated = EXCLUDED.image_generated,
          ai_enhanced = EXCLUDED.ai_enhanced
      ` : `
        INSERT OR REPLACE INTO articles(
          id, link, originalTitle, originalSummary, originalContent,
          translatedTitle, translatedSummary, sourceFeedName, 
          publicationDate, processedDate, topics, seriousnessScore,
          imageUrl, imageGenerated, aiEnhanced
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `;

      const topicsJson = db.isPostgres ? JSON.stringify(topicNames) : JSON.stringify(topicNames);
      
      await db.run(insertSql, [
        id, item.link, originalTitle, originalSummary, originalContent,
        translatedTitle, translatedSummary, feed.name, 
        publicationDate, processedDate, topicsJson, seriousnessScore,
        img.url, img.generated, 1
      ]);
    }
    
    console.log(`✅ Successfully processed ${items.items.length} articles from ${feed.name}`);
    
  } catch (error) {
    console.error(`❌ Failed to process feed ${feed.name}:`, error.message);
    
    // Record the error in the database
    const errorSql = db.isPostgres 
      ? 'UPDATE feeds SET last_error = $1, last_error_time = $2 WHERE id = $3'
      : 'UPDATE feeds SET last_error = ?, last_error_time = ? WHERE id = ?';
    
    await db.run(errorSql, [
      error.message, 
      new Date().toISOString(), 
      feed.id
    ]);
  }
}

async function processAllFeeds(){
  console.log('🔄 Starting feed processing cycle...');
  
  return new Promise((resolve)=>{
    db.all('SELECT * FROM feeds', async (err, rows)=>{
      if(err){
        console.error('Database error loading feeds:', err); 
        return resolve();
      }
      
      if (!rows || rows.length === 0) {
        console.log('📝 No feeds configured to process');
        return resolve();
      }
      
      console.log(`📡 Processing ${rows.length} feeds...`);
      
      // Process feeds in parallel with concurrency limit
      const CONCURRENCY = 3;
      const batches = [];
      for (let i = 0; i < rows.length; i += CONCURRENCY) {
        batches.push(rows.slice(i, i + CONCURRENCY));
      }
      
      for (const batch of batches) {
        await Promise.all(
          batch.map(feed => processSingleFeed(feed))
        );
      }
      
      console.log('✅ Feed processing cycle completed');
      resolve();
    });
  });
}

module.exports = { processAllFeeds };