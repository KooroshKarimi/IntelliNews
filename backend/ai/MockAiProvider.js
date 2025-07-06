import { IAiProvider } from './IAiProvider.js';

/**
 * Mock AI provider for testing and development
 */
export class MockAiProvider extends IAiProvider {
  constructor() {
    super();
    this.name = 'mock';
  }

  /**
   * Mock translation - returns original text with a prefix
   */
  async translate(text, fromLang, toLang) {
    // Simple mock translation - just add prefix
    if (fromLang === toLang) {
      return text;
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return `[Mock Translation from ${fromLang} to ${toLang}] ${text}`;
  }

  /**
   * Mock seriousness evaluation - returns random score
   */
  async evaluateSeriousness(article) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Simple heuristic based on title length and content
    const title = article.translatedTitle || article.originalTitle;
    const summary = article.translatedSummary || article.originalSummary;
    
    let score = 5; // Base score
    
    // Adjust based on title characteristics
    if (title.includes('!')) score -= 1;
    if (title.toUpperCase() === title) score -= 2;
    if (title.length > 50) score += 1;
    
    // Adjust based on summary characteristics
    if (summary.length > 200) score += 1;
    if (summary.includes('Studie') || summary.includes('Forschung')) score += 1;
    if (summary.includes('Experte') || summary.includes('Professor')) score += 1;
    
    // Clamp between 1 and 10
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Mock image generation - returns a placeholder image
   */
  async generateImage(prompt) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Return placeholder image based on prompt
    const width = 400;
    const height = 300;
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 50));
    
    return `https://via.placeholder.com/${width}x${height}/2563eb/ffffff?text=${encodedPrompt}`;
  }

  /**
   * Get provider name
   */
  getName() {
    return this.name;
  }
}