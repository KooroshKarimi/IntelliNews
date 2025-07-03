import { expect, it, vi } from 'vitest'
import { fetchFeedArticles } from './fetchFeed'

it('returns empty array on network error', async () => {
  const feed = { id: '1', name: 'Err', url: 'https://example.com/rss' }
  // mock global fetch to throw
  vi.stubGlobal('fetch', (() => Promise.reject(new Error('network'))) as unknown as typeof fetch)
  const res = await fetchFeedArticles(feed)
  expect(res).toEqual([])
})