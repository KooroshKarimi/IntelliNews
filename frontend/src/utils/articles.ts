import { jaccardIndex } from './jaccard'

export interface Topic {
  id: string
  name: string
  keywords: string[]
  excludeKeywords?: string[]
}

export interface ArticleLike {
  title: string
  summary: string
}

/**
 * Returns true if the article text matches at least one topic include keyword and none of its exclude keywords.
 */
export function matchesTopics(article: ArticleLike, topics: Topic[]): boolean {
  if (topics.length === 0) return true
  const text = `${article.title} ${article.summary}`.toLowerCase()
  return topics.some((topic) => {
    const includeMatch = topic.keywords.some((kw) =>
      text.includes(kw.toLowerCase()),
    )
    const excludeMatch = (topic.excludeKeywords || []).some((kw) =>
      text.includes(kw.toLowerCase()),
    )
    return includeMatch && !excludeMatch
  })
}

/**
 * Remove near-duplicate articles based on Jaccard similarity of title+summary.
 */
export function deduplicateArticles<T extends ArticleLike & { id: string }>(
  articles: T[],
  threshold = 0.9,
): T[] {
  const unique: T[] = []
  for (const article of articles) {
    const isDuplicate = unique.some(
      (a) =>
        jaccardIndex(
          `${a.title} ${a.summary}`,
          `${article.title} ${article.summary}`,
        ) > threshold,
    )
    if (!isDuplicate) unique.push(article)
  }
  return unique
}