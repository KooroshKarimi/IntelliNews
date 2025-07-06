import { IAiProvider } from './IAiProvider.js';

/**
 * Mock AI provider for development and testing
 */
export class MockAiProvider extends IAiProvider {
  constructor() {
    super();
    this.translationCache = new Map();
  }

  /**
   * Mock translation - simple word replacement for demonstration
   */
  async translate(text, sourceLang, targetLang = 'de') {
    if (!text || sourceLang === targetLang) return text;
    
    // Simulate API delay
    await this.simulateDelay(200, 500);
    
    // Simple mock translation with basic word replacements
    const translations = {
      'en->de': {
        'news': 'Nachrichten',
        'politics': 'Politik',
        'economy': 'Wirtschaft',
        'technology': 'Technologie',
        'science': 'Wissenschaft',
        'sports': 'Sport',
        'health': 'Gesundheit',
        'culture': 'Kultur',
        'business': 'Geschäft',
        'world': 'Welt',
        'and': 'und',
        'the': 'der/die/das',
        'is': 'ist',
        'are': 'sind',
        'in': 'in',
        'on': 'auf',
        'with': 'mit'
      },
      'other->de': {
        'actualités': 'Nachrichten',
        'politique': 'Politik',
        'économie': 'Wirtschaft',
        'nouvelles': 'Nachrichten'
      }
    };

    const langPair = `${sourceLang}->de`;
    const wordMap = translations[langPair] || translations['en->de'];
    
    let translatedText = text;
    Object.entries(wordMap).forEach(([original, translated]) => {
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      translatedText = translatedText.replace(regex, translated);
    });
    
    return translatedText;
  }

  /**
   * Mock seriousness evaluation based on content characteristics
   */
  async evaluateSeriousness(article) {
    await this.simulateDelay(100, 300);
    
    const { originalTitle, originalSummary } = article;
    const content = `${originalTitle} ${originalSummary}`.toLowerCase();
    
    let score = 5; // baseline
    
    // Keywords indicating serious content
    const seriousKeywords = [
      'politik', 'wirtschaft', 'regierung', 'parliament', 'bundestag',
      'wissenschaft', 'forschung', 'studie', 'analyse', 'bericht',
      'crisis', 'krise', 'emergency', 'notfall', 'important', 'wichtig',
      'government', 'economy', 'science', 'research', 'study'
    ];
    
    // Keywords indicating less serious content
    const casualKeywords = [
      'celebrity', 'promi', 'star', 'gossip', 'klatsch', 'viral',
      'funny', 'lustig', 'entertainment', 'unterhaltung', 'meme',
      'social media', 'instagram', 'tiktok', 'twitter'
    ];
    
    // Count keyword matches
    const seriousMatches = seriousKeywords.filter(keyword => content.includes(keyword)).length;
    const casualMatches = casualKeywords.filter(keyword => content.includes(keyword)).length;
    
    // Adjust score based on keywords
    score += Math.min(seriousMatches * 0.5, 3);
    score -= Math.min(casualMatches * 0.5, 3);
    
    // Length bonus
    if (content.length > 1000) score += 1;
    else if (content.length > 500) score += 0.5;
    
    // Add some randomness for realism
    score += (Math.random() - 0.5) * 1;
    
    return Math.max(1, Math.min(10, Math.round(score)));
  }

  /**
   * Mock image generation using Unsplash with improved keyword extraction
   */
  async generateImage(article) {
    await this.simulateDelay(300, 800);
    
    const { title } = article;
    
    // Extract meaningful keywords from title
    const stopWords = ['der', 'die', 'das', 'und', 'oder', 'aber', 'in', 'auf', 'von', 'zu', 'mit', 'für', 'an', 'bei', 'nach', 'vor', 'über', 'unter', 'durch', 'gegen', 'ohne', 'um',
                      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after'];
    
    const keywords = title
      .toLowerCase()
      .split(/[^a-zA-ZäöüÄÖÜß]+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 3)
      .join(',');
    
    const query = keywords || 'news,technology,business';
    
    return {
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`,
      generated: true
    };
  }

  /**
   * Simulate API delay for realistic behavior
   */
  async simulateDelay(minMs = 100, maxMs = 500) {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}