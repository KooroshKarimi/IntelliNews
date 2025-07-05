import { AiProviderFactory } from '../ai/AiProviderFactory.js';

/**
 * AI Service that provides a unified interface for AI operations
 * Manages the AI provider and handles errors gracefully
 */
export class AiService {
  constructor() {
    this.provider = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      this.provider = await AiProviderFactory.createProvider();
      this.isInitialized = true;
      
      const isAvailable = await this.provider.isAvailable();
      if (!isAvailable) {
        console.warn('AI provider is not available, some features may not work');
      }
      
      console.log(`AI Service initialized with provider: ${this.provider.constructor.name}`);
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      // Fallback to mock provider
      this.provider = new (await import('../ai/MockAiProvider.js')).MockAiProvider();
      this.isInitialized = true;
    }
  }

  async enhanceArticle(article) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const enhanced = { ...article };
    
    try {
      // Determine article language
      const language = this._detectLanguage(article.originalContent || article.originalTitle);
      
      // Translation (if not German)
      if (language !== 'de') {
        try {
          enhanced.translatedTitle = await this.provider.translate(article.originalTitle, language);
          if (article.originalSummary) {
            enhanced.translatedSummary = await this.provider.translate(article.originalSummary, language);
          }
        } catch (error) {
          console.error('Translation failed for article:', article.id, error);
        }
      }

      // Summarization (if content is long)
      if (article.originalContent && article.originalContent.length > 500) {
        try {
          enhanced.translatedSummary = enhanced.translatedSummary || 
            await this.provider.summarize(article.originalContent, language);
        } catch (error) {
          console.error('Summarization failed for article:', article.id, error);
        }
      }

      // Seriousness rating
      try {
        enhanced.seriousnessScore = await this.provider.rateSeriousness(
          article.originalTitle,
          article.originalContent || article.originalSummary || '',
          language
        );
      } catch (error) {
        console.error('Seriousness rating failed for article:', article.id, error);
      }

      // Image generation (if no image from feed)
      if (!enhanced.imageUrl) {
        try {
          enhanced.imageUrl = await this.provider.generateImage(
            enhanced.translatedTitle || article.originalTitle,
            enhanced.translatedSummary || article.originalSummary || '',
            language
          );
          enhanced.imageGenerated = true;
        } catch (error) {
          console.error('Image generation failed for article:', article.id, error);
        }
      }

      enhanced.aiEnhanced = true;
      enhanced.processedDate = new Date().toISOString();

    } catch (error) {
      console.error('Article enhancement failed:', error);
      enhanced.aiEnhanced = false;
    }

    return enhanced;
  }

  async getProviderInfo() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return {
      name: this.provider.constructor.name,
      available: await this.provider.isAvailable(),
      supportedProviders: AiProviderFactory.getSupportedProviders(),
      currentProvider: process.env.AI_PROVIDER || 'mock'
    };
  }

  // Private methods
  _detectLanguage(text) {
    if (!text) return 'other';
    
    // Simple language detection based on common words
    const germanWords = ['der', 'die', 'das', 'und', 'ist', 'von', 'mit', 'auf', 'für', 'zu', 'im', 'am', 'ein', 'eine', 'auch', 'sich', 'oder', 'nach', 'bei', 'aus'];
    const englishWords = ['the', 'and', 'is', 'of', 'with', 'on', 'for', 'to', 'in', 'at', 'a', 'an', 'also', 'or', 'after', 'by', 'from'];
    
    const words = text.toLowerCase().split(/\s+/);
    let germanCount = 0;
    let englishCount = 0;
    
    words.forEach(word => {
      if (germanWords.includes(word)) germanCount++;
      if (englishWords.includes(word)) englishCount++;
    });
    
    if (germanCount > englishCount) return 'de';
    if (englishCount > germanCount) return 'en';
    return 'other';
  }
}