/**
 * Abstract interface for AI providers
 * Defines the contract that all AI providers must implement
 */
export class IAiProvider {
  /**
   * Translate text from one language to another
   * @param {string} text - Text to translate
   * @param {string} fromLang - Source language (de, en, other)
   * @param {string} toLang - Target language (de, en, other)
   * @returns {Promise<string>} Translated text
   */
  async translate(text, fromLang, toLang) {
    throw new Error('translate method must be implemented');
  }

  /**
   * Evaluate the seriousness of an article
   * @param {Object} article - Article object
   * @returns {Promise<number>} Seriousness score (1-10)
   */
  async evaluateSeriousness(article) {
    throw new Error('evaluateSeriousness method must be implemented');
  }

  /**
   * Generate an image for an article
   * @param {string} prompt - Description/title for image generation
   * @returns {Promise<string>} Image URL
   */
  async generateImage(prompt) {
    throw new Error('generateImage method must be implemented');
  }

  /**
   * Get the provider name
   * @returns {string} Provider name
   */
  getName() {
    throw new Error('getName method must be implemented');
  }
}