import { describe, expect, it } from 'vitest'
import { deduplicateArticles, matchesTopics } from './articles'
import type { Topic } from './articles'

describe('matchesTopics', () => {
  const article = { title: 'AI breakthrough in medicine', summary: 'New AI tool' }
  const topics: Topic[] = [
    { id: '1', name: 'AI', keywords: ['ai', 'machine learning'] },
    { id: '2', name: 'Sports', keywords: ['football'] },
  ]

  it('returns true when article matches topic keywords', () => {
    expect(matchesTopics(article, topics)).toBe(true)
  })

  it('returns false when article does not match keywords', () => {
    expect(matchesTopics({ title: 'Economy update', summary: 'markets' }, topics)).toBe(false)
  })
})

describe('deduplicateArticles', () => {
  it('removes near-duplicates', () => {
    const a1 = { id: '1', title: 'Hello World', summary: 'foo' }
    const a2 = { id: '2', title: 'Hello World!', summary: 'foo' }
    const a3 = { id: '3', title: 'Different', summary: 'bar' }
    const deduped = deduplicateArticles([a1, a2, a3])
    expect(deduped).toHaveLength(2)
    expect(deduped.some((a) => a.id === '3')).toBe(true)
  })
})