import { describe, expect, it } from 'vitest'
import { deduplicateArticles } from './articles'

interface A { id: string; title: string; summary: string }

describe('deduplicate across feeds', () => {
  it('keeps unique articles even from different feeds', () => {
    const a: A = { id: 'a', title: 'Hello', summary: 'World' }
    const b: A = { id: 'b', title: 'Hello!', summary: 'World' } // near duplicate
    const c: A = { id: 'c', title: 'Different', summary: 'Article' }
    const out = deduplicateArticles([a, b, c])
    expect(out.map((o) => o.id)).toEqual(['a', 'c'])
  })
})