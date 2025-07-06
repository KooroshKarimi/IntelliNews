import { MockAiProvider } from './MockAiProvider.js';
import { GeminiAiProvider } from './GeminiAiProvider.js';
import { OpenAiProvider } from './OpenAiProvider.js';

/**
 * Factory class for creating AI providers
 */
export class AiProviderFactory {
  /**
   * Create an AI provider instance based on the provider name
   * @param {string} providerName - Name of the AI provider (mock, gemini, openai)
   * @returns {IAiProvider} AI provider instance
   */
  static createProvider(providerName) {
    switch (providerName?.toLowerCase()) {
      case 'gemini':
        return new GeminiAiProvider();
      case 'openai':
        return new OpenAiProvider();
      case 'mock':
      default:
        return new MockAiProvider();
    }
  }

  /**
   * Get list of available providers
   * @returns {string[]} List of available provider names
   */
  static getAvailableProviders() {
    return ['mock', 'gemini', 'openai'];
  }
}