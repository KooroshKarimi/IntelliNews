import { Article, Feed, Topic } from '../types';

// Backend endpoint
const API_PREFIX = '/api/feed?url=';

// Parse RSS feed via backend route
export async function parseFeed(feed: Feed): Promise<Article[]> {
  try {
    const res = await fetch(`${API_PREFIX}${encodeURIComponent(feed.url)}`);
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);

    const items: any[] = await res.json();

    const articles: Article[] = items.map((item) => {
      // Try to get image from enclosure or description
      let imageUrl: string | undefined;
      if (item.enclosure && item.enclosure.type?.startsWith('image/')) {
        imageUrl = item.enclosure.url;
      }
      if (!imageUrl && item.description) {
        const match = item.description.match(/<img[^>]+src="([^"]+)"/);
        if (match) imageUrl = match[1];
      }

      return {
        id: item.link,
        link: item.link,
        originalTitle: item.title,
        originalSummary: item.description || '',
        originalLanguage: feed.language,
        sourceFeedName: feed.name,
        publicationDate: new Date(item.pubDate || Date.now()).toISOString(),
        processedDate: new Date().toISOString(),
        topics: [],
        aiEnhanced: false,
        imageUrl,
      };
    });

    return articles;
  } catch (err) {
    console.error(`Error fetching feed ${feed.name}:`, err);
    throw err;
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