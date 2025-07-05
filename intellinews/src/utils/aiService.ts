import { Article } from '../types';

// Simple translation service using public MyMemory API (free & rate-limited)
const TRANSLATE_API = 'https://api.mymemory.translated.net/get';

/**
 * Translate a given text from sourceLang to targetLang.
 * Falls back to original text if translation fails.
 */
export async function translateText(
  text: string,
  sourceLang: 'de' | 'en' | 'other',
  targetLang: 'de' | 'en' | 'other' = 'de'
): Promise<string> {
  // Skip translation when text is empty or languages are identical
  if (!text || sourceLang === targetLang) {
    return text;
  }

  try {
    const url = `${TRANSLATE_API}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Translation API returned ${res.status}`);
    }

    const data = await res.json();
    const translated = data?.responseData?.translatedText as string | undefined;

    return translated || text;
  } catch (err) {
    console.error('Translation failed', err);
    // Fallback: return original text to avoid blocking the UI
    return text;
  }
}

/**
 * Translate the title and summary of an article. Returns the translated strings.
 */
export async function translateArticle(
  article: Article,
  sourceLang: 'de' | 'en' | 'other'
): Promise<Pick<Article, 'translatedTitle' | 'translatedSummary'>> {
  const [translatedTitle, translatedSummary] = await Promise.all([
    translateText(article.originalTitle, sourceLang, 'de'),
    translateText(article.originalSummary, sourceLang, 'de'),
  ]);

  return { translatedTitle, translatedSummary };
}

// -------------------------- NEW AI UTILS BELOW --------------------------

/**
 * Very lightweight mock to assign a "seriousness" score (1-10).
 * In a real setup this would call an AI provider defined via IAiProvider.
 */
export async function evaluateSeriousness(article: Article): Promise<number> {
  // Combine title & summary for evaluation
  const text = `${article.originalTitle} ${article.originalSummary}`.toLowerCase();

  // Base score
  let score = 5;

  // 1) Length heuristic (word count)
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 800) score += 3;
  else if (wordCount > 500) score += 2;
  else if (wordCount > 250) score += 1;

  // 2) Presence of reputable source names bumps score
  const reputableSources = ['reuters', 'associated press', 'ap ', 'dpa', 'bbc', 'new york times', 'nyt'];
  if (reputableSources.some((s) => text.includes(s))) score += 1;

  // 3) Click-bait patterns reduce score
  const clickbaitPatterns = [/schock/, /unglaublich/, /krass/, /wow/, /\bshock\b/, /you won\'t believe/, /sensations?/, /click here/];
  if (clickbaitPatterns.some((p) => p.test(text))) score -= 2;

  // 4) Excessive exclamation marks reduce score
  const exclamations = (article.originalTitle.match(/!/g) || []).length;
  if (exclamations >= 2) score -= 1;

  // 5) If summary missing or very short, treat with caution
  if (wordCount < 40) score -= 1;

  // Clamp to 1-10 range
  score = Math.max(1, Math.min(10, score));

  // Simulate async to keep API shape in case of later AI integration
  return Promise.resolve(score);
}

/**
 * Generate a representative image URL for an article when none is provided.
 * Uses the free Unsplash Source endpoint so no API-key is required.
 */
export function generateImageUrl(article: Article): { url: string; generated: boolean } {
  if (article.imageUrl) {
    // Keep existing image
    return { url: article.imageUrl, generated: false };
  }
  // Try to pick the first topic as search query, else fallback to title keywords.
  const querySource = article.topics?.[0] || article.originalTitle || 'news';
  const query = encodeURIComponent(querySource.split(' ').slice(0, 3).join(','));
  // 800×450 covers 16:9 preview nicely, but Unsplash ignores dimensions when omitted.
  const url = `https://source.unsplash.com/featured/800x450?${query}`;
  return { url, generated: true };
}