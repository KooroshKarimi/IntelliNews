import { IAiProvider } from './IAiProvider.js';
import fs from 'fs/promises';

/**
 * Google Gemini AI provider
 */
export class GeminiAiProvider extends IAiProvider {
  constructor() {
    super();
    this.name = 'gemini';
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
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
          imageGeneration: "Generiere eine Bildbeschreibung für einen Nachrichtenartikel mit folgendem Titel: {title}. Die Beschreibung sollte sachlich, informativ und visuell ansprechend sein."
        };
      }
    }
    return this.prompts;
  }

  /**
   * Make API call to Gemini
   */
  async callGeminiApi(prompt) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
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

  /**
   * Translate text using Gemini
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

    return await this.callGeminiApi(prompt);
  }

  /**
   * Evaluate seriousness using Gemini
   */
  async evaluateSeriousness(article) {
    const prompts = await this.loadPrompts();
    const title = article.translatedTitle || article.originalTitle;
    const summary = article.translatedSummary || article.originalSummary;
    
    const prompt = prompts.seriousness
      .replace('{title}', title)
      .replace('{summary}', summary);

    const response = await this.callGeminiApi(prompt);
    
    // Extract number from response
    const match = response.match(/\d+/);
    if (match) {
      const score = parseInt(match[0]);
      return Math.max(1, Math.min(10, score));
    }
    
    return 5; // Default fallback
  }

  /**
   * Generate image using Gemini (text description only)
   * Note: Gemini doesn't generate images directly, so we return a description
   */
  async generateImage(prompt) {
    const prompts = await this.loadPrompts();
    const imagePrompt = prompts.imageGeneration.replace('{title}', prompt);
    
    const description = await this.callGeminiApi(imagePrompt);
    
    // For now, return a placeholder with the description
    // In a real implementation, you would use the description with an image generation service
    const encodedDescription = encodeURIComponent(description.substring(0, 100));
    return `https://via.placeholder.com/400x300/2563eb/ffffff?text=${encodedDescription}`;
  }

  /**
   * Get provider name
   */
  getName() {
    return this.name;
  }
}