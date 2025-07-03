import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect, it } from 'vitest'
import App from './App'
import type { Article } from './api/fetchFeed'

const sampleArticles: Article[] = [
  {
    id: '1',
    feedId: 'f1',
    feedName: 'Feed1',
    link: '#',
    title: 'Test',
    summary: 'Content',
    publicationDate: new Date().toISOString(),
  },
]

// helper to create deferred promise
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const d = deferred<Article[]>()

vi.mock('./api/fetchFeed', async () => {
  const actual = await vi.importActual<typeof import('./api/fetchFeed')>('./api/fetchFeed')
  return {
    ...actual,
    fetchFeedArticles: vi.fn(() => d.promise),
  }
})

it('shows and hides loading indicator', async () => {
  render(<App />)
  fireEvent.change(screen.getByPlaceholderText('Feed URL'), {
    target: { value: 'https://example.com/rss' },
  })
  fireEvent.click(screen.getAllByText('Add')[0])

  // loading spinner visible while promise pending
  expect(screen.getByTestId('loading')).toBeTruthy()

  // resolve fetch
  d.resolve(sampleArticles)

  await waitFor(() => {
    expect(screen.queryByTestId('loading')).toBeNull()
  })
})