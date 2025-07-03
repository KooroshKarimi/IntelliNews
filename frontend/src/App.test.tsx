import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import App from './App'
import type { Article } from './api/fetchFeed'

// Mock the fetchFeedArticles API
let mockArticles: Article[] = []
vi.mock('./api/fetchFeed', async () => {
  const actual = await vi.importActual<typeof import('./api/fetchFeed')>(
    './api/fetchFeed',
  )
  return {
    ...actual,
    fetchFeedArticles: vi.fn(() => Promise.resolve(mockArticles)),
  }
})

describe('App component integration', () => {
  beforeEach(() => {
    // Clean up localStorage before each test
    window.localStorage.clear()
    mockArticles = [
      {
        id: 'a1',
        feedId: 'f1',
        feedName: 'Test Feed',
        link: '#',
        title: 'Hello World',
        summary: 'AI breakthrough',
        publicationDate: new Date().toISOString(),
      },
      // duplicate article (to test deduplication)
      {
        id: 'a2',
        feedId: 'f1',
        feedName: 'Test Feed',
        link: '#',
        title: 'Hello World!',
        summary: 'AI breakthrough',
        publicationDate: new Date().toISOString(),
      },
    ]
  })

  it('allows adding a feed and displays deduplicated articles', async () => {
    render(<App />)

    // fill feed URL and click add
    fireEvent.change(screen.getByPlaceholderText('Feed URL'), {
      target: { value: 'https://example.com/rss' },
    })
    fireEvent.click(screen.getAllByText('Add')[0])

    // wait for article to appear (deduplicated -> only one)
    await waitFor(() => {
      expect(screen.getByText('Hello World')).toBeTruthy()
    })
    // ensure only one article card rendered
    expect(screen.getAllByRole('link', { name: /hello world/i })).toHaveLength(1)
  })

  it('applies keyword filtering', async () => {
    render(<App />)

    // add feed
    fireEvent.change(screen.getByPlaceholderText('Feed URL'), {
      target: { value: 'https://example.com/rss' },
    })
    fireEvent.click(screen.getAllByText('Add')[0])

    await waitFor(() => screen.getByText('Hello World'))

    // add topic that excludes the article
    fireEvent.change(screen.getByPlaceholderText('Topic name'), {
      target: { value: 'Sports' },
    })
    fireEvent.change(screen.getByPlaceholderText('Keywords (comma separated)'), {
      target: { value: 'world' },
    })
    fireEvent.change(screen.getByPlaceholderText('Exclude keywords (optional)'), {
      target: { value: 'hello' },
    })
    fireEvent.click(screen.getAllByText('Add')[1])

    // article should disappear because exclude keyword matched
    await waitFor(() => {
      expect(screen.queryByText('Hello World')).toBeNull()
    })
  })
})