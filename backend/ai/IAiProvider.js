/**
 * Simple interface for pluggable AI providers used by IntelliNews backend.
 * @interface IAiProvider
 */
class IAiProvider {
  /**
   * Translate a text from sourceLang to targetLang.
   * @param {string} text 
   * @param {string} sourceLang 'de' | 'en' | 'other'
   * @param {string} [targetLang='de']
   * @returns {Promise<string>}
   */
  translate(text, sourceLang, targetLang = 'de') {
    throw new Error('translate not implemented');
  }

  /**
   * Evaluate seriousness on scale 1-10.
   * @param {{ originalTitle: string, originalSummary: string }} article
   * @returns {Promise<number>}
   */
  evaluateSeriousness(article) {
    throw new Error('evaluateSeriousness not implemented');
  }

  /**
   * Generate representative image URL.
   * @param {{ title: string }} article
   * @returns {Promise<{ url: string; generated: boolean }>}
   */
  generateImage(article) {
    throw new Error('generateImage not implemented');
  }
}

module.exports = IAiProvider;