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
  const items = await parser.parseURL(feed.url);
  for(const item of items.items){
    const id = item.link;
    const originalTitle = item.title || '';
    const originalSummary = item.contentSnippet || item.content || '';
    const publicationDate = new Date(item.pubDate||Date.now()).toISOString();
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

    // derive topics (very naive for now)
    const topicNames = await new Promise((resolve)=>{
      db.all('SELECT * FROM topics', (err, rows)=>{
        if(err) return resolve([]);
        const matched=[];
        const text = (originalTitle+' '+originalSummary).toLowerCase();
        rows.forEach(t=>{
          const keywords = JSON.parse(t.keywords);
          const exclude = t.excludeKeywords ? JSON.parse(t.excludeKeywords):[];
          const has = keywords.some(k=>text.includes(k.toLowerCase()));
          const excl = exclude.some(k=>text.includes(k.toLowerCase()));
          if(has && !excl) matched.push(t.name);
        });
        resolve(matched);
      });
    });

    // insert or replace
    db.run(`INSERT OR REPLACE INTO articles(
      id, link, originalTitle, originalSummary, translatedTitle, translatedSummary,
      sourceFeedName, publicationDate, processedDate, topics, seriousnessScore,
      imageUrl, imageGenerated, aiEnhanced
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, item.link, originalTitle, originalSummary, translatedTitle, translatedSummary,
      feed.name, publicationDate, processedDate, JSON.stringify(topicNames), seriousnessScore,
      img.url, img.generated, 1]);
  }
}

async function processAllFeeds(){
  return new Promise((resolve)=>{
    db.all('SELECT * FROM feeds', async (err, rows)=>{
      if(err){console.error(err); return resolve();}
      for(const feed of rows){
        try{ await processSingleFeed(feed);}catch(e){console.error('feed failed', feed.name, e);}      }
      resolve();
    });
  });
}

module.exports = { processAllFeeds };