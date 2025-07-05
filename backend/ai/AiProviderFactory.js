import { MockAiProvider } from './MockAiProvider.js';
import { GeminiAiProvider } from './GeminiAiProvider.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Factory for creating AI providers based on configuration
 */
export class AiProviderFactory {
  static async createProvider() {
    const providerType = process.env.AI_PROVIDER || 'mock';
    const prompts = await this._loadPrompts();

    switch (providerType.toLowerCase()) {
      case 'gemini':
        return new GeminiAiProvider(process.env.GEMINI_API_KEY, prompts);
      
      case 'mock':
      default:
        return new MockAiProvider();
    }
  }

  static async _loadPrompts() {
    try {
      const configPath = path.join(__dirname, '../config/prompts.json');
      const promptsData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(promptsData);
    } catch (error) {
      console.error('Failed to load prompts configuration:', error);
      return this._getDefaultPrompts();
    }
  }

  static _getDefaultPrompts() {
    return {
      translate: `Translate the following text from {sourceLang} to German. Return only the translated text, no additional comments or explanations:

{text}`,

      summarize: `Summarize the following article in {language}. Keep the summary concise (max 3 sentences) and in the same language as the original:

{content}`,

      rateSeriousness: `Rate the seriousness of this article on a scale of 1-10, where 1 is entertainment/gossip and 10 is serious news (politics, economics, disasters, etc.). Return only the number.

Title: {title}
Content: {content}`,

      generateImagePrompt: `Generate a descriptive prompt for an image that would represent this article. The prompt should be suitable for an AI image generator and describe the visual elements that would best represent the content:

Title: {title}
Summary: {summary}`
    };
  }

  static getSupportedProviders() {
    return ['mock', 'gemini'];
  }
}