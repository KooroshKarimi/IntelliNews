import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from './App'
import type { Article } from './api/fetchFeed'

const buildArticles = (): Article[] => [
  {
    id: '1',
    feedId: 'feed1',
    feedName: 'Feed 1',
    link: '#1',
    title: 'Same Title',
    summary: 'Lorem ipsum',
    publicationDate: new Date().toISOString(),
  },
  {
    id: '2',
    feedId: 'feed1',
    feedName: 'Feed 1',
    link: '#2',
    title: 'Same Title!',
    summary: 'Lorem ipsum',
    publicationDate: new Date().toISOString(),
  },
]

vi.mock('./api/fetchFeed', async () => {
  const actual = await vi.importActual<typeof import('./api/fetchFeed')>(
    './api/fetchFeed',
  )
  return {
    ...actual,
    fetchFeedArticles: vi.fn(() => Promise.resolve(buildArticles())),
  }
})

describe('Feed management persistence & duplicate handling', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    cleanup()
  })

  it('persists feeds to localStorage and reloads them', async () => {
    const { unmount } = render(<App />)
    const urlInput = screen.getByPlaceholderText('Feed URL')
    fireEvent.change(urlInput, { target: { value: 'https://example.com/rss' } })
    fireEvent.click(screen.getAllByText('Add')[0])

    // wait for article load
    await waitFor(() => expect(screen.getByRole('link', { name: /same title/i })).toBeTruthy())

    // Feed list should contain one item
    expect(JSON.parse(window.localStorage.getItem('feeds') || '[]')).toHaveLength(1)

    // Unmount & remount to simulate reload
    unmount()
    render(<App />)

    // Feed should still be present, article should render after auto-fetch
    await waitFor(() => expect(screen.getByRole('link', { name: /same title/i })).toBeTruthy())
  })

  it('shows only one article when duplicates are fetched', async () => {
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('Feed URL'), {
      target: { value: 'https://example.com/rss' },
    })
    fireEvent.click(screen.getAllByText('Add')[0])

    await waitFor(() => screen.getByRole('link', { name: /same title/i }))
    const articles = screen.getAllByRole('link', { name: /same title/i })
    expect(articles).toHaveLength(1)
  })
})