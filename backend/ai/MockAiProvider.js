import { IAiProvider } from './IAiProvider.js';

/**
 * Mock AI Provider for testing and development
 * Provides predictable responses without external API calls
 */
export class MockAiProvider extends IAiProvider {
  constructor() {
    super();
    this.delay = 100; // Simulate network delay
  }

  async translate(text, sourceLang) {
    await this._simulateDelay();
    
    if (sourceLang === 'de') {
      return text; // Already German
    }
    
    // Simple mock translation
    return `[ÜBERSETZT] ${text}`;
  }

  async summarize(content, language) {
    await this._simulateDelay();
    
    const words = content.split(' ').slice(0, 30); // Take first 30 words
    return `[ZUSAMMENFASSUNG] ${words.join(' ')}...`;
  }

  async rateSeriousness(title, content, language) {
    await this._simulateDelay();
    
    // Mock scoring based on word count and certain keywords
    const seriousWords = ['politik', 'wirtschaft', 'krieg', 'politik', 'government', 'war', 'economy'];
    const text = (title + ' ' + content).toLowerCase();
    
    let score = 5; // Base score
    
    // Check for serious keywords
    seriousWords.forEach(word => {
      if (text.includes(word)) {
        score += 1;
      }
    });
    
    // Add randomness
    score += Math.floor(Math.random() * 3) - 1;
    
    return Math.max(1, Math.min(10, score));
  }

  async generateImage(title, summary, language) {
    await this._simulateDelay();
    
    // Return a placeholder image service URL
    const seed = this._hashString(title + summary);
    return `https://picsum.photos/400/300?random=${seed}`;
  }

  async isAvailable() {
    return true; // Mock provider is always available
  }

  // Helper methods
  async _simulateDelay() {
    return new Promise(resolve => setTimeout(resolve, this.delay));
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}