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