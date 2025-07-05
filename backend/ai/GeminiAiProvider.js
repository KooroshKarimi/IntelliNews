import { IAiProvider } from './IAiProvider.js';

/**
 * Google Gemini AI Provider
 * Uses Google's Gemini API for AI operations
 */
export class GeminiAiProvider extends IAiProvider {
  constructor(apiKey, prompts) {
    super();
    this.apiKey = apiKey;
    this.prompts = prompts;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-1.5-flash-latest';
  }

  async translate(text, sourceLang) {
    if (sourceLang === 'de') {
      return text; // Already German
    }

    const prompt = this.prompts.translate
      .replace('{sourceLang}', sourceLang)
      .replace('{text}', text);

    try {
      const response = await this._makeRequest(prompt);
      return response.trim();
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Return original text on failure
    }
  }

  async summarize(content, language) {
    const prompt = this.prompts.summarize
      .replace('{language}', language)
      .replace('{content}', content);

    try {
      const response = await this._makeRequest(prompt);
      return response.trim();
    } catch (error) {
      console.error('Summarization failed:', error);
      return content.substring(0, 200) + '...'; // Fallback to truncation
    }
  }

  async rateSeriousness(title, content, language) {
    const prompt = this.prompts.rateSeriousness
      .replace('{language}', language)
      .replace('{title}', title)
      .replace('{content}', content);

    try {
      const response = await this._makeRequest(prompt);
      const score = parseInt(response.trim());
      
      // Validate score is between 1-10
      if (isNaN(score) || score < 1 || score > 10) {
        return 5; // Default score
      }
      
      return score;
    } catch (error) {
      console.error('Seriousness rating failed:', error);
      return 5; // Default score
    }
  }

  async generateImage(title, summary, language) {
    // Note: Gemini doesn't generate images directly, 
    // but we could use it to generate better image prompts for other services
    const prompt = this.prompts.generateImagePrompt
      .replace('{language}', language)
      .replace('{title}', title)
      .replace('{summary}', summary);

    try {
      const imagePrompt = await this._makeRequest(prompt);
      // For now, return a placeholder URL with the generated prompt as seed
      const seed = this._hashString(imagePrompt);
      return `https://picsum.photos/400/300?random=${seed}`;
    } catch (error) {
      console.error('Image generation failed:', error);
      const seed = this._hashString(title + summary);
      return `https://picsum.photos/400/300?random=${seed}`;
    }
  }

  async isAvailable() {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Simple test request to check API availability
      const response = await this._makeRequest('Test', true);
      return true;
    } catch (error) {
      console.error('Gemini API not available:', error);
      return false;
    }
  }

  // Private methods
  async _makeRequest(prompt, isTest = false) {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: isTest ? 'Hello' : prompt
        }]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
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