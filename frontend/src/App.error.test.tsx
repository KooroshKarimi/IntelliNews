import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect, it } from 'vitest'
import App from './App'

vi.mock('./api/fetchFeed', async () => {
  const actual = await vi.importActual<typeof import('./api/fetchFeed')>('./api/fetchFeed')
  return {
    ...actual,
    fetchFeedArticles: vi.fn(() => Promise.reject(new Error('network'))),
  }
})

it('shows error banner when feed fetch fails', async () => {
  render(<App />)
  fireEvent.change(screen.getByPlaceholderText('Feed URL'), {
    target: { value: 'https://example.com/rss' },
  })
  fireEvent.click(screen.getAllByText('Add')[0])

  await waitFor(() => {
    expect(screen.getByText(/failed to load feed/i)).toBeTruthy()
  })

  // close banner
  fireEvent.click(screen.getByText('✕'))
  expect(screen.queryByText(/failed to load feed/i)).toBeNull()
})