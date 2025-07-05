import { IAiProvider } from './IAiProvider.js';
import fs from 'fs/promises';

/**
 * OpenAI AI provider
 */
export class OpenAiProvider extends IAiProvider {
  constructor() {
    super();
    this.name = 'openai';
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.imageApiUrl = 'https://api.openai.com/v1/images/generations';
    this.prompts = null;
  }

  /**
   * Load prompts from configuration file
   */
  async loadPrompts() {
    if (!this.prompts) {
      try {
        const data = await fs.readFile('config/prompts.json', 'utf8');
        this.prompts = JSON.parse(data);
      } catch (error) {
        console.warn('Could not load prompts.json, using defaults');
        this.prompts = {
          translation: "Übersetze den folgenden Text von {fromLang} nach {toLang}. Gib nur die Übersetzung zurück, ohne zusätzliche Erklärungen:\n\n{text}",
          seriousness: "Bewerte die Seriosität des folgenden Nachrichtenartikels auf einer Skala von 1-10, wobei 1 = sehr unseriös/sensationalistisch und 10 = sehr seriös/sachlich ist. Berücksichtige Faktoren wie Objektivität, Quellenangaben, Sachlichkeit und journalistische Qualität. Gib nur die Zahl zurück.\n\nTitel: {title}\nZusammenfassung: {summary}",
          imageGeneration: "Create a professional, news-appropriate image for an article with the title: {title}"
        };
      }
    }
    return this.prompts;
  }

  /**
   * Make API call to OpenAI Chat API
   */
  async callOpenAiApi(prompt, model = 'gpt-3.5-turbo') {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    return data.choices[0].message.content;
  }

  /**
   * Generate image using DALL-E
   */
  async callOpenAiImageApi(prompt) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch(this.imageApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural'
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI Image API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      throw new Error('Invalid response from OpenAI Image API');
    }

    return data.data[0].url;
  }

  /**
   * Translate text using OpenAI
   */
  async translate(text, fromLang, toLang) {
    if (fromLang === toLang) {
      return text;
    }

    const prompts = await this.loadPrompts();
    const prompt = prompts.translation
      .replace('{fromLang}', fromLang)
      .replace('{toLang}', toLang)
      .replace('{text}', text);

    return await this.callOpenAiApi(prompt);
  }

  /**
   * Evaluate seriousness using OpenAI
   */
  async evaluateSeriousness(article) {
    const prompts = await this.loadPrompts();
    const title = article.translatedTitle || article.originalTitle;
    const summary = article.translatedSummary || article.originalSummary;
    
    const prompt = prompts.seriousness
      .replace('{title}', title)
      .replace('{summary}', summary);

    const response = await this.callOpenAiApi(prompt);
    
    // Extract number from response
    const match = response.match(/\d+/);
    if (match) {
      const score = parseInt(match[0]);
      return Math.max(1, Math.min(10, score));
    }
    
    return 5; // Default fallback
  }

  /**
   * Generate image using DALL-E
   */
  async generateImage(prompt) {
    const prompts = await this.loadPrompts();
    const imagePrompt = prompts.imageGeneration.replace('{title}', prompt);
    
    return await this.callOpenAiImageApi(imagePrompt);
  }

  /**
   * Get provider name
   */
  getName() {
    return this.name;
  }
}