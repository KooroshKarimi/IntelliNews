/**
 * Generic AI Provider Interface
 * Defines the contract for all AI provider implementations
 */
export class IAiProvider {
  /**
   * Translate text to German
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language ('en', 'de', 'other')
   * @returns {Promise<string>} - Translated text
   */
  async translate(text, sourceLang) {
    throw new Error('translate method must be implemented');
  }

  /**
   * Summarize an article
   * @param {string} content - Article content
   * @param {string} language - Content language
   * @returns {Promise<string>} - Summary
   */
  async summarize(content, language) {
    throw new Error('summarize method must be implemented');
  }

  /**
   * Rate the seriousness of an article
   * @param {string} title - Article title
   * @param {string} content - Article content
   * @param {string} language - Content language
   * @returns {Promise<number>} - Seriousness score (1-10)
   */
  async rateSeriousness(title, content, language) {
    throw new Error('rateSeriousness method must be implemented');
  }

  /**
   * Generate an image URL for an article
   * @param {string} title - Article title
   * @param {string} summary - Article summary
   * @param {string} language - Content language
   * @returns {Promise<string>} - Generated image URL
   */
  async generateImage(title, summary, language) {
    throw new Error('generateImage method must be implemented');
  }

  /**
   * Check if the provider is available/configured
   * @returns {Promise<boolean>} - True if provider is ready
   */
  async isAvailable() {
    throw new Error('isAvailable method must be implemented');
  }
}