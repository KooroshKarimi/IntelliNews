import { describe, expect, it } from 'vitest'
import { jaccardIndex } from './jaccard'

describe('jaccardIndex', () => {
  it('returns 1 for identical strings', () => {
    expect(jaccardIndex('hello world', 'hello world')).toBe(1)
  })

  it('returns high similarity for similar strings', () => {
    expect(jaccardIndex('intelligent news reader', 'news reader intelligent')).toBeGreaterThan(0.9)
  })

  it('returns low similarity for different strings', () => {
    expect(jaccardIndex('cat', 'dog')).toBeLessThan(0.2)
  })
})