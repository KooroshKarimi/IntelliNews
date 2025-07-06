/**
 * Calculate Jaccard similarity between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
export function jaccardSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
  const union = new Set([...Array.from(set1), ...Array.from(set2)]);
  
  if (union.size === 0) return 0;
  
  return intersection.size / union.size;
}

/**
 * Check if two articles are duplicates based on Jaccard similarity
 * @param {Object} article1 - First article
 * @param {Object} article2 - Second article
 * @param {number} threshold - Similarity threshold (default: 0.9)
 * @returns {boolean} True if articles are duplicates
 */
export function isDuplicate(article1, article2, threshold = 0.9) {
  const text1 = `${article1.originalTitle} ${article1.originalSummary}`;
  const text2 = `${article2.originalTitle} ${article2.originalSummary}`;
  
  return jaccardSimilarity(text1, text2) > threshold;
}

/**
 * Remove duplicate articles from an array
 * @param {Array} articles - Array of articles
 * @param {number} threshold - Similarity threshold (default: 0.9)
 * @returns {Array} Array of unique articles
 */
export function removeDuplicates(articles, threshold = 0.9) {
  const uniqueArticles = [];
  
  for (const article of articles) {
    const isDupe = uniqueArticles.some(existing => 
      isDuplicate(article, existing, threshold)
    );
    
    if (!isDupe) {
      uniqueArticles.push(article);
    }
  }
  
  return uniqueArticles;
}