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
  // Simple heuristic: longer, keyword-rich articles are deemed more serious.
  const text = `${article.originalTitle} ${article.originalSummary}`;
  const length = text.length;

  // Naïve length-based scoring.
  if (length > 1000) return 9;
  if (length > 600) return 8;
  if (length > 400) return 7;
  if (length > 200) return 6;
  return 5;
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