import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from './App'
import type { Article } from './api/fetchFeed'

const dummyArticles: Article[] = [
  {
    id: '1',
    feedId: 'f1',
    feedName: 'Feed1',
    link: '#',
    title: 'Test',
    summary: 'Lorem',
    publicationDate: new Date().toISOString(),
  },
]

vi.mock('./api/fetchFeed', async () => {
  const actual = await vi.importActual<typeof import('./api/fetchFeed')>('./api/fetchFeed')
  return {
    ...actual,
    fetchFeedArticles: vi.fn(() => Promise.resolve(dummyArticles)),
  }
})

describe('Feed removal persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('removes feed from UI and localStorage', async () => {
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('Feed URL'), {
      target: { value: 'https://example.com/rss' },
    })
    fireEvent.click(screen.getAllByText('Add')[0])

    await waitFor(() => screen.getByText('Test'))

    // remove feed
    fireEvent.click(screen.getByText('remove'))

    // feed list should be empty in UI
    expect(screen.queryByText('https://example.com/rss')).toBeNull()

    // localStorage should be empty
    expect(JSON.parse(window.localStorage.getItem('feeds') || '[]')).toHaveLength(0)
  })
})