import { Article, Feed, Topic } from '../types';

// Use CORS proxy for RSS feeds
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

// Parse RSS feed XML into articles
export async function parseFeed(feed: Feed): Promise<Article[]> {
  try {
    // Use CORS proxy to fetch the feed
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(feed.url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }
    
    const data = await response.json();
    const text = data.contents || '';
    
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    
    // Check for parsing errors
    const parserError = xml.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid RSS feed format');
    }
    
    const items = xml.querySelectorAll('item');
    const articles: Article[] = [];
    
    items.forEach((item) => {
      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const description = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      
      // Extract image from content or enclosure
      let imageUrl: string | undefined;
      const enclosure = item.querySelector('enclosure');
      if (enclosure && enclosure.getAttribute('type')?.startsWith('image/')) {
        imageUrl = enclosure.getAttribute('url') || undefined;
      }
      
      // Try to find image in content
      if (!imageUrl) {
        const content = item.querySelector('content\\:encoded, content')?.textContent || '';
        const imgMatch = content.match(/<img[^>]+src="([^"]+)"/);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        }
      }
      
      articles.push({
        id: link,
        link,
        originalTitle: title,
        originalSummary: description,
        sourceFeedName: feed.name,
        publicationDate: new Date(pubDate).toISOString(),
        processedDate: new Date().toISOString(),
        topics: [],
        aiEnhanced: false,
        imageUrl
      });
    });
    
    return articles;
  } catch (error) {
    console.error(`Error parsing feed ${feed.name}:`, error);
    throw error;
  }
}

// Calculate Jaccard similarity between two strings
export function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
  const union = new Set([...Array.from(set1), ...Array.from(set2)]);
  
  return intersection.size / union.size;
}

// Check if two articles are duplicates (Jaccard similarity > 0.9)
export function isDuplicate(article1: Article, article2: Article): boolean {
  const text1 = `${article1.originalTitle} ${article1.originalSummary}`;
  const text2 = `${article2.originalTitle} ${article2.originalSummary}`;
  
  return jaccardSimilarity(text1, text2) > 0.9;
}

// Filter out duplicate articles
export function removeDuplicates(articles: Article[]): Article[] {
  const uniqueArticles: Article[] = [];
  
  for (const article of articles) {
    const isDupe = uniqueArticles.some(existing => isDuplicate(article, existing));
    if (!isDupe) {
      uniqueArticles.push(article);
    }
  }
  
  return uniqueArticles;
}

// Match articles with topics based on keywords
export function matchTopics(article: Article, topics: Topic[]): string[] {
  const text = `${article.originalTitle} ${article.originalSummary}`.toLowerCase();
  const matchedTopics: string[] = [];
  
  for (const topic of topics) {
    // Check if any keyword matches
    const hasKeyword = topic.keywords.some((keyword: string) => 
      text.includes(keyword.toLowerCase())
    );
    
    // Check if any exclude keyword matches
    const hasExcludeKeyword = topic.excludeKeywords?.some((keyword: string) => 
      text.includes(keyword.toLowerCase())
    ) || false;
    
    if (hasKeyword && !hasExcludeKeyword) {
      matchedTopics.push(topic.name);
    }
  }
  
  return matchedTopics;
}